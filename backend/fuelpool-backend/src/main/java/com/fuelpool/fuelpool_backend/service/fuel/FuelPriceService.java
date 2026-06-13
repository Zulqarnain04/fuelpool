package com.fuelpool.fuelpool_backend.service.fuel;

import com.fuelpool.fuelpool_backend.dto.response.FuelPriceResponse;
import com.fuelpool.fuelpool_backend.model.FuelPrice;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.FuelPriceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FuelPriceService implements CommandLineRunner {

    private final FuelPriceRepository fuelPriceRepository;

    @Override
    public void run(String... args) {
        loadCsvIfEmpty();
    }

    private void loadCsvIfEmpty() {
        try {
            ClassPathResource resource = new ClassPathResource("data/fuelprice.csv");
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream()))) {
                String line;
                boolean header = true;
                int loaded = 0;

                while ((line = reader.readLine()) != null) {
                    if (header) { header = false; continue; }
                    String[] parts = line.split(",", -1);
                    if (parts.length < 6) continue;

                    String seriesType = parts[0].trim();
                    if (!seriesType.equals("level")) continue;

                    LocalDate date = LocalDate.parse(parts[1].trim());
                    if (fuelPriceRepository.existsByPriceDate(date)) continue;

                    FuelPrice fp = FuelPrice.builder()
                            .priceDate(date)
                            .ron95(parseBd(parts[2]))
                            .ron97(parseBd(parts[3]))
                            .diesel(parseBd(parts[4]))
                            .dieselEastMsia(parseBd(parts[5]))
                            .ron95Budi95(parts.length > 6 ? parseBd(parts[6]) : null)
                            .ron95Skps(parts.length > 7 ? parseBd(parts[7]) : null)
                            .createdAt(LocalDateTime.now())
                            .build();

                    fuelPriceRepository.save(fp);
                    loaded++;
                }
                if (loaded > 0) log.info("Loaded {} fuel price records from CSV", loaded);
            }
        } catch (Exception e) {
            log.warn("Could not load fuelprice.csv: {}", e.getMessage());
        }
    }

    public FuelPriceResponse getCurrentPrices() {
        FuelPrice latest = fuelPriceRepository.findTopByOrderByPriceDateDesc().orElse(null);
        if (latest == null) return null;
        return toResponse(latest);
    }

    public List<FuelPriceResponse> getHistory(int weeks) {
        List<FuelPrice> prices = fuelPriceRepository.findByPriceDateBetweenOrderByPriceDateDesc(
                LocalDate.now().minusWeeks(weeks), LocalDate.now()
        );
        return prices.stream().map(this::toResponse).toList();
    }

    public List<FuelPrice> getLastNPrices(int n) {
        return fuelPriceRepository.findByPriceDateBeforeOrderByPriceDateDesc(
            LocalDate.now().plusDays(1), PageRequest.of(0, n)
        ).getContent();
    }

    public BigDecimal getPriceForFuelType(FuelPrice fp, Vehicle.FuelType fuelType) {
        return switch (fuelType) {
            case RON95_MARKET -> fp.getRon95();
            case RON95_BUDI95 -> fp.getRon95Budi95() != null ? fp.getRon95Budi95() : new BigDecimal("1.99");
            case RON97 -> fp.getRon97();
            case DIESEL -> fp.getDiesel();
            case DIESEL_EAST -> fp.getDieselEastMsia();
        };
    }

    private FuelPriceResponse toResponse(FuelPrice fp) {
        return FuelPriceResponse.builder()
                .priceDate(fp.getPriceDate())
                .ron95(fp.getRon95())
                .ron97(fp.getRon97())
                .diesel(fp.getDiesel())
                .dieselEastMsia(fp.getDieselEastMsia())
                .ron95Budi95(fp.getRon95Budi95())
                .ron95Skps(fp.getRon95Skps())
                .build();
    }

    private BigDecimal parseBd(String s) {
        if (s == null || s.isBlank()) return null;
        try { return new BigDecimal(s.trim()); }
        catch (NumberFormatException e) { return null; }
    }
}
