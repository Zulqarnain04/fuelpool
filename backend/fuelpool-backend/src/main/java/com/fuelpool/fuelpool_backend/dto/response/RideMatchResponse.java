package com.fuelpool.fuelpool_backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class RideMatchResponse {
    private Long rideId;
    private String driverName;
    private double driverRating;
    private String vehicleMake;
    private String vehicleModel;
    private String vehicleColor;
    private String plateNumber;
    private LocalDateTime departureTime;
    private int availableSeats;
    private BigDecimal farePerPerson;
    private BigDecimal savedVsGrab;
    private double matchScore;
    private double pickupDistanceMetres;
    private String originLabel;
    private String destinationLabel;
}
