// src/constants/vehicles.ts
// Static vehicle catalogue for the onboarding Vehicle Setup screen.

export interface VehicleSpec {
  make: string;
  model: string;
  tankCapacity: number; // litres
  defaultEfficiency: number; // km/L
}

// Known specs — selecting one of these auto-fills tank + efficiency.
export const VEHICLES_DB: VehicleSpec[] = [
  { make: 'Perodua', model: 'Myvi', tankCapacity: 40, defaultEfficiency: 16 },
  { make: 'Perodua', model: 'Axia', tankCapacity: 35, defaultEfficiency: 17 },
  { make: 'Proton', model: 'Saga', tankCapacity: 40, defaultEfficiency: 15 },
  { make: 'Honda', model: 'City', tankCapacity: 47, defaultEfficiency: 14 },
  { make: 'Toyota', model: 'Vios', tankCapacity: 42, defaultEfficiency: 14 },
];

export const MAKES = ['Perodua', 'Proton', 'Honda', 'Toyota', 'Mazda', 'Volkswagen', 'Other'];

export const MODELS_BY_MAKE: Record<string, string[]> = {
  Perodua: ['Myvi', 'Axia', 'Bezza', 'Ativa', 'Alza'],
  Proton: ['Saga', 'Iriz', 'X50', 'X70', 'Persona'],
  Honda: ['City', 'Civic', 'HR-V', 'Jazz'],
  Toyota: ['Vios', 'Yaris', 'Corolla', 'Hilux'],
  Mazda: ['Mazda2', 'Mazda3', 'CX-5'],
  Volkswagen: ['Polo', 'Golf', 'Vento'],
  Other: [],
};

export function findVehicleSpec(make: string, model: string): VehicleSpec | undefined {
  return VEHICLES_DB.find((v) => v.make === make && v.model === model);
}
