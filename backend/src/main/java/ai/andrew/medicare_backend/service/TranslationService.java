package ai.andrew.medicare_backend.service;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * TranslationService
 * ------------------
 * Wraps a running LibreTranslate instance exposed on host port 5001
 * (internal container port 5000).  Two helper methods:
 *
 *   toEnglish(text)          : any language → English
 *   fromEnglish(text, lang)  : English → target ISO 639-1 language code
 *
 * WebClient is Spring’s non-blocking HTTP client.  For simplicity we call
 * .block() here so the method returns a plain String synchronously.
 */
@Service
public class TranslationService {

    /** Change only this constant if you move the container. */
    private static final String BASE_URL = "http://localhost:5001";

    private final WebClient client = WebClient.builder()
            .baseUrl(BASE_URL)
            .build();

    /* ---------- public helpers ---------- */

    public String toEnglish(String text) {
        return translate(text, "auto", "en");
    }

    public String fromEnglish(String text, String targetLang) {
        return translate(text, "en", targetLang);
    }

    /* ---------- internal helper ---------- */

    private String translate(String q, String source, String target) {
        /*
         * LibreTranslate expects JSON:
         *   { "q":"text", "source":"xx", "target":"yy", "format":"text" }
         * and replies:
         *   { "translatedText":"..." }
         */
        return client.post()
                .uri("/translate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("""
                    { "q":"%s", "source":"%s", "target":"%s", "format":"text" }
                    """.formatted(escape(q), source, target))
                .retrieve()
                .bodyToMono(Json.class)      // small record below
                .block()                     // convert reactive → blocking
                .translatedText();
    }

    /** small local record for JSON mapping */
    private record Json(String translatedText) {}

    /** naive escaper for quotes & newlines in block string */
    private static String escape(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");
    }
}