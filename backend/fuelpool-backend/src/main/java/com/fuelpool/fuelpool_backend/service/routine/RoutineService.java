package com.fuelpool.fuelpool_backend.service.routine;

import com.fuelpool.fuelpool_backend.dto.request.RoutineRequest;
import com.fuelpool.fuelpool_backend.exception.BusinessException;
import com.fuelpool.fuelpool_backend.exception.ResourceNotFoundException;
import com.fuelpool.fuelpool_backend.model.Routine;
import com.fuelpool.fuelpool_backend.model.User;
import com.fuelpool.fuelpool_backend.repository.RoutineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoutineService {

    private final RoutineRepository routineRepository;

    public Routine create(User user, RoutineRequest req) {
        Routine routine = Routine.builder()
                .user(user)
                .name(req.getName())
                .daysOfWeek(req.getDaysOfWeek())
                .departureTime(req.getDepartureTime())
                .originLat(req.getOriginLat())
                .originLng(req.getOriginLng())
                .originLabel(req.getOriginLabel())
                .destLat(req.getDestLat())
                .destLng(req.getDestLng())
                .destLabel(req.getDestLabel())
                .rolePreference(req.getRolePreference())
                .autoRequest(req.isAutoRequest())
                .build();
        return routineRepository.save(routine);
    }

    public List<Routine> getForUser(User user) {
        return routineRepository.findByUserIdAndIsActiveTrue(user.getId());
    }

    public Routine update(Long id, User user, RoutineRequest req) {
        Routine routine = findAndVerify(id, user);
        routine.setName(req.getName());
        routine.setDaysOfWeek(req.getDaysOfWeek());
        routine.setDepartureTime(req.getDepartureTime());
        routine.setOriginLat(req.getOriginLat());
        routine.setOriginLng(req.getOriginLng());
        routine.setOriginLabel(req.getOriginLabel());
        routine.setDestLat(req.getDestLat());
        routine.setDestLng(req.getDestLng());
        routine.setDestLabel(req.getDestLabel());
        routine.setRolePreference(req.getRolePreference());
        routine.setAutoRequest(req.isAutoRequest());
        return routineRepository.save(routine);
    }

    public void delete(Long id, User user) {
        Routine routine = findAndVerify(id, user);
        routineRepository.delete(routine);
    }

    public Routine toggle(Long id, User user) {
        Routine routine = findAndVerify(id, user);
        routine.setActive(!routine.isActive());
        return routineRepository.save(routine);
    }

    private Routine findAndVerify(Long id, User user) {
        Routine routine = routineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Routine", id));
        if (!routine.getUser().getId().equals(user.getId())) {
            throw new BusinessException("Not your routine");
        }
        return routine;
    }
}
