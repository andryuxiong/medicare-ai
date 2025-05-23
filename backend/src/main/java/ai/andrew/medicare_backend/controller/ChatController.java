package ai.andrew.medicare_backend.controller;

import ai.andrew.medicare_backend.dto.ChatRequest;
import ai.andrew.medicare_backend.service.OpenAIService;
import ai.andrew.medicare_backend.service.ConditionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.databind.ObjectMapper;

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
     * Accepts a validated chat request and returns the AI's response.
     */
    @PostMapping("/chat-hf")
    public ResponseEntity<Map<String, String>> chatWithOpenAI(@Valid @RequestBody ChatRequest request) {
        try {
            String response = openaiService.getChatResponse(request.getMessage());
            return ResponseEntity.ok(Map.of("response", response));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to process request: " + e.getMessage()));
        }
    }

    /**
     * POST /api/chat-combined
     * Returns both the conversational AI response and the symptom checker result.
     */
    @PostMapping("/chat-combined")
    public ResponseEntity<Map<String, Object>> chatCombined(@Valid @RequestBody ChatRequest request) {
        try {
            String aiResponse = openaiService.getChatResponse(request.getMessage());
            Map<String, Object> symptomResult = conditionService.keywordMatch(request.getMessage());
            
            // Only include symptom result if we have meaningful data
            if (symptomResult == null || 
                (symptomResult.get("condition") == null && 
                 symptomResult.get("medication") == null && 
                 symptomResult.get("advice") == null)) {
                symptomResult = null;
            }

            // Create response with AI response and symptom result (if any)
            Map<String, Object> response = new HashMap<>();
            response.put("aiResponse", aiResponse != null ? aiResponse : "");
            if (symptomResult != null) {
                response.put("symptomResult", symptomResult);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to process request: " + e.getMessage()));
        }
    }
} 