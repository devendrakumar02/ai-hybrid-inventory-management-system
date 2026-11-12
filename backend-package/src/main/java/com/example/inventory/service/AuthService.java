package com.example.inventory.service;

import com.example.inventory.entity.User;
import com.example.inventory.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public boolean login(String username, String password) {

        User user = userRepository.findByUsername(username)
                .orElse(null);

        if (user == null) {
            return false;
        }

        return passwordEncoder.matches(password, user.getPassword());
    }

    public void createDefaultAdmin() {

        if (!userRepository.existsByUsername("admin")) {

            User admin = new User(
                    "admin",
                    passwordEncoder.encode("admin123"),
                    "ADMIN"
            );

            userRepository.save(admin);
        }
    }
}