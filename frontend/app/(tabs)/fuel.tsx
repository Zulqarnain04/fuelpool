// app/(tabs)/fuel.tsx — Fuel Intelligence (L1) container.
// Sub-screens are switched via internal state (not Expo Router) since they're
// closely-related views within the same tab.
import React, { useEffect, useState } from 'react';
import { vehicleApi } from '../../src/services/api';
import type { FuelType, Vehicle } from '../../src/services/api';
import FuelOverview from '../../src/components/fuel/FuelOverview';
import MofArticleScreen from '../../src/components/fuel/MofArticleScreen';
import AddFuelLog from '../../src/components/fuel/AddFuelLog';
import FuelHistory from '../../src/components/fuel/FuelHistory';

type SubScreen = 'overview' | 'article' | 'add-log' | 'history';

export default function FuelTab() {
  const [screen, setScreen] = useState<SubScreen>('overview');
  const [userFuel, setUserFuel] = useState<FuelType>('RON95_MARKET');

  useEffect(() => {
    vehicleApi
      .getVehicles()
      .then((r) => {
        const list: Vehicle[] = r.data ?? [];
        const primary = list.find((v) => v.primary) ?? list[0];
        if (primary?.fuelType) setUserFuel(primary.fuelType);
      })
      .catch(() => {});
  }, []);

  switch (screen) {
    case 'article':
      return <MofArticleScreen onBack={() => setScreen('overview')} />;
    case 'add-log':
      return <AddFuelLog userFuel={userFuel} onCancel={() => setScreen('overview')} onSaved={() => setScreen('history')} />;
    case 'history':
      return <FuelHistory onBack={() => setScreen('overview')} onAddLog={() => setScreen('add-log')} />;
    case 'overview':
    default:
      return (
        <FuelOverview
          userFuel={userFuel}
          onOpenArticle={() => setScreen('article')}
          onAddLog={() => setScreen('add-log')}
          onHistory={() => setScreen('history')}
        />
      );
  }
}
