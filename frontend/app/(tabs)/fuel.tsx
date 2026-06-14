// app/(tabs)/fuel.tsx — Fuel Intelligence (L1) container.
// Sub-screens are switched via internal state (not Expo Router) since they're
// closely-related views within the same tab.
import React, { useEffect, useState } from 'react';
import { vehicleApi } from '../../src/services/api';
import type { FuelType, Vehicle } from '../../src/services/api';
import FuelOverview from '../../src/components/fuel/FuelOverview';
import MofArticleScreen from '../../src/components/fuel/MofArticleScreen';
import AddFuelLogBottomSheet from '../../src/components/fuel/AddFuelLogBottomSheet';
import FuelHistory from '../../src/components/fuel/FuelHistory';
import ErrorBoundary from '../../src/components/common/ErrorBoundary';

type SubScreen = 'overview' | 'article' | 'history';

export default function FuelTab() {
  const [screen, setScreen] = useState<SubScreen>('overview');
  const [userFuel, setUserFuel] = useState<FuelType>('RON95_MARKET');
  const [addLogOpen, setAddLogOpen] = useState(false);

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

  let body: React.ReactNode;
  switch (screen) {
    case 'article':
      body = <MofArticleScreen onBack={() => setScreen('overview')} />;
      break;
    case 'history':
      body = <FuelHistory onBack={() => setScreen('overview')} onAddLog={() => setAddLogOpen(true)} />;
      break;
    case 'overview':
    default:
      body = (
        <FuelOverview
          userFuel={userFuel}
          onOpenArticle={() => setScreen('article')}
          onAddLog={() => setAddLogOpen(true)}
          onHistory={() => setScreen('history')}
        />
      );
  }

  return (
    <ErrorBoundary>
      {body}
      <AddFuelLogBottomSheet
        visible={addLogOpen}
        userFuel={userFuel}
        onClose={() => setAddLogOpen(false)}
        onSaved={() => {
          setAddLogOpen(false);
          setScreen('history');
        }}
      />
    </ErrorBoundary>
  );
}
