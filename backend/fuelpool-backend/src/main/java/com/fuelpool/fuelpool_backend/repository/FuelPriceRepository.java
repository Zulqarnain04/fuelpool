package com.fuelpool.fuelpool_backend.repository;

import com.fuelpool.fuelpool_backend.model.FuelPrice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FuelPriceRepository extends JpaRepository<FuelPrice, Long> {
    Optional<FuelPrice> findTopByOrderByPriceDateDesc();
    List<FuelPrice> findTop6ByOrderByPriceDateDesc();
    List<FuelPrice> findByPriceDateBetweenOrderByPriceDateDesc(LocalDate from, LocalDate to);
    Page<FuelPrice> findByPriceDateBeforeOrderByPriceDateDesc(LocalDate date, Pageable pageable);
    boolean existsByPriceDate(LocalDate date);
}
