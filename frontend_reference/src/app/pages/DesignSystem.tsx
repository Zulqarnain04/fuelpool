import { motion } from "motion/react";
import { 
  FuelCards, 
  RideCards, 
  StatCards, 
  MapComponents, 
  NavigationComponents, 
  AIBadges, 
  Loaders 
} from "../components/design-system";

export function DesignSystem() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-16 bg-fp-bg min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-fp-primary rounded-xl flex items-center justify-center shadow-lg shadow-fp-primary/20">
            <div className="w-4 h-4 bg-white rounded-sm" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">FuelPool Design System</h1>
            <p className="text-slate-500 font-medium">Sustainable • Smart • Practical • Data-driven</p>
          </div>
        </div>
      </motion.div>

      {/* Typography & Colors */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold border-b border-slate-200 pb-2">Typography</h2>
          <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <div className="text-sm font-semibold text-fp-primary mb-1">Display Large (32px / 700)</div>
              <div className="text-4xl font-bold text-slate-900">RM 2.05/L</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-fp-primary mb-1">Heading 1 (24px / 600)</div>
              <div className="text-2xl font-semibold text-slate-900">Today's Overview</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-fp-primary mb-1">Heading 2 (20px / 600)</div>
              <div className="text-xl font-semibold text-slate-900">Upcoming Rides</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-fp-primary mb-1">Body Large (16px / 400)</div>
              <div className="text-base text-slate-600">You saved RM 15.50 this week by sharing rides.</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-fp-primary mb-1">Label (14px / 500)</div>
              <div className="text-sm font-medium text-slate-700">Departure Time</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-fp-primary mb-1">Caption (12px / 400)</div>
              <div className="text-xs text-slate-500">Based on RON95 prices</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold border-b border-slate-200 pb-2">Color Tokens</h2>
          <div className="grid grid-cols-2 gap-4">
            <ColorSwatch name="Primary Green" hex="#1D9E75" bgClass="bg-fp-primary" textClass="text-white" />
            <ColorSwatch name="Primary Light" hex="#E1F5EE" bgClass="bg-fp-primary-light" textClass="text-fp-primary" />
            <ColorSwatch name="Secondary Blue" hex="#378ADD" bgClass="bg-fp-secondary" textClass="text-white" />
            <ColorSwatch name="Secondary Light" hex="#E6F1FB" bgClass="bg-fp-secondary-light" textClass="text-fp-secondary" />
            <ColorSwatch name="Carpool Teal" hex="#0F6E56" bgClass="bg-fp-carpool" textClass="text-white" />
            <ColorSwatch name="Carpool Light" hex="#9FE1CB" bgClass="bg-fp-carpool-light" textClass="text-fp-carpool" />
            <ColorSwatch name="AI Purple" hex="#534AB7" bgClass="bg-fp-ai" textClass="text-white" />
            <ColorSwatch name="AI Light" hex="#EEEDFE" bgClass="bg-fp-ai-light" textClass="text-fp-ai" />
            <ColorSwatch name="Warning" hex="#BA7517" bgClass="bg-fp-warning" textClass="text-white" />
            <ColorSwatch name="Danger" hex="#E24B4A" bgClass="bg-fp-danger" textClass="text-white" />
          </div>
        </div>
      </section>

      {/* Grid & Spacing */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold border-b border-slate-200 pb-2">Spacing & Grid System</h2>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-wrap gap-4 items-end">
            <SpacingBox size="4" pixels="16px" label="Base" />
            <SpacingBox size="2" pixels="8px" label="xs" />
            <SpacingBox size="3" pixels="12px" label="sm" />
            <SpacingBox size="6" pixels="24px" label="md" />
            <SpacingBox size="8" pixels="32px" label="lg" />
            <SpacingBox size="12" pixels="48px" label="xl" />
          </div>
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div className="h-16 bg-fp-primary-light rounded-lg flex items-center justify-center text-fp-primary text-sm font-medium">Col 1</div>
            <div className="h-16 bg-fp-primary-light rounded-lg flex items-center justify-center text-fp-primary text-sm font-medium">Col 2</div>
            <div className="h-16 bg-fp-primary-light rounded-lg flex items-center justify-center text-fp-primary text-sm font-medium">Col 3</div>
            <div className="h-16 bg-fp-primary-light rounded-lg flex items-center justify-center text-fp-primary text-sm font-medium">Col 4</div>
          </div>
        </div>
      </section>

      {/* Core Components */}
      <section className="space-y-12">
        <h2 className="text-3xl font-bold text-slate-900">Component Library</h2>
        
        <div className="space-y-8">
          <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-fp-primary text-white flex items-center justify-center text-sm">1</span>
            Data & Stat Cards
          </h3>
          <StatCards />
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-fp-secondary text-white flex items-center justify-center text-sm">2</span>
            Fuel Intelligence (L1)
          </h3>
          <FuelCards />
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-fp-carpool text-white flex items-center justify-center text-sm">3</span>
            Seat Optimizer & Rides (L2)
          </h3>
          <RideCards />
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-fp-ai text-white flex items-center justify-center text-sm">4</span>
            Chips & AI Badges
          </h3>
          <AIBadges />
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm">5</span>
            Map Elements
          </h3>
          <MapComponents />
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm">6</span>
            Skeleton Loaders
          </h3>
          <Loaders />
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm">7</span>
            Navigation & Overlays
          </h3>
          <NavigationComponents />
        </div>
      </section>
    </div>
  );
}

function ColorSwatch({ name, hex, bgClass, textClass }: { name: string, hex: string, bgClass: string, textClass: string }) {
  return (
    <div className={`p-4 rounded-xl flex flex-col justify-between h-24 shadow-sm ${bgClass} ${textClass}`}>
      <span className="font-semibold text-sm">{name}</span>
      <span className="font-mono text-xs opacity-90">{hex}</span>
    </div>
  );
}

function SpacingBox({ size, pixels, label }: { size: string, pixels: string, label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-${size} h-${size} bg-fp-primary/20 rounded border border-fp-primary/30`} />
      <div className="text-center">
        <div className="text-xs font-bold text-slate-700">{label}</div>
        <div className="text-[10px] text-slate-400 font-mono">{pixels}</div>
      </div>
    </div>
  );
}