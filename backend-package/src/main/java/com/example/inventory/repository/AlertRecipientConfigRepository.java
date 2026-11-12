package com.example.inventory.repository;

import com.example.inventory.entity.AlertRecipientConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRecipientConfigRepository extends JpaRepository<AlertRecipientConfig, Long> {

    Optional<AlertRecipientConfig> findByTypeAndTarget(String type, String target);

    List<AlertRecipientConfig> findByType(String type);

    boolean existsByTypeAndTarget(String type, String target);
}
