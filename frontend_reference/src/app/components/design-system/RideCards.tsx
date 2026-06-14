import { MapPin, Clock, Users, ArrowRight, Star, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

export function RideCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Available Ride Card */}
      <motion.div whileHover={{ y: -2 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden relative border-2 border-white shadow-sm">
              <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=100" alt="Driver" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h4 className="font-bold text-slate-900 text-sm">Amirul</h4>
                <ShieldCheck className="w-3.5 h-3.5 text-fp-primary" />
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> 4.9 (120 rides)
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="block font-bold text-lg text-slate-900">RM 4.50</span>
            <span className="text-[10px] uppercase font-bold text-fp-primary bg-fp-primary-light px-2 py-0.5 rounded-sm">2 Seats left</span>
          </div>
        </div>
        
        <div className="p-4">
          <div className="relative pl-6 pb-4">
            <div className="absolute left-2 top-1.5 bottom-0 w-0.5 bg-slate-200"></div>
            <div className="absolute left-[5px] top-1.5 w-2 h-2 rounded-full bg-fp-secondary"></div>
            <p className="text-sm font-semibold text-slate-800">Sunway University</p>
            <p className="text-xs text-slate-500 mt-0.5">08:00 AM</p>
          </div>
          <div className="relative pl-6">
            <div className="absolute left-[5px] top-1.5 w-2 h-2 rounded-full border-2 border-fp-danger bg-white z-10"></div>
            <p className="text-sm font-semibold text-slate-800">Mid Valley Megamall</p>
            <p className="text-xs text-slate-500 mt-0.5">08:45 AM (Est)</p>
          </div>
        </div>

        <div className="px-4 pb-4">
          <button className="w-full py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            Request Seat
          </button>
        </div>
      </motion.div>

      {/* Active Route Card (Driver View) */}
      <motion.div whileHover={{ y: -2 }} className="bg-fp-secondary rounded-2xl border border-fp-secondary shadow-sm shadow-fp-secondary/20 overflow-hidden text-white flex flex-col justify-between">
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Departing in 15m</span>
            </div>
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full border-2 border-fp-secondary bg-fp-primary flex items-center justify-center text-[10px] font-bold z-10 text-white">A</div>
              <div className="w-7 h-7 rounded-full border-2 border-fp-secondary bg-slate-200 overflow-hidden z-0">
                <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100" alt="Passenger" />
              </div>
            </div>
          </div>
          
          <h3 className="font-bold text-xl mb-1">Campus Route</h3>
          <p className="text-fp-secondary-light text-sm flex items-center gap-1.5">
            <Users className="w-4 h-4" /> 2 Passengers matching
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md p-4 flex items-center justify-between border-t border-white/10">
          <div>
            <p className="text-xs text-fp-secondary-light font-medium uppercase tracking-wider mb-0.5">Potential Earnings</p>
            <p className="font-bold text-lg">RM 9.00</p>
          </div>
          <button className="px-4 py-2 bg-white text-fp-secondary font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            View Route <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}