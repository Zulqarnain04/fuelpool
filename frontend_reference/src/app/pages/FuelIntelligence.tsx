import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import {
  Droplet, Cpu, Wifi, Battery, TrendingUp, TrendingDown,
  ArrowLeft, Clock, MapPin, ChevronRight, Star,
  AlertTriangle, RefreshCw, FileText, Zap, CheckCircle2,
  Home, Users, Leaf, CircleAlert, WifiOff, Filter,
  Wallet, ShieldCheck, ArrowRight, Bell, Plus,
  ChevronDown, Edit3, BarChart2, Fuel as FuelIcon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = "overview" | "article" | "add-log" | "history";
type PageState = "default" | "loading" | "empty" | "error";

// ─── Data ─────────────────────────────────────────────────────────────────────

const PRICE_HISTORY = [
  { week: "Mar 15", price: 2.00, predicted: false },
  { week: "Mar 22", price: 2.00, predicted: false },
  { week: "Mar 29", price: 2.05, predicted: false },
  { week: "Apr 5",  price: 2.05, predicted: false },
  { week: "Apr 12", price: 2.05, predicted: false },
  { week: "Apr 19", price: 2.00, predicted: false },
  { week: "Apr 26", price: 2.00, predicted: false },
  { week: "May 3",  price: 2.05, predicted: false },
  { week: "May 10", price: 2.05, predicted: false },
  { week: "May 17", price: 2.10, predicted: false },
  { week: "May 24", price: 2.05, predicted: false },
  { week: "Jun 1",  price: 2.05, predicted: false },
  { week: "Jun 13", price: 2.05, predicted: false },
  { week: "Jun 20", price: 2.10, predicted: true },
  { week: "Jun 27", price: 2.15, predicted: true },
];

const FUEL_TYPES = [
  { id: "ron95",  label: "RON95",  price: "2.05", delta: "Stable",  up: null,  subsidised: true,  colorCls: "text-fp-primary",   bgCls: "bg-fp-primary-light",   borderCls: "border-fp-primary/30" },
  { id: "ron97",  label: "RON97",  price: "3.47", delta: "+RM 0.05", up: true,  subsidised: false, colorCls: "text-fp-warning",   bgCls: "bg-fp-warning/10",     borderCls: "border-fp-warning/30" },
  { id: "diesel", label: "Diesel", price: "2.15", delta: "Stable",  up: null,  subsidised: true,  colorCls: "text-fp-secondary", bgCls: "bg-fp-secondary-light", borderCls: "border-fp-secondary/30" },
  { id: "ron100", label: "RON100", price: "4.10", delta: "+RM 0.10", up: true,  subsidised: false, colorCls: "text-fp-ai",        bgCls: "bg-fp-ai-light",       borderCls: "border-fp-ai/30" },
];

const FUEL_LOGS = [
  { id: 1, date: "Jun 13", time: "8:45 AM", type: "RON95", amount: 50.00, volume: 24.39, ppl: 2.05, odometer: 52840, eff: 14.2, station: "BHPetrol Skudai", effDelta: 0.4 },
  { id: 2, date: "Jun 10", time: "7:30 AM", type: "RON95", amount: 30.00, volume: 14.63, ppl: 2.05, odometer: 52633, eff: 13.8, station: "Petronas Larkin", effDelta: -0.4 },
  { id: 3, date: "Jun 6",  time: "5:15 PM", type: "RON95", amount: 50.00, volume: 24.39, ppl: 2.05, odometer: 52431, eff: 15.1, station: "Shell Taman Universiti", effDelta: 1.3 },
  { id: 4, date: "Jun 1",  time: "9:00 AM", type: "RON95", amount: 40.00, volume: 19.51, ppl: 2.05, odometer: 52063, eff: 13.5, station: "BHPetrol Skudai", effDelta: -1.3 },
  { id: 5, date: "May 28", time: "6:45 PM", type: "RON95", amount: 50.00, volume: 24.39, ppl: 2.05, odometer: 51800, eff: 14.7, station: "Petronas Larkin", effDelta: 0.5 },
];

const MONTHLY_SPEND = [
  { month: "Jan", amount: 155 },
  { month: "Feb", amount: 140 },
  { month: "Mar", amount: 170 },
  { month: "Apr", amount: 135 },
  { month: "May", amount: 210 },
  { month: "Jun", amount: 170 },
];

// ─── Chart math ───────────────────────────────────────────────────────────────

const SVG_W = 320, SVG_H = 116;
const PL = 8, PR = 8, PT = 10, PB = 28;
const CW = SVG_W - PL - PR, CH = SVG_H - PT - PB;
const MIN_P = 1.95, MAX_P = 2.20;
const pToY = (p: number) => PT + CH - ((p - MIN_P) / (MAX_P - MIN_P)) * CH;
const iToX = (i: number) => PL + (i / (PRICE_HISTORY.length - 1)) * CW;

// ─── Shared primitives ────────────────────────────────────────────────────────

function AiBadge({ label = "AI" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-fp-ai-light text-fp-ai border border-fp-ai/20 text-[9px] font-bold uppercase tracking-wider shadow-[0_0_6px_rgba(83,74,183,0.1)]">
      <Cpu className="w-2 h-2" />{label}
    </span>
  );
}

function StatusBar({ light = false }: { light?: boolean }) {
  return (
    <div className={clsx("absolute top-0 inset-x-0 h-11 z-50 flex justify-between items-end px-6 pb-1.5 text-[12px] font-bold pointer-events-none", light ? "text-white" : "text-slate-900")}>
      <span>9:41</span>
      <div className="flex gap-1.5 items-center"><Wifi className="w-3.5 h-3.5" /><Battery className="w-3.5 h-3.5" /></div>
    </div>
  );
}

function DynamicIsland() {
  return <div className="absolute top-0 inset-x-0 w-[120px] h-7 bg-slate-900 mx-auto rounded-b-3xl z-50 pointer-events-none" />;
}

function FuelBottomNav() {
  return (
    <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] pb-4 pt-2 px-2 z-40 flex justify-around">
      {([["home", Home, "Home"], ["fuel", Droplet, "Fuel"], ["ride", Users, "Ride"], ["eco", Leaf, "Eco"]] as const).map(([id, Icon, label]) => (
        <button key={id} className={clsx("flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl", id === "fuel" ? "text-fp-primary" : "text-slate-400")}>
          <Icon className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        </button>
      ))}
    </div>
  );
}

