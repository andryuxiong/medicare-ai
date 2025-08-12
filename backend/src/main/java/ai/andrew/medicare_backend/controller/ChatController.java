package ai.andrew.medicare_backend.controller;

import ai.andrew.medicare_backend.dto.ChatRequest;
import ai.andrew.medicare_backend.service.OpenAIService;
import ai.andrew.medicare_backend.service.ConditionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * ChatController handles chat endpoints for the Medicare AI chatbot.
 * It uses OpenAIService to get AI responses from OpenAI GPT-3.5 Turbo.
 */
@RestController
@RequestMapping("/api")
public class ChatController {
    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);
    
    private final OpenAIService openaiService;
    private final ConditionService conditionService;
    
    private static final String MEDICAL_DISCLAIMER = 
        "IMPORTANT MEDICAL DISCLAIMER: This information is for educational purposes only and " +
        "does not constitute medical advice. Always consult with a qualified healthcare " +
        "professional before making any medical decisions. In case of emergency, call 911 immediately.";

    // Inject the OpenAIService and ConditionService
    public ChatController(OpenAIService openaiService, ConditionService conditionService) {
        this.openaiService = openaiService;
        this.conditionService = conditionService;
    }
    
    /**
     * Input sanitization helper method
     */
    private String sanitizeInput(String input) {
        if (input == null) return "";
        
        return input.trim()
                   .replaceAll("<script.*?>.*?</script>", "")
                   .replaceAll("<.*?>", "")
                   .substring(0, Math.min(input.length(), 1000)); // Limit to 1000 chars
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
        String sessionId = UUID.randomUUID().toString();
        
        try {
            // Input validation and sanitization
            if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
                logger.warn("Empty message received - SessionId: {}", sessionId);
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Message cannot be empty"));
            }
            
            String sanitizedMessage = sanitizeInput(request.getMessage());
            logger.info("Chat request received - SessionId: {}, MessageLength: {}", 
                       sessionId, sanitizedMessage.length());
            
            // Get AI response with timeout handling
            String aiResponse;
            try {
                aiResponse = openaiService.getChatResponse(sanitizedMessage);
            } catch (Exception aiException) {
                logger.error("OpenAI service error - SessionId: {}, Error: {}", 
                           sessionId, aiException.getMessage());
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "AI service temporarily unavailable. Please try again in a moment."));
            }
            
            // Get symptom analysis
            Map<String, Object> symptomResult = conditionService.keywordMatch(sanitizedMessage);
            
            // Only include symptom result if we have meaningful data
            if (symptomResult == null || 
                (symptomResult.get("condition") == null && 
                 symptomResult.get("medication") == null && 
                 symptomResult.get("advice") == null)) {
                symptomResult = null;
            }

            // Create response with AI response, symptom result, and disclaimer
            Map<String, Object> response = new HashMap<>();
            response.put("aiResponse", aiResponse != null ? aiResponse : "I'm sorry, I couldn't generate a response at this time.");
            response.put("disclaimer", MEDICAL_DISCLAIMER);
            response.put("sessionId", sessionId);
            
            if (symptomResult != null) {
                response.put("symptomResult", symptomResult);
            }
            
            logger.info("Chat response sent - SessionId: {}, Success: true", sessionId);
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid input - SessionId: {}, Error: {}", sessionId, e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid input: " + e.getMessage()));
                
        } catch (Exception e) {
            logger.error("Unexpected error - SessionId: {}, Error: {}", sessionId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "An unexpected error occurred. Please try again later."));
        }
    }
} 