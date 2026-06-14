import { Activity, BellRing, Droplet, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function FuelCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Price Prediction Card */}
      <motion.div whileHover={{ y: -2 }} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-fp-primary" />
            <h4 className="font-semibold text-slate-800">Price Prediction</h4>
          </div>
          <span className="text-xs font-bold bg-fp-ai-light text-fp-ai px-2.5 py-1 rounded-full flex items-center gap-1">
            AI Powered
          </span>
        </div>
        <div className="p-5 bg-gradient-to-br from-white to-fp-primary-light/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500 font-medium">Expected to rise</p>
              <p className="text-xl font-bold text-slate-900">+ RM 0.05</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 font-medium">Timeline</p>
              <p className="text-lg font-bold text-fp-warning">In 3 Days</p>
            </div>
          </div>
          <button className="w-full py-3 bg-fp-primary text-white font-medium rounded-xl hover:bg-fp-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-fp-primary/20">
            <BellRing className="w-4 h-4" />
            Set Fill-up Reminder
          </button>
        </div>
      </motion.div>

      {/* Fuel Log Card */}
      <motion.div whileHover={{ y: -2 }} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-fp-secondary-light text-fp-secondary flex items-center justify-center">
                <Droplet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">Latest Log</h4>
                <p className="text-xs text-slate-500">Today, 8:45 AM</p>
              </div>
            </div>
            <span className="font-bold text-slate-900">RM 50.00</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Volume</p>
              <p className="font-bold text-slate-800">24.39 L</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Efficiency</p>
              <p className="font-bold text-slate-800">14.2 km/L</p>
            </div>
          </div>
        </div>
        
        <button className="text-sm font-medium text-fp-secondary hover:text-fp-secondary/80 flex items-center gap-1">
          View full history <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}