function Bone({ className }: { className?: string }) {
  return <div className={clsx("bg-slate-200 rounded-xl animate-pulse", className)} />;
}

function SubScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pt-12 pb-3 bg-white border-b border-slate-100 shrink-0">
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <span className="text-base font-bold text-slate-900">{title}</span>
      </div>
      {right}
    </div>
  );
}

// ─── Price Trend SVG Chart ─────────────────────────────────────────────────────

function PriceTrendSVGChart() {
  const [hovered, setHovered] = useState<number | null>(null);

  const pts = PRICE_HISTORY.map((d, i) => ({ ...d, x: iToX(i), y: pToY(d.price) }));
  const histPts = pts.filter(p => !p.predicted);
  const predPts = pts.filter(p => p.predicted);
  const lastH = histPts[histPts.length - 1];
  const bot = PT + CH;

  const histPath = histPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = histPath + ` L${lastH.x.toFixed(1)},${bot} L${PL},${bot} Z`;
  const predPath = [lastH, ...predPts].map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const xLabels = [{ i: 0, t: "Mar" }, { i: 4, t: "Apr" }, { i: 8, t: "May" }];
  const gridPrices = [2.00, 2.05, 2.10];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: SVG_H }}>
        <defs>
          <linearGradient id="fi-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1D9E75" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridPrices.map(p => (
          <g key={p}>
            <line x1={PL} y1={pToY(p)} x2={SVG_W - PR} y2={pToY(p)} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={PL + 3} y={pToY(p) - 2} fontSize={7} fill="#cbd5e1" fontWeight={500}>RM {p.toFixed(2)}</text>
          </g>
        ))}

        {/* Today divider */}
        <line x1={lastH.x} y1={PT} x2={lastH.x} y2={bot} stroke="#1D9E75" strokeWidth={0.8} strokeDasharray="2,2" opacity={0.4} />

        {/* Predicted zone label */}
        <text x={(lastH.x + iToX(PRICE_HISTORY.length - 1)) / 2} y={PT + 8} textAnchor="middle" fontSize={7} fill="#BA7517" fontWeight={600} opacity={0.7}>Predicted</text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#fi-area)" />

        {/* Historical line */}
        <path d={histPath} fill="none" stroke="#1D9E75" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Predicted line */}
        <path d={predPath} fill="none" stroke="#BA7517" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" />

        {/* Historical dots */}
        {histPts.map((p, i) => (
          <circle
            key={i} cx={p.x} cy={p.y}
            r={hovered === i ? 5 : i === histPts.length - 1 ? 4 : 2.5}
            fill={i === histPts.length - 1 ? "#1D9E75" : "white"}
            stroke="#1D9E75" strokeWidth={1.5}
            className="cursor-pointer"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}

        {/* Predicted dots */}
        {predPts.map((p, pi) => (
          <circle key={`pr-${pi}`} cx={p.x} cy={p.y} r={2.5} fill="white" stroke="#BA7517" strokeWidth={1.5} />
        ))}

        {/* X labels */}
        {xLabels.map(({ i, t }) => (
          <text key={t} x={iToX(i)} y={SVG_H - 8} textAnchor="middle" fontSize={8} fill="#94a3b8" fontWeight={500}>{t}</text>
        ))}
        <text x={lastH.x} y={SVG_H - 8} textAnchor="middle" fontSize={8} fill="#1D9E75" fontWeight={700}>Now</text>
      </svg>

      {hovered !== null && (
        <div
          className="absolute pointer-events-none bg-slate-900 text-white rounded-lg px-2 py-1 text-[10px] font-bold -translate-x-1/2 -translate-y-full z-10 whitespace-nowrap"
          style={{ left: `${(histPts[hovered].x / SVG_W) * 100}%`, top: `${((histPts[hovered].y - 6) / SVG_H) * 100}%` }}
        >
          RM {histPts[hovered].price.toFixed(2)} · {histPts[hovered].week}
        </div>
      )}
    </div>
  );
}

// ─── Monthly Spend SVG Chart ──────────────────────────────────────────────────

function MonthlySpendSVGChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const W2 = 320, H2 = 72;
  const max = Math.max(...MONTHLY_SPEND.map(d => d.amount));
  const barW = 30;
  const gap = (W2 - barW * MONTHLY_SPEND.length) / (MONTHLY_SPEND.length + 1);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W2} ${H2 + 18}`} className="w-full" style={{ height: H2 + 18 }}>
        {MONTHLY_SPEND.map((d, i) => {
          const bh = Math.max(4, (d.amount / max) * H2);
          const x = gap + i * (barW + gap);
          const y = H2 - bh;
          const isCurrent = i === MONTHLY_SPEND.length - 1;
          const isHigh = i === 4; // May peak
          return (
            <g key={d.month} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
              <rect x={x} y={y} width={barW} height={bh} rx={5}
                fill={isCurrent ? "#1D9E75" : isHigh ? "#E24B4A" : hovered === i ? "#0F6E56" : "#BBE9D6"} />
              <text x={x + barW / 2} y={H2 + 13} textAnchor="middle" fontSize={9} fontWeight={600}
                fill={isCurrent ? "#1D9E75" : "#94a3b8"}>{d.month}</text>
            </g>
          );
        })}
      </svg>
      {hovered !== null && (
        <div
          className="absolute pointer-events-none bg-slate-900 text-white rounded-lg px-2 py-1 text-[10px] font-bold -translate-x-1/2 -translate-y-full z-10"
          style={{ left: `${((gap + hovered * (barW + gap) + barW / 2) / W2) * 100}%`, top: `${((H2 - (MONTHLY_SPEND[hovered].amount / max) * H2 - 6) / (H2 + 18)) * 100}%` }}
        >
          RM {MONTHLY_SPEND[hovered].amount}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 1 — FUEL OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════

function FuelOverviewDefault() {
  const [activeFuel, setActiveFuel] = useState("ron95");
  const [period, setPeriod] = useState("3M");
  const fuel = FUEL_TYPES.find(f => f.id === activeFuel) ?? FUEL_TYPES[0];

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-20 pt-11 bg-[#F8F9FA]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-fp-primary-light flex items-center justify-center">
            <Droplet className="w-3.5 h-3.5 text-fp-primary" />
          </div>
          <span className="text-base font-bold text-slate-900">Fuel Intel</span>
          <span className="text-[9px] font-bold bg-fp-primary text-white px-1.5 py-0.5 rounded-sm">L1</span>
        </div>
        <button className="relative">
          <Bell className="w-5 h-5 text-slate-500" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-fp-danger rounded-full border border-white" />
        </button>
      </div>

      {/* Fuel type chips */}
      <div className="flex gap-2 px-4 pt-3 overflow-x-auto pb-1 no-scrollbar">
        {FUEL_TYPES.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFuel(f.id)}
            className={clsx(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
              activeFuel === f.id
                ? clsx("text-white border-transparent shadow-md", f.id === "ron95" ? "bg-fp-primary" : f.id === "ron97" ? "bg-fp-warning" : f.id === "diesel" ? "bg-fp-secondary" : "bg-fp-ai")
                : "bg-white text-slate-600 border-slate-200"
            )}
          >
            {f.label}
            {f.subsidised && <span className="ml-1 text-[8px] opacity-70">★</span>}
          </button>
        ))}
      </div>

      {/* Big price card */}
      <div className="px-4 pt-3">
        <div className={clsx("rounded-2xl p-4 border shadow-sm", fuel.bgCls, fuel.borderCls)}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{fuel.label} · Effective Jun 13</p>
              <div className="flex items-baseline gap-2">
                <span className={clsx("text-4xl font-bold tracking-tight", fuel.colorCls)}>RM {fuel.price}</span>
                <span className="text-sm text-slate-500 font-medium">/ litre</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                {fuel.up === null ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Stable this week
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-fp-warning bg-fp-warning/10 border border-fp-warning/20 px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-2.5 h-2.5" /> {fuel.delta} this week
                  </span>
                )}
                {fuel.subsidised && (
                  <span className="text-[9px] font-bold text-fp-primary bg-fp-primary-light px-1.5 py-0.5 rounded-sm border border-fp-primary/20">BUDI95</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-medium">Full tank (42L)</p>
              <p className={clsx("text-lg font-bold", fuel.colorCls)}>RM {(parseFloat(fuel.price) * 42).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation banner */}
      <div className="px-4 pt-3">
        <div className="bg-gradient-to-r from-[#1a1040] to-fp-ai rounded-2xl p-3.5 flex items-start gap-2.5 shadow-md shadow-fp-ai/15">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-xs font-bold text-white">AI Recommendation</span>
              <AiBadge label="AI Forecast" />
            </div>
            <p className="text-[11px] text-fp-ai-light/90 leading-relaxed">
              <strong className="text-white">Fill up RON95 before Friday.</strong> Our model predicts a <strong className="text-amber-300">+RM 0.05</strong> increase on Jun 20. Filling 42L now saves you <strong className="text-fp-carpool-light">RM 2.10</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Price trend chart */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">Price Trend</span>
              <AiBadge label="AI Predicted" />
            </div>
            <div className="flex gap-1">
              {["1M", "3M", "6M"].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={clsx("text-[9px] font-bold px-2 py-0.5 rounded-md transition-colors", period === p ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600")}
                >{p}</button>
              ))}
            </div>
          </div>

          <div className="px-2 py-2">
            <PriceTrendSVGChart />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 pb-3">
            <div className="flex items-center gap-1">
              <div className="w-6 h-0.5 bg-fp-primary rounded" />
              <span className="text-[9px] text-slate-400 font-medium">Actual</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width={18} height={4}><line x1={0} y1={2} x2={18} y2={2} stroke="#BA7517" strokeWidth={1.5} strokeDasharray="4,2" /></svg>
              <span className="text-[9px] text-slate-400 font-medium">Predicted</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[9px] text-fp-warning font-bold">↑ RM 2.10 predicted Jun 20</span>
            </div>
          </div>
        </div>
      </div>

      {/* BUDI95 Tracker */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-fp-primary-light flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-fp-primary" />
              </div>
              <span className="text-xs font-bold text-slate-800">BUDI95 Subsidy</span>
            </div>
            <span className="text-[10px] font-bold text-fp-primary bg-fp-primary-light px-2 py-0.5 rounded-full">B40 Group</span>
          </div>

          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] text-slate-500 font-medium">Monthly quota used</span>
            <span className="text-[10px] font-bold text-slate-800">62L / 100L</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "62%" }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
              className="h-full bg-gradient-to-r from-fp-primary to-fp-carpool rounded-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-slate-900">38L</span>
              <span className="text-[10px] text-slate-500 ml-1 font-medium">remaining</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-medium">Resets in</p>
              <p className="text-xs font-bold text-fp-primary">18 days · Jul 1</p>
            </div>
          </div>

          <div className="mt-2 bg-fp-primary-light/60 rounded-xl p-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-fp-primary shrink-0" />
            <p className="text-[10px] text-fp-carpool font-medium">At current usage, you'll use ~78L this month — within quota.</p>
          </div>
        </div>
      </div>

      {/* Latest MOF article teaser */}
      <div className="px-4 pt-3 pb-2">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-bold text-slate-800 truncate">MOF Price Update</span>
              <AiBadge label="AI Summary" />
            </div>
            <p className="text-[10px] text-slate-500 truncate">RON95 stable · RON97 +0.05 · Effective Jun 13</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
      </div>
    </div>
  );
}

function FuelOverviewLoading() {
  return (
    <div className="absolute inset-0 overflow-y-auto pb-20 pt-11 bg-[#F8F9FA]">
      <div className="h-12 bg-white border-b border-slate-100 flex items-center px-4 gap-3 sticky top-0 z-30">
        <Bone className="w-7 h-7" /> <Bone className="h-4 w-24" />
      </div>
      <div className="px-4 pt-3 flex gap-2">
        {[1,2,3,4].map(i => <Bone key={i} className="h-8 w-16 rounded-full" />)}
      </div>
      <div className="px-4 pt-3"><Bone className="h-28 w-full rounded-2xl" /></div>
      <div className="px-4 pt-3"><Bone className="h-20 w-full rounded-2xl" /></div>
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2"><Bone className="w-7 h-7" /><Bone className="h-3.5 w-28" /></div>
          <Bone className="h-2 w-full rounded-full" />
          <Bone className="h-[116px] w-full" />
          <div className="flex gap-4"><Bone className="h-3 w-16" /><Bone className="h-3 w-20" /></div>
        </div>
      </div>
      <div className="px-4 pt-3"><Bone className="h-24 w-full rounded-2xl" /></div>
      <div className="px-4 pt-3"><Bone className="h-14 w-full rounded-2xl" /></div>
    </div>
  );
}

function FuelOverviewEmpty() {
  return (
    <div className="absolute inset-0 overflow-y-auto pb-20 pt-11 bg-[#F8F9FA]">
      <div className="h-12 bg-white border-b border-slate-100 flex items-center px-4 gap-2 sticky top-0 z-30">
        <Droplet className="w-4 h-4 text-fp-primary" />
        <span className="text-base font-bold text-slate-900">Fuel Intel</span>
      </div>

      <div className="px-4 pt-10 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-fp-primary-light flex items-center justify-center mb-4 shadow-inner">
          <Droplet className="w-9 h-9 text-fp-primary" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Set up Fuel Tracking</h3>
        <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed mb-6">
          Tell us your vehicle and preferred fuel type to get personalised price intelligence.
        </p>
      </div>

      <div className="px-4 space-y-2.5">
        {[
          { icon: FuelIcon, label: "Select Fuel Type", desc: "RON95 / RON97 / Diesel", cta: "Choose", color: "fp-primary", bg: "fp-primary-light" },
          { icon: ShieldCheck, label: "Verify BUDI95 Status", desc: "Unlock B40 subsidy tracking", cta: "Verify", color: "fp-carpool", bg: "fp-primary-light" },
          { icon: Bell, label: "Enable Price Alerts", desc: "Get notified on price changes", cta: "Enable", color: "fp-ai", bg: "fp-ai-light" },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", `bg-${item.bg}`)}>
              <item.icon className={clsx("w-5 h-5", `text-${item.color}`)} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">{item.label}</p>
              <p className="text-[11px] text-slate-500">{item.desc}</p>
            </div>
            <button className={clsx("text-[11px] font-bold px-3 py-1.5 rounded-xl text-white", `bg-${item.color}`)}>{item.cta}</button>
          </div>
        ))}
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="bg-fp-ai-light/50 border border-fp-ai/15 rounded-2xl p-3.5 flex gap-2.5">
          <Cpu className="w-4 h-4 text-fp-ai shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-1.5 mb-1"><span className="text-xs font-bold text-fp-ai">AI Tip</span><AiBadge /></div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Users who track fuel fill-ups save an average of <strong>RM 38/month</strong> by optimising fill-up timing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FuelOverviewError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-0 pb-20 pt-11 bg-[#F8F9FA] flex flex-col">
      <div className="h-12 bg-white border-b border-slate-100 flex items-center px-4 gap-2">
        <Droplet className="w-4 h-4 text-fp-primary" />
        <span className="text-base font-bold text-slate-900">Fuel Intel</span>
      </div>

      {/* Blurred cached price display */}
      <div className="px-4 pt-3">
        <div className="bg-fp-primary-light/60 rounded-2xl p-4 blur-[2px] opacity-50">
          <p className="text-[10px] font-bold text-slate-500 mb-1">RON95 · Cached data</p>
          <span className="text-4xl font-bold text-fp-primary">RM 2.05</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <motion.div
          animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-16 h-16 rounded-full bg-fp-danger/10 border-2 border-fp-danger/20 flex items-center justify-center mb-3"
        >
          <WifiOff className="w-7 h-7 text-fp-danger" />
        </motion.div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Price Data Unavailable</h3>
        <p className="text-xs text-slate-500 text-center max-w-[200px] leading-relaxed mb-4">
          Cannot fetch latest fuel prices. Showing cached data from 2 hours ago.
        </p>
        <button onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-fp-primary shadow-md shadow-fp-primary/30"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>

      <div className="px-4 pb-2">
        <div className="bg-fp-danger/5 border border-fp-danger/15 rounded-2xl p-3">
          <p className="text-[10px] text-fp-danger font-mono">Error 503 · FuelPool Price API · /v2/prices/current</p>
          <p className="text-[11px] text-slate-500 mt-1">The pricing service may be temporarily unavailable.</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 2 — MOF ARTICLE DETAIL
// ═══════════════════════════════════════════════════════════════════════════════

function MofArticleDefault() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <SubScreenHeader title="MOF Announcement" right={
        <button className="w-8 h-8 rounded-full bg-fp-primary-light flex items-center justify-center">
          <Bell className="w-3.5 h-3.5 text-fp-primary" />
        </button>
      } />

      <div className="flex-1 overflow-y-auto pb-20 space-y-3 px-4 pt-3">
        {/* Official article header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-[9px] font-black text-center leading-tight">MOF<br />MY</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Ministry of Finance Malaysia</p>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5 leading-tight">
                Fuel Price Announcement — Week of 13 June 2026
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> Jun 13, 2026 · 12:00 PM
                </span>
                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm border border-blue-100">Official</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Summary — hero section */}
        <div className="bg-gradient-to-br from-[#1a1040] to-fp-ai rounded-2xl p-4 shadow-lg shadow-fp-ai/15 relative overflow-hidden">
          <div className="absolute -bottom-6 -right-4 w-24 h-24 rounded-full bg-white/5" />
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-fp-ai-light" />
            </div>
            <span className="text-xs font-bold text-white">AI Summary</span>
            <AiBadge label="Gemini" />
          </div>
          <p className="text-[11px] text-fp-ai-light/90 font-semibold mb-2">Key Takeaways:</p>
          <div className="space-y-2">
            {[
              { icon: "🟢", text: "RON95 maintained at RM 2.05/L — no change for B40 commuters" },
              { icon: "🟡", text: "RON97 increased by RM 0.05 to RM 3.47/L (market-floating price)" },
              { icon: "🟢", text: "Diesel maintained at RM 2.15/L — stable for logistics & commuters" },
              { icon: "🔵", text: "BUDI95 subsidy programme unchanged: 100L/month for eligible B40" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[11px] mt-0.5">{item.icon}</span>
                <p className="text-[11px] text-white/85 leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-[10px] text-fp-ai-light/60 italic">
              AI-generated summary · Always verify with the official MOF statement
            </p>
          </div>
        </div>

        {/* Your wallet impact */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-fp-primary" />
            <span className="text-xs font-bold text-slate-800">Impact on Your Wallet</span>
            <AiBadge label="Personalised" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "RON95 Monthly Cost", value: "RM 170", delta: "No change", positive: true },
              { label: "RON97 If You Use It", value: "+RM 2.10", delta: "vs last week", positive: false },
              { label: "BUDI95 Savings vs Market", value: "RM 44/mo", delta: "est. for 42L tank", positive: true },
              { label: "Optimal Fill-up Day", value: "Today", delta: "Before price rise", positive: true },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                <p className="text-[9px] text-slate-400 font-medium mb-0.5 leading-tight">{s.label}</p>
                <p className="text-sm font-bold text-slate-900">{s.value}</p>
                <p className={clsx("text-[9px] font-semibold", s.positive ? "text-fp-primary" : "text-fp-warning")}>{s.delta}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Price table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-bold text-slate-800 mb-3">Official Price Table</p>
          <div className="space-y-2">
            {[
              { type: "RON95", prev: "2.05", curr: "2.05", change: "-", subsidised: true, stable: true },
              { type: "RON97", prev: "3.42", curr: "3.47", change: "+0.05", subsidised: false, stable: false },
              { type: "Diesel", prev: "2.15", curr: "2.15", change: "-", subsidised: true, stable: true },
              { type: "RON100", prev: "4.00", curr: "4.10", change: "+0.10", subsidised: false, stable: false },
            ].map(row => (
              <div key={row.type} className={clsx("flex items-center justify-between p-2.5 rounded-xl border", row.stable ? "bg-fp-primary-light/40 border-fp-primary/10" : "bg-fp-warning/5 border-fp-warning/15")}>
                <div className="flex items-center gap-2">
                  <Droplet className={clsx("w-3.5 h-3.5", row.stable ? "text-fp-primary" : "text-fp-warning")} />
                  <div>
                    <span className="text-xs font-bold text-slate-800">{row.type}</span>
                    {row.subsidised && <span className="ml-1 text-[8px] font-bold text-fp-primary bg-fp-primary-light px-1 py-0.5 rounded-sm">BUDI</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 line-through">RM {row.prev}</span>
                  <span className="text-xs font-bold text-slate-900">RM {row.curr}</span>
                  <span className={clsx("text-[10px] font-bold w-12 text-right", row.stable ? "text-fp-primary" : "text-fp-warning")}>{row.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Article excerpt */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs font-bold text-slate-800 mb-2">Official Statement (Excerpt)</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            "Kementerian Kewangan Malaysia memaklumkan bahawa harga petrol RON95 dikekalkan pada RM2.05 seliter berkuat kuasa 13 Jun 2026. Harga ini berterusan di bawah program subsidi BUDI95 bagi kumpulan B40..."
          </p>
          <button className="mt-2.5 text-[11px] font-bold text-fp-secondary flex items-center gap-1 hover:text-fp-secondary/80">
            Read full article on MOF website <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MofArticleLoading() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <div className="h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-3 pt-12">
        <Bone className="w-8 h-8 rounded-full" /><Bone className="h-4 w-32" />
      </div>
      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-3 space-y-3">
        <Bone className="h-20 w-full rounded-2xl" />
        <Bone className="h-44 w-full rounded-2xl" />
        <Bone className="h-36 w-full rounded-2xl" />
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
          {[1,2,3,4].map(i => <Bone key={i} className="h-10 w-full" />)}
        </div>
      </div>
    </div>
  );
}

function MofArticleEmpty() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <SubScreenHeader title="MOF Announcement" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <FileText className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">No Announcement This Week</h3>
          <p className="text-xs text-slate-500 leading-relaxed">MOF has not published a fuel price update for this period. Prices remain unchanged from the last announcement.</p>
        </div>
        <div className="bg-fp-primary-light/60 rounded-2xl p-3 w-full text-left">
          <p className="text-[10px] text-slate-500 font-medium">Last update: Jun 6, 2026</p>
          <p className="text-xs font-bold text-fp-primary mt-0.5">RON95 at RM 2.05 · Stable</p>
        </div>
      </div>
    </div>
  );
}

function MofArticleError() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <SubScreenHeader title="MOF Announcement" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center gap-4">
        <CircleAlert className="w-12 h-12 text-fp-danger/60" />
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">Failed to Load Article</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Unable to fetch the latest MOF fuel price announcement. Check your connection and try again.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-fp-primary text-white rounded-xl text-sm font-bold shadow-md shadow-fp-primary/25">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
        <div className="bg-fp-danger/5 border border-fp-danger/10 rounded-2xl p-3 w-full text-left">
          <p className="text-[10px] text-fp-danger font-mono">Error 404 · MOF API · /v1/article/latest</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — ADD FUEL LOG
// ═══════════════════════════════════════════════════════════════════════════════

function AddFuelLogDefault() {
  const [selectedFuel, setSelectedFuel] = useState("ron95");
  const [amountRm, setAmountRm] = useState("50.00");
  const volume = (parseFloat(amountRm || "0") / 2.05).toFixed(2);

  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <SubScreenHeader
        title="Log Fill-up"
        right={
          <button className="text-[11px] font-bold text-white bg-fp-primary px-3 py-1.5 rounded-xl shadow-md shadow-fp-primary/25">Save</button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-3 space-y-3">
        {/* Fuel type selector */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">Fuel Type</p>
          <div className="flex gap-2 flex-wrap">
            {FUEL_TYPES.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFuel(f.id)}
                className={clsx(
                  "flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all",
                  selectedFuel === f.id
                    ? clsx("text-white border-transparent shadow-sm", f.id === "ron95" ? "bg-fp-primary" : f.id === "ron97" ? "bg-fp-warning" : f.id === "diesel" ? "bg-fp-secondary" : "bg-fp-ai")
                    : "bg-slate-50 text-slate-600 border-slate-200"
                )}
              >
                {f.label} <span className="opacity-70">RM {f.price}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Big amount input */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Amount Paid</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-slate-400">RM</span>
            <input
              type="text"
              value={amountRm}
              onChange={e => setAmountRm(e.target.value)}
              className="flex-1 text-4xl font-bold text-slate-900 bg-transparent focus:outline-none w-0"
              inputMode="decimal"
            />
          </div>
          <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3">
            <div>
              <p className="text-[9px] text-slate-400 font-medium uppercase">Volume</p>
              <p className="text-sm font-bold text-fp-primary">{volume} L</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-medium uppercase">Price/L</p>
              <p className="text-sm font-bold text-slate-700">RM 2.05</p>
            </div>
            <div className="ml-auto">
              <p className="text-[9px] text-slate-400 font-medium uppercase">Efficiency est.</p>
              <p className="text-sm font-bold text-fp-secondary">~14.2 km/L</p>
            </div>
          </div>
          {/* Quick amounts */}
          <div className="flex gap-2 mt-3">
            {["20", "30", "40", "50"].map(v => (
              <button key={v} onClick={() => setAmountRm(v + ".00")}
                className="flex-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600">
                RM{v}
              </button>
            ))}
          </div>
        </div>

        {/* Station & Odometer */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fill-up Details</p>

          <div>
            <label className="text-[10px] text-slate-400 font-medium block mb-1">Station</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-fp-secondary" />
              <input type="text" defaultValue="BHPetrol Skudai"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-fp-primary/40" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1">Odometer (km)</label>
              <input type="text" defaultValue="52840"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-fp-primary/40" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1">Date & Time</label>
              <div className="relative">
                <Clock className="w-3 h-3 absolute left-2.5 top-3 text-slate-400" />
                <input type="text" defaultValue="Jun 13, 8:45 AM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-2 py-2.5 text-[10px] font-semibold text-slate-800 focus:outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-medium block mb-1">Notes (optional)</label>
            <input type="text" placeholder="e.g. Full tank before highway"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-600 placeholder:text-slate-300 focus:outline-none" />
          </div>
        </div>

        {/* AI efficiency tip */}
        <div className="bg-fp-ai-light/50 border border-fp-ai/15 rounded-2xl p-3.5 flex items-start gap-2.5">
          <Cpu className="w-4 h-4 text-fp-ai shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-1.5 mb-1"><span className="text-xs font-bold text-fp-ai">AI Efficiency Tip</span><AiBadge /></div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Your last 3 fill-ups average <strong>14.4 km/L</strong>. Highway driving boosts this to <strong>~16.2 km/L</strong>. Plan your next trip on the highway to maximise range.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddFuelLogLoading() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8F9FA] gap-4 pb-20">
      <div className="w-16 h-16 rounded-full bg-fp-primary-light flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Droplet className="w-7 h-7 text-fp-primary" />
        </motion.div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-900">Saving your log…</p>
        <p className="text-xs text-slate-500 mt-1">Calculating efficiency and updating history</p>
      </div>
      <div className="w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          className="w-1/2 h-full bg-fp-primary rounded-full"
        />
      </div>
    </div>
  );
}

function AddFuelLogEmpty() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <SubScreenHeader title="Log Fill-up" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-fp-primary-light flex items-center justify-center shadow-inner">
          <FuelIcon className="w-9 h-9 text-fp-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Log Your First Fill-up 🎉</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">Start tracking your fuel expenses to unlock AI-powered efficiency insights and price optimisation.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-fp-primary text-white rounded-xl font-bold text-sm shadow-md shadow-fp-primary/30">
          <Plus className="w-4 h-4" /> Add First Entry
        </button>
        <div className="bg-fp-ai-light/50 border border-fp-ai/15 rounded-2xl p-3.5 w-full text-left">
          <div className="flex items-center gap-1.5 mb-1.5"><AiBadge /><span className="text-xs font-bold text-fp-ai">What you'll unlock</span></div>
          <ul className="space-y-1">
            {["Fuel efficiency trends (km/L)", "Monthly spend analytics", "Price-optimised fill-up timing", "BUDI95 subsidy tracking"].map(f => (
              <li key={f} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <CheckCircle2 className="w-3 h-3 text-fp-primary shrink-0" />{f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AddFuelLogError() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <SubScreenHeader title="Log Fill-up" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center gap-4">
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: 2 }}
          className="w-16 h-16 rounded-full bg-fp-danger/10 border-2 border-fp-danger/20 flex items-center justify-center">
          <CircleAlert className="w-7 h-7 text-fp-danger" />
        </motion.div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Save Failed</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Your log couldn't be saved. Your data has been kept — tap retry to try again.</p>
        </div>
        <div className="flex gap-2 w-full">
          <button className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Discard</button>
          <button className="flex-1 py-2.5 bg-fp-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-fp-primary/25">
            <RefreshCw className="w-3.5 h-3.5" /> Retry Save
          </button>
        </div>
        <div className="bg-fp-danger/5 border border-fp-danger/10 rounded-2xl p-3 w-full text-left">
          <p className="text-[10px] text-fp-danger font-mono">Error 500 · FuelPool Log API · POST /v2/logs</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 4 — FUEL LOG HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

function FuelHistoryDefault() {
  const [activeFilter, setActiveFilter] = useState("all");
  const filters = ["all", "RON95", "RON97", "Diesel"];

  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <SubScreenHeader
        title="Fuel History"
        right={
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <Filter className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button className="w-8 h-8 rounded-full bg-fp-primary-light flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-fp-primary" />
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto pb-20 pt-3 space-y-3 px-4">
        {/* Monthly summary hero */}
        <div className="bg-gradient-to-br from-fp-primary to-fp-carpool rounded-2xl p-4 text-white shadow-md shadow-fp-primary/20">
          <p className="text-fp-carpool-light text-[10px] font-semibold uppercase tracking-wider mb-0.5">June 2026</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold">RM 170</p>
              <p className="text-fp-carpool-light text-[10px] mt-0.5">Total fuel spend</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingDown className="w-2.5 h-2.5" /> 19% less than May
              </span>
              <p className="text-fp-carpool-light text-[10px] mt-1">vs RM 210 last month</p>
            </div>
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-white/20">
            {[
              { label: "Fill-ups", value: "4" },
              { label: "Total Litres", value: "82.9L" },
              { label: "Avg Efficiency", value: "14.2 km/L" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-fp-carpool-light text-[9px] font-medium">{s.label}</p>
                <p className="text-white text-xs font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly spend chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between border-b border-slate-50">
            <span className="text-xs font-bold text-slate-800">Monthly Spend (RM)</span>
            <span className="text-[9px] font-bold text-fp-danger bg-fp-danger/10 px-1.5 py-0.5 rounded-full">May was highest</span>
          </div>
          <div className="px-2 py-2">
            <MonthlySpendSVGChart />
          </div>
          <div className="px-4 pb-3 flex gap-3">
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-fp-carpool-light" /><span className="text-[9px] text-slate-400">Normal</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-fp-primary" /><span className="text-[9px] text-slate-400">Current</span></div>
            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-fp-danger" /><span className="text-[9px] text-slate-400">Highest</span></div>
          </div>
        </div>

        {/* AI analysis */}
        <div className="bg-fp-ai-light/40 border border-fp-ai/15 rounded-2xl p-3.5 flex gap-2.5">
          <Cpu className="w-4 h-4 text-fp-ai shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-1.5 mb-1"><span className="text-xs font-bold text-fp-ai">AI Analysis</span><AiBadge /></div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Your May spike (+RM 75) was driven by 2 extra fill-ups during the Hari Raya holiday. Efficiency dropped to <strong>13.3 km/L</strong> — likely due to highway driving. Your June trend is normalising.
            </p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                activeFilter === f ? "bg-slate-900 text-white border-transparent" : "bg-white text-slate-500 border-slate-200"
              )}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>

        {/* Log entries */}
        <div className="space-y-2">
          {FUEL_LOGS.map(log => (
            <motion.div key={log.id} whileTap={{ scale: 0.98 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-fp-primary-light flex items-center justify-center shrink-0">
                <Droplet className="w-4.5 h-4.5 text-fp-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{log.station}</span>
                  <span className="text-sm font-bold text-slate-900">RM {log.amount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-400">{log.date} · {log.time}</span>
                  <span className="text-[9px] font-bold text-fp-primary bg-fp-primary-light px-1.5 py-0.5 rounded-sm">{log.type}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-slate-500">{log.volume}L · RM{log.ppl}/L</span>
                  <span className={clsx(
                    "text-[10px] font-bold flex items-center gap-0.5",
                    log.effDelta > 0 ? "text-fp-primary" : log.effDelta < 0 ? "text-fp-danger" : "text-slate-500"
                  )}>
                    {log.effDelta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : log.effDelta < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                    {log.eff} km/L
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto">{log.odometer.toLocaleString()} km</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FuelHistoryLoading() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <div className="h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-3 pt-12">
        <Bone className="w-8 h-8 rounded-full" /><Bone className="h-4 w-28" />
      </div>
      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-3 space-y-3">
        <Bone className="h-28 w-full rounded-2xl" />
        <Bone className="h-36 w-full rounded-2xl" />
        <div className="flex gap-2">{[1,2,3,4].map(i => <Bone key={i} className="h-8 w-16 rounded-full" />)}</div>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex gap-3">
            <Bone className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between"><Bone className="h-3 w-32" /><Bone className="h-3 w-12" /></div>
              <Bone className="h-2.5 w-40" />
              <Bone className="h-2.5 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FuelHistoryEmpty() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <SubScreenHeader title="Fuel History" right={
        <button className="w-8 h-8 rounded-full bg-fp-primary-light flex items-center justify-center">
          <Plus className="w-3.5 h-3.5 text-fp-primary" />
        </button>
      } />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
          <BarChart2 className="w-9 h-9 text-slate-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">No Fuel Logs Yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">Log your first fill-up to start seeing spending analytics, efficiency trends, and AI insights.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-fp-primary text-white rounded-xl font-bold text-sm shadow-md shadow-fp-primary/25">
          <Plus className="w-4 h-4" /> Log First Fill-up
        </button>
      </div>
    </div>
  );
}

function FuelHistoryError() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F8F9FA]">
      <SubScreenHeader title="Fuel History" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center gap-4">
        <CircleAlert className="w-12 h-12 text-fp-danger/60" />
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">History Unavailable</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Fuel log history couldn't be loaded. Your data is safe — this is a temporary fetch error.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-fp-primary text-white rounded-xl text-sm font-bold shadow-md shadow-fp-primary/25">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
        <div className="bg-fp-danger/5 border border-fp-danger/10 rounded-2xl p-3 w-full text-left">
          <p className="text-[10px] text-fp-danger font-mono">Error 503 · FuelPool API · GET /v2/logs?userId=amirul</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN ROUTER + PHONE FRAME
// ═══════════════════════════════════════════════════════════════════════════════

function ScreenContent({ screen, state }: { screen: Screen; state: PageState }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => setRetrying(false), 1800);
  };

  if (screen === "overview") {
    if (state === "loading") return <FuelOverviewLoading />;
    if (state === "empty") return <FuelOverviewEmpty />;
    if (state === "error") return <FuelOverviewError onRetry={handleRetry} />;
    return <FuelOverviewDefault />;
  }
  if (screen === "article") {
    if (state === "loading") return <MofArticleLoading />;
    if (state === "empty") return <MofArticleEmpty />;
    if (state === "error") return <MofArticleError />;
    return <MofArticleDefault />;
  }
  if (screen === "add-log") {
    if (state === "loading") return <AddFuelLogLoading />;
    if (state === "empty") return <AddFuelLogEmpty />;
    if (state === "error") return <AddFuelLogError />;
    return <AddFuelLogDefault />;
  }
  // history
  if (state === "loading") return <FuelHistoryLoading />;
  if (state === "empty") return <FuelHistoryEmpty />;
  if (state === "error") return <FuelHistoryError />;
  return <FuelHistoryDefault />;
}

function PhoneFrame({ screen, state }: { screen: Screen; state: PageState }) {
  return (
    <div className="w-[390px] h-[844px] border-[12px] border-slate-900 rounded-[3rem] overflow-hidden relative bg-[#F8F9FA] shadow-2xl shrink-0">
      <DynamicIsland />
      <StatusBar />
      <ScreenContent screen={screen} state={state} />
      <FuelBottomNav />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function FuelIntelligence() {
  const [screen, setScreen] = useState<Screen>("overview");
  const [state, setState] = useState<PageState>("default");

  const screens: { id: Screen; label: string; desc: string }[] = [
    { id: "overview",  label: "Fuel Overview",    desc: "Prices · Chart · BUDI95" },
    { id: "article",   label: "MOF Article",       desc: "Announcement · AI Summary" },
    { id: "add-log",   label: "Add Fuel Log",      desc: "Log Fill-up Form" },
    { id: "history",   label: "Log History",       desc: "Analytics · Trends" },
  ];

  const states: { id: PageState; color: string }[] = [
    { id: "default", color: "bg-slate-900 text-white" },
    { id: "loading", color: "bg-slate-400 text-white" },
    { id: "empty",   color: "bg-fp-secondary text-white" },
    { id: "error",   color: "bg-fp-danger text-white" },
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-fp-bg">
      {/* Page header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 bg-fp-primary rounded-xl flex items-center justify-center shadow-md shadow-fp-primary/20 shrink-0">
            <Droplet className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fuel Intelligence</h1>
              <span className="text-xs font-bold bg-fp-primary text-white px-2 py-0.5 rounded-md shadow-sm">L1</span>
            </div>
            <p className="text-slate-500 font-medium text-sm mt-0.5">Price tracking · MOF announcements · Fill-up analytics · AI forecasting</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Screen selector */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex-wrap">
            {screens.map(s => (
              <button key={s.id} onClick={() => setScreen(s.id)}
                className={clsx(
                  "px-3 py-2 rounded-lg text-xs font-bold transition-all text-left",
                  screen === s.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <span className="block">{s.label}</span>
                <span className={clsx("text-[9px] font-medium block", screen === s.id ? "text-slate-300" : "text-slate-400")}>{s.desc}</span>
              </button>
            ))}
          </div>

          {/* State switcher */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm sm:ml-auto">
            {states.map(s => (
              <button key={s.id} onClick={() => setState(s.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                  state === s.id ? s.color : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Phone frame */}
      <div className="flex justify-center md:justify-start">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${screen}-${state}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100 text-sm">
                  {screens.find(s => s.id === screen)?.label}
                </span>
                <span className={clsx("text-[10px] font-bold px-2 py-1 rounded-full capitalize",
                  state === "default" ? "bg-fp-primary-light text-fp-primary" :
                  state === "loading" ? "bg-slate-100 text-slate-500" :
                  state === "empty"   ? "bg-fp-secondary-light text-fp-secondary" :
                                        "bg-fp-danger/10 text-fp-danger"
                )}>
                  {state}
                </span>
              </div>
              <PhoneFrame screen={screen} state={state} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
