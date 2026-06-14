import { createBrowserRouter } from "react-router";
import { Layout } from "./layout";
import { NavigationMap } from "./pages/NavigationMap";
import { FeatureHierarchy } from "./pages/FeatureHierarchy";
import { UserFlows } from "./pages/UserFlows";
import { UserJourneys } from "./pages/UserJourneys";
import { DesignSystem } from "./pages/DesignSystem";
import { OnboardingScreens } from "./pages/OnboardingScreens";
import { HomeDashboard } from "./pages/HomeDashboard";
import { FuelIntelligence } from "./pages/FuelIntelligence";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: NavigationMap },
      { path: "dashboard", Component: HomeDashboard },
      { path: "fuel", Component: FuelIntelligence },
      { path: "hierarchy", Component: FeatureHierarchy },
      { path: "flows", Component: UserFlows },
      { path: "journeys", Component: UserJourneys },
      { path: "design-system", Component: DesignSystem },
      { path: "onboarding", Component: OnboardingScreens },
    ],
  },
]);