package ai.andrew.medicare_backend.controller;   // AnalyzeController

import ai.andrew.medicare_backend.dto.SymptomRequest;
import ai.andrew.medicare_backend.service.ConditionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class AnalyzeController {

    private final ConditionService service;

    public AnalyzeController(ConditionService service) {
        this.service = service;
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody SymptomRequest req) {
        Map<String,Object> hit = service.findMatch(req.text());

        if (hit == null) {
            return ResponseEntity.ok(
                Map.of("followup",
                       "I’m not sure yet—could you describe your symptoms in more detail?")
            );
        }

        return ResponseEntity.ok(
            Map.of("condition",  hit.get("condition"),
                   "medication", hit.get("medication"),
                   "advice",     hit.get("advice"))
        );
    }
}