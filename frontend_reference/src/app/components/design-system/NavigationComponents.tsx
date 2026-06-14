import { Home, Droplet, Users, Leaf, User } from "lucide-react";
import { clsx } from "clsx";

export function NavigationComponents() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      {/* Bottom Nav Simulation */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-500">Bottom Navigation (Mobile)</h4>
        
        <div className="bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl rounded-b-xl overflow-hidden pt-2 pb-4 px-4 flex justify-between items-end relative">
          
          <NavItem icon={Home} label="Home" active={false} color="blue" />
          <NavItem icon={Droplet} label="Fuel" active={true} color="amber" />
          
          {/* FAB Center (Optional Design Pattern) */}
          <div className="relative -top-6">
            <button className="w-14 h-14 bg-fp-primary rounded-full shadow-lg shadow-fp-primary/30 flex items-center justify-center text-white border-4 border-white hover:scale-105 transition-transform">
              <span className="text-2xl font-light mb-1">+</span>
            </button>
          </div>
          
          <NavItem icon={Users} label="Ride" active={false} color="indigo" />
          <NavItem icon={Leaf} label="Eco" active={false} color="emerald" />
          
        </div>
      </div>

      {/* Bottom Sheet Simulation */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-500">Bottom Sheet</h4>
        
        <div className="bg-slate-900 rounded-xl p-4 overflow-hidden relative h-64 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40"></div>
          
          <div className="bg-white rounded-t-3xl p-5 relative z-10 shadow-xl transition-transform transform translate-y-0">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Ride</h3>
            <p className="text-sm text-slate-500 mb-6">You are about to book 1 seat with Amirul. RM 4.50 will be deducted from your wallet.</p>
            
            <div className="flex gap-3">
              <button className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button className="flex-1 py-3 bg-fp-primary text-white font-bold rounded-xl hover:bg-fp-primary/90 shadow-sm shadow-fp-primary/20 transition-colors">
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, color }: any) {
  const colorMap: Record<string, { activeBg: string; activeText: string }> = {
    amber: { activeBg: "bg-amber-100", activeText: "text-amber-600" },
    blue: { activeBg: "bg-blue-100", activeText: "text-blue-600" },
    indigo: { activeBg: "bg-indigo-100", activeText: "text-indigo-600" },
    emerald: { activeBg: "bg-emerald-100", activeText: "text-emerald-600" },
  };

  const { activeBg, activeText } = colorMap[color] || colorMap.blue;

  return (
    <div className="flex flex-col items-center justify-center w-14 gap-1 cursor-pointer">
      <div className={clsx(
        "p-2 rounded-xl transition-colors relative flex items-center justify-center",
        active ? `${activeBg} ${activeText}` : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      )}>
        {active && <Icon className="w-6 h-6 fill-current opacity-20 absolute" />}
        <Icon className="w-6 h-6 relative z-10" />
      </div>
      <span className={clsx(
        "text-[10px] font-semibold transition-colors",
        active ? activeText : "text-slate-400"
      )}>{label}</span>
    </div>
  );
}