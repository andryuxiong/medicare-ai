package ai.andrew.medicare_backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Service
public class ConditionService {

    private List<Map<String,Object>> db;

    /* This takes the .JSON file and reads the keywords to determine the user's symptoms  */
    @PostConstruct
    void init() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        InputStream in = getClass().getResourceAsStream("/data.json");
        db = mapper.readValue(in, new TypeReference<>() {});
    }

    public Map<String,Object> keywordMatch(String userText) {
        String lower = userText.toLowerCase();
        return db.stream()
                 .filter(row -> ((List<?>) row.get("keywords")).stream()
                         .anyMatch(k -> lower.contains(k.toString())))
                 .findFirst()
                 .orElse(null);
    }

    // Returns a description or relevant context for the user's message
    public String getContextForUserMessage(String userMessage) {
        Map<String, Object> match = keywordMatch(userMessage);
        if (match != null && match.get("description") != null) {
            return match.get("description").toString();
        }
        return "";
    }
}