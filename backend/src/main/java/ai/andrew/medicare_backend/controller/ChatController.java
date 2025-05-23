package ai.andrew.medicare_backend.controller;

import ai.andrew.medicare_backend.service.OpenAIService;
import ai.andrew.medicare_backend.service.ConditionService;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * ChatController handles chat endpoints for the Medicare AI chatbot.
 * It uses OpenAIService to get AI responses from OpenAI GPT-3.5 Turbo.
 */
@RestController
@RequestMapping("/api")
public class ChatController {
    private final OpenAIService openaiService;
    private final ConditionService conditionService;

    // Inject the OpenAIService and ConditionService
    public ChatController(OpenAIService openaiService, ConditionService conditionService) {
        this.openaiService = openaiService;
        this.conditionService = conditionService;
    }

    /**
     * POST /api/chat-hf (legacy endpoint, now uses OpenAI)
     * Accepts a JSON body with a "message" field and returns the AI's response.
     */
    @PostMapping("/chat-hf")
    public Map<String, String> chatWithOpenAI(@RequestBody Map<String, String> body) {
        String userMessage = body.getOrDefault("message", "");
        String response = openaiService.getChatResponse(userMessage);
        return Map.of("response", response);
    }

    /**
     * POST /api/chat-combined
     * Returns both the conversational AI response and the symptom checker result.
     */
    @PostMapping("/chat-combined")
    public Map<String, Object> chatCombined(@RequestBody Map<String, String> body) {
        String userMessage = body.getOrDefault("message", "");
        String aiResponse = openaiService.getChatResponse(userMessage);
        Map<String, Object> symptomResult = conditionService.keywordMatch(userMessage);

        // Map.of() does not allow null values, so ensure neither value is null
        if (aiResponse == null) aiResponse = "";
        if (symptomResult == null) symptomResult = Map.of();

        return Map.of(
            "aiResponse", aiResponse,
            "symptomResult", symptomResult
        );
    }
} 