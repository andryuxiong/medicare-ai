package ai.andrew.medicare_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/**
 * This service provides methods to interact with the OpenAI GPT-3.5 Turbo API for chat completions.
 * I use this service to send user messages to the OpenAI API and return the AI's response.
 *
 * The system prompt is designed to:
 * - Focus on healthcare, medications, and symptom guidance.
 * - Never diagnose or prescribe, but explain symptoms and medications.
 * - Always ask for more details if the user's symptoms are unclear or vague.
 * - Remind users that this is not a substitute for professional medical advice.
 *
 * Usage:
 * - Inject this service into a controller.
 * - Call getChatResponse(userMessage) to get a chat reply from GPT-3.5 Turbo.
 * - Supports OpenAI function calling for symptom checking.
 */
@Service
public class OpenAIService {
    /**
     * The OpenAI API key, injected from application.properties or environment variable.
     */
    @Value("${openai.api.key}")
    private String openaiApiKey;

    /**
     * The OpenAI Chat Completions endpoint for GPT-3.5 Turbo.
     */
    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

    // Inject the ConditionService for symptom checking
    private final ConditionService conditionService;
    public OpenAIService(ConditionService conditionService) {
        this.conditionService = conditionService;
    }

    /**
     * Sends a user message to the OpenAI GPT-3.5 Turbo API and returns the AI's response.
     * Supports function calling for symptom checking.
     *
     * @param userMessage The user's message to send to the model.
     * @return The AI's response as a string.
     */
    public String getChatResponse(String userMessage) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + openaiApiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> systemMessage = Map.of(
            "role", "system",
            "content", "You are \"Medicare AI\", a virtual healthcare assistant designed to help users understand their symptoms, medications, and general health questions. Your primary goal is to provide clear, accurate, and friendly information about health, wellness, and medications, especially as they relate to Medicare and older adults in the United States.\n\n" +
            "Your core responsibilities:\n" +
            "- Explain what common symptoms might mean, and when they may require urgent attention.\n" +
            "- Provide general information about medications, including their uses, common side effects, and interactions.\n" +
            "- Help users understand how Medicare works, what it covers, and how to navigate the healthcare system.\n" +
            "- Always cite or reference trusted health resources (such as Mayo Clinic, MedlinePlus, FDA, CDC, or official Medicare.gov information) when providing factual information.\n" +
            "- If a user asks about a specific medication, condition, or symptom, provide a concise summary and, if possible, a link to a trusted resource.\n\n" +
            "Boundaries and safety:\n" +
            "- Never provide a medical diagnosis or prescribe medication.\n" +
            "- Never make decisions for the user; always encourage them to consult a licensed healthcare provider for diagnosis, treatment, or urgent concerns.\n" +
            "- If a user's question is unclear, vague, or could be interpreted in multiple ways, always ask for more details or clarification before attempting to help.\n" +
            "- If a user describes symptoms that could be serious (e.g., chest pain, difficulty breathing, sudden weakness, confusion), advise them to seek immediate medical attention or call emergency services.\n" +
            "- Remind users that your advice does not replace a doctor or professional medical advice.\n\n" +
            "Conversational guidance:\n" +
            "- Always reply in a warm, conversational, and natural tone, as if you are talking to a friend.\n" +
            "- Avoid lists, bullet points, or overly formal language. Do not use numbered or bulleted lists.\n" +
            "- Weave advice and information into complete sentences and natural conversation.\n" +
            "- Ask follow-up questions and keep the conversation flowing.\n" +
            "- Be empathetic, supportive, and non-judgmental in all responses.\n" +
            "- Use plain language and avoid medical jargon unless specifically requested.\n" +
            "- If you are unsure or the information is outside your training, say so and suggest the user consult a healthcare professional.\n\n" +
            "Function calling (if available):\n" +
            "- If you have access to function calling, use it to look up medications, check symptoms, or retrieve information from trusted health databases when appropriate.\n\n" +
            "Example trusted resources to reference:\n" +
            "- Mayo Clinic: https://www.mayoclinic.org\n" +
            "- MedlinePlus: https://medlineplus.gov\n" +
            "- FDA: https://www.fda.gov\n" +
            "- CDC: https://www.cdc.gov\n" +
            "- Medicare: https://www.medicare.gov\n\n" +
            "Example conversational response:\n" +
            "User: What should I do if I have a fever?\n" +
            "Assistant: Oh no, having a fever can really make you feel lousy! The most important thing is to rest and drink plenty of fluids. If you start to feel worse or your fever sticks around for more than a couple of days, it's a good idea to check in with your doctor. How high has your temperature been?\n\n" +
            "Always strive to be as helpful as possible within these guidelines, and prioritize user safety and information accuracy above all else.\n" +
            "NO lists, answer like a friend."
        );

