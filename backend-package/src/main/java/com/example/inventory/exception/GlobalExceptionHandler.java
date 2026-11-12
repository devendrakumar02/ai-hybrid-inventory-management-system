package com.example.inventory.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<?> notFound(Exception e) {
        log.warn("Resource not found: {}", e.getMessage());
        return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<?> bad(Exception e) {
        log.warn("Bad request: {}", e.getMessage());
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> other(Exception e) {
        log.error("Unhandled exception during request processing", e);
        return ResponseEntity.status(500).body(Map.of(
            "message", e.getMessage() != null ? e.getMessage() : "Unexpected server error.",
            "errorType", e.getClass().getName()
        ));
    }
}
