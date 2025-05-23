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
    public ResponseEntity<Map<String, Object>> chatCombined(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        Map<String, Object> response = new HashMap<>();
        
        // Get AI response
        String aiResponse = openaiService.getChatResponse(message);
        response.put("aiResponse", aiResponse);
        
        // Only get symptom checker result if the message contains potential symptoms
        if (message.toLowerCase().contains("symptom") || 
            message.toLowerCase().contains("feel") || 
            message.toLowerCase().contains("hurts") || 
            message.toLowerCase().contains("pain")) {
            
            Map<String, String> symptomResult = conditionService.keywordMatch(message);
            
            // Only include symptom result if we have meaningful data
            if (symptomResult != null && 
                (symptomResult.get("condition") != null || 
                 symptomResult.get("medication") != null || 
                 symptomResult.get("advice") != null)) {
                
                response.put("symptomResult", symptomResult);
            }
        }
        
        return ResponseEntity.ok(response);
    }
} 