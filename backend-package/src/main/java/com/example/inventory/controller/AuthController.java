package com.example.inventory.controller;

import com.example.inventory.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final com.example.inventory.repository.UserRepository userRepository;

    public AuthController(AuthService authService, com.example.inventory.repository.UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        boolean success = authService.login(
                request.getUsername(),
                request.getPassword()
        );

        if (!success) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Invalid username or password");

            return ResponseEntity
                    .status(401)
                    .body(response);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Login successful");
        response.put("username", request.getUsername());

        userRepository.findByUsername(request.getUsername()).ifPresent(u -> {
            response.put("name", (u.getName() != null && !u.getName().isBlank()) ? u.getName() : u.getUsername());
            response.put("role", u.getRole() != null ? u.getRole() : "ADMIN");
            response.put("email", u.getEmail() != null ? u.getEmail() : "");
        });

        return ResponseEntity.ok(response);
    }

    public static class LoginRequest {

        private String username;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }
}