        // 1. Try to match userMessage to your JSON data (e.g., medication or condition)
        String context = conditionService.getContextForUserMessage(userMessage); // You write this method

        // 2. Build the system and context messages
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(systemMessage);
        if (context != null && !context.isEmpty()) {
            messages.add(Map.of("role", "assistant", "content", context));
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        // 3. Define the function schema for symptom checking
        Map<String, Object> symptomCheckerFunction = Map.of(
            "name", "symptom_checker",
            "description", "Checks symptoms and returns possible conditions, medications, and advice.",
            "parameters", Map.of(
                "type", "object",
                "properties", Map.of(
                    "symptoms", Map.of(
                        "type", "string",
                        "description", "A description of the user's symptoms."
                    )
                ),
                "required", List.of("symptoms")
            )
        );

        Map<String, Object> payload = new HashMap<>();
        payload.put("model", "gpt-3.5-turbo"); // function calling supported
        payload.put("messages", messages);
        payload.put("functions", List.of(symptomCheckerFunction));
        payload.put("function_call", "auto");

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        ObjectMapper mapper = new ObjectMapper();

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(OPENAI_API_URL, request, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Object choicesObj = response.getBody().get("choices");
                if (choicesObj instanceof List<?> choices && !choices.isEmpty()) {
                    Object firstChoice = choices.get(0);
                    if (firstChoice instanceof Map<?,?> choiceMap) {
                        // Check if the model wants to call a function
                        Object functionCallObj = choiceMap.get("function_call");
                        if (functionCallObj instanceof Map<?,?> functionCall) {
                            String functionName = (String) functionCall.get("name");
                            if ("symptom_checker".equals(functionName)) {
                                // Parse arguments and call the local symptom checker
                                String argsJson = (String) functionCall.get("arguments");
                                Map<String, Object> args = mapper.readValue(argsJson, Map.class);
                                String symptoms = (String) args.get("symptoms");
                                Map<String, Object> result = conditionService.keywordMatch(symptoms);
                                if (result != null) {
                                    return "Symptom Checker Result:\n" +
                                        "Condition: " + result.getOrDefault("condition", "Unknown") + "\n" +
                                        "Medication: " + result.getOrDefault("medication", "None recommended") + "\n" +
                                        "Advice: " + result.getOrDefault("advice", "Please consult a healthcare provider.");
                                } else {
                                    return "No specific condition identified. Please provide more details about your symptoms.";
                                }
                            }
                        }
                        // Otherwise, return the normal AI message
                        Object messageObj = choiceMap.get("message");
                        if (messageObj instanceof Map<?,?> messageMap) {
                            Object content = messageMap.get("content");
                            if (content != null) {
                                String aiReply = content.toString();
                                // If the AI reply is too vague, add a follow-up prompt
                                if (aiReply.trim().length() < 30 || aiReply.toLowerCase().contains("i'm not sure") || aiReply.toLowerCase().contains("i don't know")) {
                                    return aiReply + "\n\nCould you please describe your symptoms or question in more detail so I can assist you better?";
                                }
                                return aiReply;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "Sorry, there was an error contacting the OpenAI service: " + e.getMessage();
        }
        return "Sorry, I'm not working right now. 😔";
    }
} 