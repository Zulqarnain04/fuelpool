package com.fuelpool.fuelpool_backend.service.fuel;

import com.fuelpool.fuelpool_backend.dto.request.FuelLogRequest;
import com.fuelpool.fuelpool_backend.dto.response.RefuelRecommendationResponse;
import com.fuelpool.fuelpool_backend.exception.BusinessException;
import com.fuelpool.fuelpool_backend.exception.ResourceNotFoundException;
import com.fuelpool.fuelpool_backend.model.FuelLog;
import com.fuelpool.fuelpool_backend.model.FuelPrice;
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
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FuelLogService {

    private final FuelLogRepository fuelLogRepository;
    private final VehicleRepository vehicleRepository;
    private final FuelPriceRepository fuelPriceRepository;
    private final FuelPriceService fuelPriceService;

    public FuelLog save(User user, FuelLogRequest req) {
        Vehicle vehicle = null;
        if (req.getVehicleId() != null) {
            vehicle = vehicleRepository.findById(req.getVehicleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Vehicle", req.getVehicleId()));
        } else {
            vehicle = vehicleRepository.findByUserIdAndIsPrimaryTrue(user.getId()).orElse(null);
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

        // Update vehicle odometer
        if (vehicle != null) {
            vehicle.setCurrentOdometer(req.getOdometer());
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
        Vehicle vehicle = vehicleRepository.findByUserIdAndIsPrimaryTrue(user.getId()).orElse(null);
        if (vehicle == null) {
            return RefuelRecommendationResponse.builder()
                    .action("NORMAL")
                    .reason("No vehicle set up. Add a vehicle to get fuel level estimates.")
                    .build();
        }

        FuelLog lastLog = fuelLogRepository.findTopByVehicleIdOrderByLogDateDesc(vehicle.getId()).orElse(null);
        if (lastLog == null) {
            return RefuelRecommendationResponse.builder()
                    .action("NORMAL")
                    .reason("Log your first fill-up to get fuel level estimates.")
                    .build();
        }

        // Estimate km driven since last fill (15km/day for demo)
        long daysSinceFill = java.time.temporal.ChronoUnit.DAYS.between(lastLog.getLogDate().toLocalDate(), java.time.LocalDate.now());
        double kmDrivenEstimate = daysSinceFill * 15.0;
        double avgEfficiency = vehicle.getAvgEfficiency().doubleValue();
        double fuelUsedEstimate = kmDrivenEstimate / avgEfficiency;
        double litresFilled = lastLog.getLitresFilled().doubleValue();
        double tankCapacity = vehicle.getTankCapacity().doubleValue();

        double remainingFuel = lastLog.isFullTank()
                ? tankCapacity - fuelUsedEstimate
                : litresFilled - fuelUsedEstimate;
        remainingFuel = Math.max(0, remainingFuel);

        double remainingPct = (remainingFuel / tankCapacity) * 100;
        double remainingKm = remainingFuel * avgEfficiency;

        return RefuelRecommendationResponse.builder()
                .action("NORMAL")
                .reason("Fill up as needed.")
                .remainingFuelPct(Math.round(remainingPct * 10.0) / 10.0)
                .remainingKm(Math.round(remainingKm * 10.0) / 10.0)
                .remainingLitres(Math.round(remainingFuel * 10.0) / 10.0)
                .build();
    }

    public Page<FuelLog> getLogs(User user, Pageable pageable) {
        return fuelLogRepository.findByUserIdOrderByLogDateDesc(user.getId(), pageable);
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
