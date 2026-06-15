package com.fuelpool.fuelpool_backend.service.fuel;

import com.fuelpool.fuelpool_backend.dto.request.FuelLogRequest;
import com.fuelpool.fuelpool_backend.dto.response.RefuelRecommendationResponse;
import com.fuelpool.fuelpool_backend.exception.BusinessException;
import com.fuelpool.fuelpool_backend.exception.ResourceNotFoundException;
import com.fuelpool.fuelpool_backend.model.FuelLog;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.model.Vehicle;
import com.fuelpool.fuelpool_backend.repository.FuelLogRepository;
import com.fuelpool.fuelpool_backend.repository.FuelPriceRepository;
import com.fuelpool.fuelpool_backend.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FuelLogService {

    private final FuelLogRepository fuelLogRepository;
    private final VehicleRepository vehicleRepository;
    private final FuelPriceRepository fuelPriceRepository;
    private final FuelPriceService fuelPriceService;
    private final TrendPredictionService trendPredictionService;

    public FuelLog save(User user, FuelLogRequest req) {
        Vehicle vehicle = null;
        if (req.getVehicleId() != null) {
            vehicle = vehicleRepository.findById(req.getVehicleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle", req.getVehicleId()));
        } else {
            vehicle = vehicleRepository.findFirstByUserIdAndIsPrimaryTrue(user.getId()).orElse(null);
        }

        // Auto-calc price/total if only one is given
        BigDecimal pricePerLitre = req.getPricePerLitre();
        BigDecimal totalCost = req.getTotalCost();
        if (pricePerLitre == null && totalCost != null) {
            pricePerLitre = totalCost.divide(req.getLitresFilled(), 3, RoundingMode.HALF_UP);
        } else if (totalCost == null && pricePerLitre != null) {
            totalCost = pricePerLitre.multiply(req.getLitresFilled()).setScale(2, RoundingMode.HALF_UP);
        } else if (pricePerLitre == null) {
            throw new BusinessException("Either pricePerLitre or totalCost must be provided");
        }

        // Previous log for distance calculation
        Optional<FuelLog> prevOpt = vehicle != null
                ? fuelLogRepository.findTopByVehicleIdOrderByLogDateDesc(vehicle.getId())
                : fuelLogRepository.findTopByUserIdOrderByLogDateDesc(user.getId());

        Integer distanceSinceLast = null;
        BigDecimal efficiencyThisFill = null;
        BigDecimal costPerKm = null;

        if (prevOpt.isPresent()) {
            FuelLog prev = prevOpt.get();
            distanceSinceLast = req.getOdometer() - prev.getOdometer();

            if (distanceSinceLast > 0) {
                costPerKm = totalCost.divide(BigDecimal.valueOf(distanceSinceLast), 4, RoundingMode.HALF_UP);

                // Efficiency only if full-to-full, no missed fill
                if (req.isFullTank() && prev.isFullTank() && !req.isMissedPrevious()) {
                    efficiencyThisFill = BigDecimal.valueOf(distanceSinceLast)
                            .divide(req.getLitresFilled(), 2, RoundingMode.HALF_UP);

                    // Update vehicle rolling average (last 5 readings)
                    if (vehicle != null) {
                        updateVehicleEfficiency(vehicle, efficiencyThisFill);
                    }
                }
            }
        }

        // Update vehicle odometer and current fuel level
        if (vehicle != null) {
            vehicle.setCurrentOdometer(req.getOdometer());

            BigDecimal tankCapacity = vehicle.getTankCapacity();
            if (req.isFullTank()) {
                vehicle.setCurrentFuelLevel(tankCapacity);
            } else {
                BigDecimal current = vehicle.getCurrentFuelLevel() != null
                        ? vehicle.getCurrentFuelLevel() : BigDecimal.ZERO;
                vehicle.setCurrentFuelLevel(current.add(req.getLitresFilled()).min(tankCapacity));
            }

            vehicleRepository.save(vehicle);
        }

        FuelLog log = FuelLog.builder()
                .user(user)
                .vehicle(vehicle)
                .logDate(req.getLogDate())
                .odometer(req.getOdometer())
                .litresFilled(req.getLitresFilled())
                .pricePerLitre(pricePerLitre)
                .totalCost(totalCost)
                .isFullTank(req.isFullTank())
                .isMissedPrevious(req.isMissedPrevious())
                .stationName(req.getStationName())
                .fuelType(req.getFuelType())
                .notes(req.getNotes())
                .distanceSinceLast(distanceSinceLast)
                .efficiencyThisFill(efficiencyThisFill)
                .costPerKm(costPerKm)
                .build();

        return fuelLogRepository.save(log);
    }

    public RefuelRecommendationResponse getRecommendation(User user) {
        Vehicle vehicle = vehicleRepository.findFirstByUserIdAndIsPrimaryTrue(user.getId()).orElse(null);

        Vehicle.FuelType fuelType = vehicle != null ? vehicle.getFuelType() : Vehicle.FuelType.RON97;
        var trend = trendPredictionService.predict(fuelType);
        double slope = trend.getSlope();

        if (vehicle == null) {
            return RefuelRecommendationResponse.builder()
                    .action(trend.getRecommendation()).reason(trend.getReason())
                    .confidence(computeConfidence(slope)).build();
        }

        FuelLog lastLog = fuelLogRepository.findTopByVehicleIdOrderByLogDateDesc(vehicle.getId()).orElse(null);
        if (lastLog == null) {
            return RefuelRecommendationResponse.builder()
                    .action(trend.getRecommendation())
                    .reason(trend.getReason() + " Log your first fill-up to get fuel level estimates.")
                    .confidence(computeConfidence(slope)).build();
        }

        double tankCapacity = vehicle.getTankCapacity().doubleValue();
        double efficiency   = vehicle.getAvgEfficiency().doubleValue();
        double dailyKm      = computeDailyKmEstimate(user.getId());

        double remaining;
        if (vehicle.getCurrentFuelLevel() != null) {
            remaining = Math.min(vehicle.getCurrentFuelLevel().doubleValue(), tankCapacity);
        } else {
            long daysSince = ChronoUnit.DAYS.between(lastLog.getLogDate().toLocalDate(), LocalDate.now());
            double fuelUsed = (daysSince * dailyKm) / efficiency;
            remaining = Math.max(0,
                (lastLog.isFullTank() ? tankCapacity : lastLog.getLitresFilled().doubleValue()) - fuelUsed);
        }
        double remainPct    = (remaining / tankCapacity) * 100;
        double remainKm     = remaining * efficiency;
        double daysOfRange  = dailyKm > 0 ? remainKm / dailyKm : 0;
        int behaviourScore  = (int) Math.min(100, Math.round((efficiency / 16.0) * 100));

        double currentPrice      = getCurrentPrice(fuelType);
        double predictedNextWeek = trend.getPredicted().isEmpty() ? currentPrice : trend.getPredicted().get(0);

        String action;
        double suggestedAmount;
        double estimatedSavings;

        if (remainPct < 20) {
            action = "FILL_NOW";
            suggestedAmount = round(tankCapacity - remaining);
            estimatedSavings = 0;
        } else if ("RISING".equals(trend.getDirection()) && remainPct < 60) {
            action = "FILL_NOW";
            suggestedAmount = round(tankCapacity - remaining);
            estimatedSavings = round(Math.max(0, predictedNextWeek - currentPrice) * suggestedAmount);
        } else if ("FALLING".equals(trend.getDirection()) && remainPct > 30) {
            action = "WAIT";
            double litresFor3Days = (3 * dailyKm) / efficiency;
            suggestedAmount = round(Math.max(0, litresFor3Days - remaining));
            estimatedSavings = round(Math.max(0, currentPrice - predictedNextWeek) * (tankCapacity - remaining));
        } else if (remainPct < 40) {
            action = "FILL_SOON";
            suggestedAmount = round(tankCapacity * 0.75 - remaining);
            estimatedSavings = 0;
        } else {
            action = "NORMAL";
            suggestedAmount = 0;
            estimatedSavings = 0;
        }

        String reason = generateRefuelReason(action, remaining, remainKm, dailyKm,
            daysOfRange, trend.getDirection(), slope, currentPrice,
            predictedNextWeek, suggestedAmount, estimatedSavings, fuelType.name());

        return RefuelRecommendationResponse.builder()
                .action(action)
                .reason(reason != null ? reason : trend.getReason())
                .remainingFuelPct(round(remainPct))
                .remainingKm(round(remainKm))
                .remainingLitres(round(remaining))
                .confidence(computeConfidence(slope))
                .suggestedAmount(Math.max(0, suggestedAmount))
                .estimatedSavings(estimatedSavings)
                .daysOfRange(round(daysOfRange))
                .behaviourScore(behaviourScore)
                .build();
    }

    private double round(double v) { return Math.round(v * 10.0) / 10.0; }

    private double computeDailyKmEstimate(Long userId) {
        List<FuelLog> logs = fuelLogRepository
                .findTop3ByUserIdAndDistanceSinceLastIsNotNullOrderByLogDateDesc(userId);
        if (logs.isEmpty()) return 22.0;
        return logs.stream()
                .mapToDouble(l -> l.getDistanceSinceLast() != null && l.getDistanceSinceLast() > 0
                        ? l.getDistanceSinceLast() / 14.0 : 22.0)
                .average().orElse(22.0);
    }

    private int computeConfidence(double slope) {
        int c = 65;
        double abs = Math.abs(slope);
        if (abs > 0.20) c += 15;
        else if (abs > 0.10) c += 10;
        else if (abs > 0.05) c += 5;
        return Math.min(95, Math.max(40, c));
    }

    private double getCurrentPrice(Vehicle.FuelType fuelType) {
        return fuelPriceRepository.findTopByOrderByPriceDateDesc()
                .map(p -> { BigDecimal v = fuelPriceService.getPriceForFuelType(p, fuelType);
                            return v != null ? v.doubleValue() : 4.35; })
                .orElse(4.35);
    }

    // Fast, templated refuel reason. Intentionally NOT LLM-backed: this runs on the
    // dashboard's hot path, and a synchronous Ollama call (cold model can take 15–30s)
    // would block the home screen past the client timeout. The AI showcase lives in the
    // weekly eco summary instead.
    private String generateRefuelReason(String action, double remaining, double remainKm,
            double dailyKm, double daysOfRange, String direction, double slope,
            double currentPrice, double predictedPrice, double suggestedAmount,
            double savings, String fuelType) {
        String fuel = fuelType.replace("_", " ");
        switch (action) {
            case "FILL_NOW":
                if ("RISING".equals(direction) && savings > 0) {
                    return String.format(
                        "Prices are rising — top up about %.0fL now to save roughly RM %.2f before next week.",
                        suggestedAmount, savings);
                }
                return String.format(
                    "Only ~%.0f km of range left — fill about %.0fL of %s soon to avoid running low.",
                    remainKm, suggestedAmount, fuel);
            case "WAIT":
                return String.format(
                    "Prices are trending down and you still have ~%.0f km of range, so waiting could save about RM %.2f.",
                    remainKm, savings);
            case "FILL_SOON":
                return String.format(
                    "About %.0f km left (~%.1f days) — plan to refuel around %.0fL of %s soon.",
                    remainKm, daysOfRange, suggestedAmount, fuel);
            default:
                return String.format(
                    "Fuel level is healthy with ~%.0f km of range — no need to refuel just yet.",
                    remainKm);
        }
    }

    public Page<FuelLog> getLogs(User user, Pageable pageable) {
        return fuelLogRepository.findByUserIdOrderByLogDateDesc(user.getId(), pageable);
    }

    public FuelLog findById(Long id, User user) {
        FuelLog log = fuelLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FuelLog", id));
        if (!log.getUser().getId().equals(user.getId()))
            throw new BusinessException("Not your log");
        return log;
    }

    public Map<String, Object> getStats(User user) {
        List<FuelLog> logs = fuelLogRepository.findByUserIdOrderByLogDateDesc(user.getId());

        double totalSpend  = logs.stream().mapToDouble(l -> l.getTotalCost().doubleValue()).sum();
        double totalLitres = logs.stream().mapToDouble(l -> l.getLitresFilled().doubleValue()).sum();

        java.util.OptionalDouble avgEff = logs.stream()
            .filter(l -> l.getEfficiencyThisFill() != null)
            .mapToDouble(l -> l.getEfficiencyThisFill().doubleValue())
            .average();

        Map<String, Double> monthly = logs.stream()
            .collect(Collectors.groupingBy(
                l -> l.getLogDate().format(DateTimeFormatter.ofPattern("yyyy-MM")),
                Collectors.summingDouble(l -> l.getTotalCost().doubleValue())
            ));

        Map<String, Object> result = new HashMap<>();
        result.put("totalSpend",       Math.round(totalSpend * 100.0) / 100.0);
        result.put("totalLitres",      Math.round(totalLitres * 100.0) / 100.0);
        result.put("avgEfficiency",    avgEff.isPresent() ? Math.round(avgEff.getAsDouble() * 10.0) / 10.0 : null);
        result.put("monthlyBreakdown", monthly);
        return result;
    }

    public void delete(Long id, User user) {
        FuelLog log = fuelLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FuelLog", id));
        if (!log.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Cannot delete another user's log");
        }
        fuelLogRepository.delete(log);
    }

    private void updateVehicleEfficiency(Vehicle vehicle, BigDecimal newReading) {
        List<FuelLog> last5 = fuelLogRepository
                .findTop5ByVehicleIdAndIsFullTankTrueOrderByLogDateDesc(vehicle.getId());

        double sum = newReading.doubleValue();
        for (FuelLog l : last5) {
            if (l.getEfficiencyThisFill() != null) sum += l.getEfficiencyThisFill().doubleValue();
        }
        int count = 1 + (int) last5.stream().filter(l -> l.getEfficiencyThisFill() != null).count();
        double avg = sum / count;

        vehicle.setAvgEfficiency(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        vehicleRepository.save(vehicle);
    }
}
