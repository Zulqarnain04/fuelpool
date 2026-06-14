import { motion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Home, Droplet, Users, Leaf, User, Target, ChevronRight, Zap } from "lucide-react";

export function NavigationMap() {
  const tabs = [
    {
      name: "Dashboard",
      icon: Home,
      color: "text-blue-500",
      bgColor: "bg-blue-100",
      description: "Overview of fuel savings, upcoming rides, and daily summary.",
      screens: ["Home Feed", "Quick Actions", "Daily Commute Status"]
    },
    {
      name: "Ride (L2)",
      icon: Users,
      color: "text-indigo-500",
      bgColor: "bg-indigo-100",
      description: "Seat Optimizer: Carpool matching and commute management.",
      screens: ["Find Ride", "Offer Ride", "My Routes", "Match Requests"]
    },
    {
      name: "Fuel (L1)",
      icon: Droplet,
      color: "text-amber-500",
      bgColor: "bg-amber-100",
      description: "Fuel Intelligence: Price tracking and logging.",
      screens: ["Current Prices", "Price Predictions", "Log Receipt", "Spending Analytics"]
    },
    {
      name: "Eco (L3)",
      icon: Leaf,
      color: "text-emerald-500",
      bgColor: "bg-emerald-100",
      description: "EcoTrack: Carbon reduction and gamification.",
      screens: ["My Impact", "Community Leaderboard", "Badges & Rewards"]
    },
    {
      name: "Profile",
      icon: User,
      color: "text-slate-500",
      bgColor: "bg-slate-100",
      description: "Settings, vehicles, and BUDI95 verification.",
      screens: ["Personal Info", "Vehicles Setup", "BUDI95 Status", "App Settings"]
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-slate-900">Navigation Map</h1>
        <p className="text-slate-500 mt-2">Core bottom navigation structure and target audience for FuelPool.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-1 lg:col-span-2 space-y-4"
        >
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            Main Tab Structure
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {tabs.map((tab, idx) => (
              <Card key={idx} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3 border-b border-slate-50 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tab.bgColor}`}>
                      <tab.icon className={`w-5 h-5 ${tab.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tab.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <CardDescription className="mb-4">{tab.description}</CardDescription>
                  <ul className="space-y-2">
                    {tab.screens.map((screen, sIdx) => (
                      <li key={sIdx} className="flex items-center text-sm text-slate-700">
                        <ChevronRight className="w-4 h-4 text-slate-300 mr-2" />
                        {screen}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-1 space-y-4"
        >
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-500" />
            Target Audience
          </h2>
          <Card className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white border-none">
            <CardContent className="pt-6">
              <ul className="space-y-4">
                {[
                  "Malaysian university students",
                  "Daily commuters",
                  "Budget-conscious drivers",
                  "BUDI95 users",
                  "Carpool users"
                ].map((audience, idx) => (
                  <li key={idx} className="flex items-start gap-3 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                    <Users className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
                    <span className="font-medium text-emerald-50">{audience}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}