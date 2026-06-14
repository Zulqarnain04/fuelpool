import { TrendingUp, TrendingDown, Leaf, Wallet } from "lucide-react";
import { motion } from "motion/react";

export function StatCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Primary Stat Card */}
      <motion.div whileHover={{ y: -2 }} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-fp-primary-light text-fp-primary flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-600">Total Saved</span>
          </div>
          <span className="text-xs font-bold text-fp-primary bg-fp-primary-light px-2 py-1 rounded-full flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12%
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-900">RM 142.50</span>
          <span className="text-sm text-slate-500 font-medium">this month</span>
        </div>
      </motion.div>

      {/* Eco Stat Card */}
      <motion.div whileHover={{ y: -2 }} className="bg-fp-carpool p-5 rounded-2xl shadow-sm shadow-fp-carpool/20 flex flex-col gap-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
              <Leaf className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-fp-carpool-light">CO2 Prevented</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">45 kg</span>
          <span className="text-sm text-fp-carpool-light font-medium">equivalent</span>
        </div>
      </motion.div>

      {/* Basic Metric */}
      <motion.div whileHover={{ y: -2 }} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center gap-1">
        <span className="text-sm font-medium text-slate-500">Current RON95</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">RM 2.05</span>
          <span className="text-xs font-medium text-fp-warning bg-fp-warning/10 px-2 py-0.5 rounded-full flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Stable
          </span>
        </div>
      </motion.div>
    </div>
  );
}