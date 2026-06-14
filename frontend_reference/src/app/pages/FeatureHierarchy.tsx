import { motion } from "motion/react";
import { Droplet, Users, Leaf, Activity, TrendingUp, Cpu, Receipt, Share2, MapPin, Compass, RotateCcw, Award, Globe, LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function FeatureHierarchy() {
  const systems = [
    {
      level: "L1",
      title: "Fuel Intelligence",
      icon: Droplet,
      colorClasses: {
        bg100: "bg-amber-100",
        text600: "text-amber-600",
        bg200: "bg-amber-200",
        text800: "text-amber-800",
        bg500: "bg-amber-500",
        groupHoverBg50: "group-hover:bg-amber-50",
        groupHoverText500: "group-hover:text-amber-500"
      },
      features: [
        { name: "Fuel price tracking", icon: Activity, desc: "Real-time updates on RON95/RON97 prices in Malaysia." },
        { name: "Price prediction", icon: TrendingUp, desc: "Forecast upcoming price changes to help users decide when to fill up." },
        { name: "AI recommendations", icon: Cpu, desc: "Smart notifications: 'Fill up today to save RM5 based on predicted hikes'." },
        { name: "Fuel logging", icon: Receipt, desc: "OCR receipt scanning and manual entry to track actual expenses." },
      ]
    },
    {
      level: "L2",
      title: "Seat Optimizer",
      icon: Users,
      colorClasses: {
        bg100: "bg-indigo-100",
        text600: "text-indigo-600",
        bg200: "bg-indigo-200",
        text800: "text-indigo-800",
        bg500: "bg-indigo-500",
        groupHoverBg50: "group-hover:bg-indigo-50",
        groupHoverText500: "group-hover:text-indigo-500"
      },
      features: [
        { name: "Carpool matching", icon: Share2, desc: "Algorithmic matching of drivers with passengers sharing similar routes." },
        { name: "Ride posting", icon: MapPin, desc: "Drivers publish upcoming trips with available seats and pickup points." },
        { name: "Route optimization", icon: Compass, desc: "Calculates the most efficient pickup sequence with minimal detours." },
        { name: "Routine commute matching", icon: RotateCcw, desc: "Set and forget recurring weekly trips (e.g., Office to Home)." },
      ]
    },
    {
      level: "L3",
      title: "EcoTrack",
      icon: Leaf,
      colorClasses: {
        bg100: "bg-emerald-100",
        text600: "text-emerald-600",
        bg200: "bg-emerald-200",
        text800: "text-emerald-800",
        bg500: "bg-emerald-500",
        groupHoverBg50: "group-hover:bg-emerald-50",
        groupHoverText500: "group-hover:text-emerald-500"
      },
      features: [
        { name: "Carbon reduction tracking", icon: Globe, desc: "Calculates CO2 emissions avoided by sharing rides instead of solo driving." },
        { name: "Savings tracking", icon: LineChart, desc: "Quantifies money saved on fuel, tolls, and maintenance." },
        { name: "Community impact", icon: Users, desc: "University or corporate leaderboards showing collective eco-impact." },
        { name: "Gamified sustainability metrics", icon: Award, desc: "Unlockable badges, streaks, and ranks for consistent green behavior." },
      ]
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-slate-900">Feature Hierarchy</h1>
        <p className="text-slate-500 mt-2">The three connected systems that power the FuelPool experience.</p>
      </motion.div>

      <div className="space-y-12">
        {systems.map((sys, idx) => (
          <motion.div
            key={sys.level}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.15 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`flex items-center justify-center w-14 h-14 rounded-2xl ${sys.colorClasses.bg100} ${sys.colorClasses.text600} shadow-sm`}>
                <sys.icon className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${sys.colorClasses.bg200} ${sys.colorClasses.text800}`}>
                    {sys.level}
                  </span>
                  <h2 className="text-2xl font-bold text-slate-800">{sys.title}</h2>
                </div>
                <div className="h-1 w-20 bg-slate-200 mt-2 rounded-full overflow-hidden">
                  <div className={`h-full ${sys.colorClasses.bg500} w-full`} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sys.features.map((feat, fIdx) => (
                <Card key={fIdx} className="border-none shadow-sm hover:shadow-md transition-all group bg-white">
                  <CardHeader className="pb-2">
                    <div className={`p-2 w-10 h-10 rounded-lg bg-slate-50 ${sys.colorClasses.groupHoverBg50} transition-colors mb-2 flex items-center justify-center`}>
                      <feat.icon className={`w-5 h-5 text-slate-400 ${sys.colorClasses.groupHoverText500}`} />
                    </div>
                    <CardTitle className="text-md leading-tight">{feat.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500">{feat.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}