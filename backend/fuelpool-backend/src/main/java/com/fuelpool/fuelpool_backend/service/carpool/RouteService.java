package com.fuelpool.fuelpool_backend.service.carpool;

import com.fuelpool.fuelpool_backend.model.RideRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class RouteService {

    private static final double EARTH_RADIUS_M = 6_371_000.0;

    public double haversineMetres(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public List<RideRequest> orderPickups(double driverLat, double driverLng,
                                          List<RideRequest> passengers) {
        List<RideRequest> unvisited = new ArrayList<>(passengers);
        List<RideRequest> ordered = new ArrayList<>();
        double curLat = driverLat, curLng = driverLng;

        while (!unvisited.isEmpty()) {
            RideRequest nearest = null;
            double minDist = Double.MAX_VALUE;
            for (RideRequest rr : unvisited) {
                double dist = haversineMetres(curLat, curLng,
                        rr.getPickupLat().doubleValue(), rr.getPickupLng().doubleValue());
                if (dist < minDist) { minDist = dist; nearest = rr; }
            }
            ordered.add(nearest);
            curLat = nearest.getPickupLat().doubleValue();
            curLng = nearest.getPickupLng().doubleValue();
            unvisited.remove(nearest);
        }
        return ordered;
    }

    public String buildGoogleMapsUrl(double originLat, double originLng,
                                     double destLat, double destLng,
                                     List<RideRequest> waypoints) {
        StringBuilder url = new StringBuilder("https://www.google.com/maps/dir/?api=1")
                .append("&origin=").append(originLat).append(",").append(originLng)
                .append("&destination=").append(destLat).append(",").append(destLng)
                .append("&travelmode=driving");

        if (!waypoints.isEmpty()) {
            url.append("&waypoints=");
            for (int i = 0; i < waypoints.size(); i++) {
                if (i > 0) url.append("|");
                url.append(waypoints.get(i).getPickupLat())
                   .append(",")
                   .append(waypoints.get(i).getPickupLng());
            }
        }
        return url.toString();
    }
}
