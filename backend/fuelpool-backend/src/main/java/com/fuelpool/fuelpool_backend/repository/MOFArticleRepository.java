package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.MOFArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MOFArticleRepository extends JpaRepository<MOFArticle, Long> {
    Optional<MOFArticle> findTopByOrderByFetchedAtDesc();
}
