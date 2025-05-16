package ai.andrew.medicare_backend.dto;

/**
 * Simplest possible data-transfer object.
 * Spring will deserialize incoming JSON into this record.
 */
public record SymptomRequest(String text) { } // record, concise data class in java - single file named 'text'