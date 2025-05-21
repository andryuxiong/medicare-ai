package ai.andrew.medicare_backend.controller;   // AnalyzeController

import ai.andrew.medicare_backend.dto.SymptomRequest;
import ai.andrew.medicare_backend.service.ConditionService;
import ai.andrew.medicare_backend.service.TranslationService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "https://medicare-ai-three.vercel.app")


public class AnalyzeController {

    private final ConditionService diagnosis;
    private final TranslationService translator;


public AnalyzeController(ConditionService diagnosis,
                         TranslationService translator) {
    this.diagnosis  = diagnosis;
    this.translator = translator;
    }

    /* ---------- existing /api/analyze (English only) stays here ---------- */

    // ---------------------------------------------------------------------
    //  NEW multilingual endpoint (LibreTranslate + keywordMatch)
    //  URL example:  POST /api/analyze-ml?lang=es
    // ---------------------------------------------------------------------
    @PostMapping("/analyze-ml")
    public ResponseEntity<?> analyzeMultilingual(
            @RequestBody SymptomRequest req,
            @RequestParam(defaultValue = "en") String lang) {

        // 1) Translate incoming text ➜ English
        String english = lang.equals("en")
                ? req.text()
                : translator.toEnglish(req.text());

        // 2) Keyword diagnosis
        Map<String,Object> hit = diagnosis.keywordMatch(english);

        if (hit == null) {
            String askEn = "I'm not sure yet—could you describe your symptoms in more detail?";
            String ask   = lang.equals("en") ? askEn
                          : translator.fromEnglish(askEn, lang);
            return ResponseEntity.ok(Map.of("followup", ask));
        }

        // Build English answer first
        String answerEn = """
                Condition: %s
                Medication: %s
                Advice: %s
                """.formatted(
                hit.get("condition"),
                hit.get("medication"),
                hit.get("advice"));

        // 3) Translate back if user language ≠ English
        String answer = lang.equals("en") ? answerEn
                        : translator.fromEnglish(answerEn, lang);

        return ResponseEntity.ok(Map.of("answer", answer));
    }
}