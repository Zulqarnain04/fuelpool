import { MapPin, Navigation, Navigation2 } from "lucide-react";
import { motion } from "motion/react";

export function MapComponents() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Map Pins Display */}
      <div className="bg-slate-100 p-8 rounded-2xl border border-slate-200 relative overflow-hidden h-64 flex items-center justify-center">
        {/* Faux map background pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#378ADD 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {/* Route Line */}
        <div className="absolute top-1/2 left-1/4 right-1/4 h-1.5 bg-fp-secondary rounded-full -translate-y-1/2 shadow-[0_0_10px_rgba(55,138,221,0.5)]"></div>
        
        {/* Origin Pin */}
        <motion.div 
          initial={{ y: -10 }} 
          animate={{ y: 0 }} 
          transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
          className="absolute left-1/4 -translate-x-1/2 -translate-y-[calc(50%+16px)]"
        >
          <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center shadow-lg border-2 border-white relative z-10">
            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
          </div>
          <div className="w-1 h-4 bg-slate-900 mx-auto -mt-1 relative z-0"></div>
          <div className="w-4 h-1 bg-black/20 rounded-[100%] mx-auto mt-0 blur-[1px]"></div>
          
          <div className="absolute top-0 left-full ml-2 bg-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap whitespace-nowrap flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-fp-secondary"></span> Start
          </div>
        </motion.div>

        {/* Live Car Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <div className="w-10 h-10 bg-white rounded-full shadow-lg border-2 border-fp-secondary flex items-center justify-center relative">
            <div className="absolute inset-0 bg-fp-secondary/20 rounded-full animate-ping"></div>
            <Navigation className="w-5 h-5 text-fp-secondary fill-fp-secondary transform rotate-45" />
          </div>
        </div>

        {/* Dest Pin */}
        <div className="absolute right-1/4 translate-x-1/2 -translate-y-[calc(50%+16px)]">
          <div className="w-8 h-8 bg-fp-danger rounded-full flex items-center justify-center shadow-lg border-2 border-white relative z-10">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div className="w-1 h-4 bg-fp-danger mx-auto -mt-1 relative z-0"></div>
          <div className="w-4 h-1 bg-black/20 rounded-[100%] mx-auto mt-0 blur-[1px]"></div>
          
          <div className="absolute top-0 right-full mr-2 bg-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
            15m
          </div>
        </div>
      </div>

      {/* Floating Action Button & Map Controls */}
      <div className="bg-slate-100 p-8 rounded-2xl border border-slate-200 flex flex-col justify-end relative h-64">
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors">
            <Navigation2 className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4">
          <button className="flex-1 py-3.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
            Set Pickup Spot
          </button>
        </div>
      </div>
    </div>
  );
}