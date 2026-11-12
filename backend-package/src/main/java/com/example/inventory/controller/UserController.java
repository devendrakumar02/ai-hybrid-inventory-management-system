package com.example.inventory.controller;

import com.example.inventory.entity.User;
import com.example.inventory.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"})
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<Map<String, Object>> getAllUsers() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> list = new ArrayList<>();
        for (User u : users) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("name", u.getName() != null ? u.getName() : u.getUsername());
            map.put("email", u.getEmail() != null ? u.getEmail() : "");
            map.put("role", u.getRole() != null ? u.getRole() : "ADMIN");
            map.put("createdAt", u.getCreatedAt());
            list.add(map);
        }
        return list;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(u -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", u.getId());
                    map.put("username", u.getUsername());
                    map.put("name", u.getName());
                    map.put("email", u.getEmail());
                    map.put("role", u.getRole());
                    map.put("createdAt", u.getCreatedAt());
                    return ResponseEntity.ok(map);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        String name = request.get("name");
        String email = request.get("email");
        String role = request.get("role");

        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
        }
        if (password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
        }
        if (userRepository.existsByUsername(username.trim())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already exists"));
        }

        User user = new User();
        user.setUsername(username.trim());
        user.setPassword(passwordEncoder.encode(password.trim()));
        user.setName(name != null && !name.isBlank() ? name.trim() : username.trim());
        user.setEmail(email != null && !email.isBlank() ? email.trim() : "");
        user.setRole(role != null && !role.isBlank() ? role.trim().toUpperCase() : "CASHIER");

        User saved = userRepository.save(user);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", saved.getId());
        out.put("username", saved.getUsername());
        out.put("name", saved.getName());
        out.put("email", saved.getEmail());
        out.put("role", saved.getRole());
        out.put("createdAt", saved.getCreatedAt());
        out.put("message", "User created successfully");

        return ResponseEntity.ok(out);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, String> request) {
        return userRepository.findById(id)
                .map(user -> {
                    if (request.containsKey("name") && request.get("name") != null) {
                        user.setName(request.get("name").trim());
                    }
                    if (request.containsKey("email") && request.get("email") != null) {
                        user.setEmail(request.get("email").trim());
                    }
                    if (request.containsKey("role") && request.get("role") != null) {
                        user.setRole(request.get("role").trim().toUpperCase());
                    }
                    if (request.containsKey("password") && request.get("password") != null && !request.get("password").isBlank()) {
                        user.setPassword(passwordEncoder.encode(request.get("password").trim()));
                    }

                    User updated = userRepository.save(user);

                    Map<String, Object> out = new LinkedHashMap<>();
                    out.put("id", updated.getId());
                    out.put("username", updated.getUsername());
                    out.put("name", updated.getName());
                    out.put("email", updated.getEmail());
                    out.put("role", updated.getRole());
                    out.put("createdAt", updated.getCreatedAt());
                    out.put("message", "User updated successfully");
                    return ResponseEntity.ok(out);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    if ("admin".equalsIgnoreCase(user.getUsername())) {
                        return ResponseEntity.badRequest().body(Map.of("error", "The primary 'admin' user cannot be deleted."));
                    }
                    userRepository.delete(user);
                    return ResponseEntity.ok(Map.of("success", true, "message", "User deleted successfully"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
