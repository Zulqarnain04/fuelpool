import { Cpu, Leaf, Droplet, TrendingUp, ShieldCheck, Zap } from "lucide-react";

export function AIBadges() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
        {/* AI Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fp-ai-light text-fp-ai border border-fp-ai/20 shadow-[0_0_10px_rgba(83,74,183,0.1)]">
          <Cpu className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">AI Powered</span>
        </div>

        {/* Eco Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fp-carpool-light/30 text-fp-carpool border border-fp-carpool/20">
          <Leaf className="w-4 h-4" />
          <span className="text-xs font-bold">Eco Route</span>
        </div>

        {/* Prediction Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fp-warning/10 text-fp-warning border border-fp-warning/20">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-bold">High Demand</span>
        </div>

        {/* Verified Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fp-secondary-light text-fp-secondary border border-fp-secondary/20">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-bold">BUDI95 Verified</span>
        </div>

        {/* Fuel Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fp-primary-light text-fp-primary border border-fp-primary/20">
          <Droplet className="w-4 h-4" />
          <span className="text-xs font-bold">RON95</span>
        </div>
      </div>

      <div className="p-6 bg-slate-900 rounded-2xl shadow-sm space-y-4">
        <h4 className="text-sm font-semibold text-slate-400 mb-2">Dark Mode Variants</h4>
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fp-ai/20 text-fp-ai-light border border-fp-ai/30 shadow-[0_0_15px_rgba(83,74,183,0.2)]">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold">Smart Match</span>
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white border border-white/20">
            <span className="w-2 h-2 rounded-full bg-fp-primary animate-pulse"></span>
            <span className="text-xs font-bold">Live Price</span>
          </div>
        </div>
      </div>
    </div>
  );
}