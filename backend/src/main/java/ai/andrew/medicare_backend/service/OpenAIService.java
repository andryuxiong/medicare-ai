package ai.andrew.medicare_backend.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Service responsible for orchestrating OpenAI chat completions for the Medicare assistant.
 */
@Service
public class OpenAIService {

    private static final Logger log = LoggerFactory.getLogger(OpenAIService.class);
    private static final String SYSTEM_PROMPT = """
            You are \"Medicare AI\", a healthcare companion that keeps users grounded in safe, factual
            information about symptoms, medications, Medicare coverage and next steps. Offer empathy,
            cite trusted US healthcare sources (Medicare.gov, CDC, Mayo Clinic, FDA) and remind users
            that you do not diagnose or prescribe. Encourage urgent care/911 when red-flag symptoms
            show up and keep responses conversational—no bullet lists by default.
            """;
    private static final String FALLBACK_MESSAGE = "I'm having trouble reaching my medical references. Could you try again in a moment?";

    private final ConditionService conditionService;
    private final WebClient openAiClient;
    private final ObjectMapper objectMapper;
    private final String openAiApiKey;
    private final String model;
    private final double temperature;
    private final int maxTokens;
    private final Duration requestTimeout;
    private final List<Map<String, Object>> toolDefinitions;

    public OpenAIService(
            ConditionService conditionService,
            WebClient openAiWebClient,
            ObjectMapper objectMapper,
            @Value("${openai.api.key}") String openAiApiKey,
            @Value("${openai.api.model:gpt-3.5-turbo}") String model,
            @Value("${openai.api.temperature:0.35}") double temperature,
            @Value("${openai.api.max-tokens:700}") int maxTokens,
            @Value("${openai.api.timeout:20s}") Duration requestTimeout) {
        this.conditionService = conditionService;
        this.openAiClient = openAiWebClient;
        this.objectMapper = objectMapper;
        this.openAiApiKey = openAiApiKey;
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
        this.requestTimeout = requestTimeout;
        this.toolDefinitions = buildToolDefinitions();
    }

    public String getChatResponse(String userMessage) {
        if (openAiApiKey == null || openAiApiKey.isBlank()) {
            log.warn("OpenAI API key is not configured");
            return FALLBACK_MESSAGE;
        }

        List<ChatMessage> messages = new ArrayList<>();
        messages.add(new ChatMessage("system", SYSTEM_PROMPT));

        String context = Optional.ofNullable(conditionService.getContextForUserMessage(userMessage))
                .map(String::trim)
                .orElse("");
        if (!context.isBlank()) {
            messages.add(new ChatMessage("system", "Symptom insight: " + context));
        }

        messages.add(new ChatMessage("user", userMessage));

        ChatCompletionRequest payload = new ChatCompletionRequest(
                model,
                temperature,
                maxTokens,
                messages,
                toolDefinitions
        );

        try {
            ChatCompletionResponse completion = openAiClient.post()
                    .uri("/v1/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, clientResponse -> clientResponse
                            .bodyToMono(String.class)
                            .defaultIfEmpty("<empty body>")
                            .map(body -> new OpenAIClientException(
                                    "OpenAI error %s: %s".formatted(clientResponse.statusCode(), body))))
                    .bodyToMono(ChatCompletionResponse.class)
                    .timeout(requestTimeout)
                    .block();

            if (completion == null || completion.choices() == null || completion.choices().isEmpty()) {
                return FALLBACK_MESSAGE;
            }

            Choice topChoice = completion.choices().get(0);
            if (topChoice.functionCall() != null) {
                return handleFunctionCall(topChoice.functionCall());
            }

            ChatMessage aiMessage = topChoice.message();
            if (aiMessage == null || aiMessage.content() == null) {
                return FALLBACK_MESSAGE;
            }

            String reply = aiMessage.content().trim();
            if (reply.length() < 30) {
                return reply + "\n\nCould you describe your question in a bit more detail so I can help?";
            }
            return reply;
        } catch (OpenAIClientException | WebClientResponseException ex) {
            log.error("OpenAI completion failed: {}", ex.getMessage());
            return FALLBACK_MESSAGE;
        } catch (Exception ex) {
            log.error("Unexpected error when talking to OpenAI", ex);
            return FALLBACK_MESSAGE;
        }
    }

    private String handleFunctionCall(FunctionCall functionCall) throws Exception {
        if (!"symptom_checker".equals(functionCall.name()) || functionCall.arguments() == null) {
            return FALLBACK_MESSAGE;
        }

        Map<String, Object> args = objectMapper.readValue(functionCall.arguments(), new TypeReference<>() {});
        String symptoms = Optional.ofNullable(args.get("symptoms"))
                .map(Object::toString)
                .orElse("");

        Map<String, Object> match = conditionService.keywordMatch(symptoms);
        if (match == null) {
            return "I'm not seeing a clear pattern yet. Could you share a few more specifics?";
        }

        return """
                Symptom checker result\n
                Condition: %s\n
                Medication: %s\n
                Advice: %s
                """.formatted(
                match.getOrDefault("condition", "Unknown"),
                match.getOrDefault("medication", "None recommended"),
                match.getOrDefault("advice", "Please consult with your care team."));
    }

    private List<Map<String, Object>> buildToolDefinitions() {
        return List.of(
                Map.of(
                        "type", "function",
                        "function", Map.of(
                                "name", "symptom_checker",
                                "description", "Match user-described symptoms to known Medicare-specific conditions and advice.",
                                "parameters", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "symptoms", Map.of(
                                                        "type", "string",
                                                        "description", "Verbatim description of what the user is feeling"
                                                )
                                        ),
                                        "required", List.of("symptoms")
                                )
                        )
                )
        );
    }

    private record ChatCompletionRequest(
            String model,
            double temperature,
            int max_tokens,
            List<ChatMessage> messages,
            List<Map<String, Object>> tools
    ) {}

    private record ChatMessage(String role, String content) {}

    private record ChatCompletionResponse(List<Choice> choices) {}

    private record Choice(ChatMessage message, FunctionCall functionCall) {}

    private record FunctionCall(String name, String arguments) {}

    private static class OpenAIClientException extends RuntimeException {
        private OpenAIClientException(String message) {
            super(message);
        }
    }
}
