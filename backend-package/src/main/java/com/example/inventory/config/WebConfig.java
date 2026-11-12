package com.example.inventory.config;
import org.springframework.context.annotation.*;
import org.springframework.web.servlet.config.annotation.*;
@Configuration
public class WebConfig implements WebMvcConfigurer {
 @Override public void addCorsMappings(CorsRegistry r){r.addMapping("/**").allowedOrigins("http://localhost:5173","http://127.0.0.1:5173").allowedMethods("*").allowedHeaders("*");}
}
