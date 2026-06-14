import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Droplet, Users, Leaf, ArrowRightCircle } from "lucide-react";
import { clsx } from "clsx";

export function UserJourneys() {
  const journeys = [
    {
      id: "onboard", title: "New User Onboarding", category: "Core", icon: Users,
      steps: ["Open app", "Verify OTP", "Enter Name & Uni", "Add Car Details", "Enter Home/Campus Route", "Go to Dashboard"]
    },
    {
      id: "veh_setup", title: "Vehicle Setup", category: "Core", icon: Users,
      steps: ["Navigate to Profile", "Tap 'My Vehicles'", "Tap 'Add Vehicle'", "Select Make & Model", "Enter Plate & Capacity", "Save"]
    },
    {
      id: "route_setup", title: "Route Setup", category: "L2", icon: Users,
      steps: ["Navigate to Profile", "Tap 'Saved Routes'", "Add New Route", "Pick Origin on Map", "Pick Dest on Map", "Set Days/Time", "Save"]
    },
    {
      id: "log_fuel", title: "Log Fuel Purchase", category: "L1", icon: Droplet,
      steps: ["Open Fuel Tab", "Tap '+' FAB", "Scan Receipt (OCR)", "Verify Liters & RM", "Select Payment Method", "Save Log", "View updated stats"]
    },
    {
      id: "predictions", title: "Check Fuel Predictions", category: "L1", icon: Droplet,
      steps: ["Open Fuel Tab", "Scroll to 'Forecast'", "Read AI suggestion", "Tap 'Set Reminder'", "Receive push notification day before hike"]
    },
    {
      id: "find_ride", title: "Find a Ride", category: "L2", icon: Users,
      steps: ["Open Ride Tab", "Search Dest/Origin", "Filter by Time/Price", "View Driver Profile", "Tap 'Request Seat'", "Wait for Driver Approval", "Ride Confirmed"]
    },
    {
      id: "post_ride", title: "Post a Ride", category: "L2", icon: Users,
      steps: ["Open Ride Tab", "Tap 'Offer Ride'", "Select Saved Route", "Set Departure Time", "Set Available Seats", "Post Ride", "Accept Incoming Requests"]
    },
    {
      id: "join_ride", title: "Join a Ride", category: "L2", icon: Users,
      steps: ["Receive Ride Invite or Find Ride", "Review Driver & Passengers", "Accept/Request", "Chat internally for pickup exact spot", "Complete Ride", "Review"]
    },
    {
      id: "track_carbon", title: "Track Carbon Savings", category: "L3", icon: Leaf,
      steps: ["Open Eco Tab", "View CO2 saved metric", "View Monthly Trend Graph", "See equivalent trees planted", "Tap 'Share to Story'"]
    },
    {
      id: "leaderboard", title: "View Community Leaderboard", category: "L3", icon: Leaf,
      steps: ["Open Eco Tab", "Swipe to 'Community'", "Select University/Company", "View Top Rankers", "See own position", "Poke friends"]
    }
  ];

  const [activeTab, setActiveTab] = useState("All");
  const filteredJourneys = activeTab === "All" ? journeys : journeys.filter(j => j.category === activeTab);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Journeys</h1>
          <p className="text-slate-500 mt-2">Step-by-step breakdown of 10 core interactions.</p>
        </div>

        <div className="flex bg-slate-200/50 p-1 rounded-xl">
          {["All", "Core", "L1", "L2", "L3"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {filteredJourneys.map((journey, idx) => {
            const isL1 = journey.category === "L1";
            const isL2 = journey.category === "L2";
            const isL3 = journey.category === "L3";
            const iconColor = isL1 ? "text-amber-500 bg-amber-100" : isL2 ? "text-indigo-500 bg-indigo-100" : isL3 ? "text-emerald-500 bg-emerald-100" : "text-slate-500 bg-slate-100";
            
            return (
              <motion.div
                layout
                key={journey.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${iconColor}`}>
                    <journey.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{journey.title}</h3>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{journey.category} Flow</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {journey.steps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-3">
                      <div className="mt-0.5 relative flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold z-10">
                          {sIdx + 1}
                        </div>
                        {sIdx !== journey.steps.length - 1 && (
                          <div className="absolute top-5 bottom-[-16px] w-[1px] bg-slate-100" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{step}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}