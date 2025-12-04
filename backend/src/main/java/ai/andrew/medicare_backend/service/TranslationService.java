package ai.andrew.medicare_backend.service;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import io.netty.channel.ChannelOption;
import reactor.netty.http.client.HttpClient;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;

/**
 * TranslationService
 * ------------------
 * Wraps a running LibreTranslate instance exposed on host port 5001
 * (internal container port 5000).  Two helper methods:
 *
 *   toEnglish(text)          : any language → English
 *   fromEnglish(text, lang)  : English → target ISO 639-1 language code
 *
 * WebClient is Spring's non-blocking HTTP client.  For simplicity we call
 * .block() here so the method returns a plain String synchronously.
 */
@Service
public class TranslationService {

    private final WebClient client;

    public TranslationService(
            @Value("${libretranslate.url:https://libretranslate.de}") String baseUrl,
            WebClient.Builder builder) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
                .responseTimeout(Duration.ofSeconds(12));

        this.client = builder
                .clone()
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }

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
        try {
            Json response = client.post()
                    .uri("/translate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue("""
                        { "q":"%s", "source":"%s", "target":"%s", "format":"text" }
                        """.formatted(escape(q), source, target))
                    .retrieve()
                    .bodyToMono(Json.class)      // small record below
                    .timeout(Duration.ofSeconds(12))
                    .block();                     // convert reactive → blocking

            return response != null && response.translatedText() != null
                    ? response.translatedText()
                    : q;
        } catch (Exception ex) {
            // Fall back to the original text when the translation service is unavailable
            return q;
        }
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
