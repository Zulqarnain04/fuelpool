import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import {
  Droplet, Leaf, Cpu, Wifi, Battery, Bell, MapPin, Clock,
  Users, Star, ShieldCheck, TrendingUp, TrendingDown, Zap,
  ArrowRight, RefreshCw, Home, Award, AlertTriangle, ChevronRight,
  Fuel, BarChart2, Wind, CircleAlert, WifiOff
} from "lucide-react";

type DashboardState = "default" | "loading" | "empty" | "error";

// ─── Reusable primitives ────────────────────────────────────────────────────

function AiBadge({ label = "AI Insight" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fp-ai-light text-fp-ai border border-fp-ai/20 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_8px_rgba(83,74,183,0.12)]">
      <Cpu className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

function StatusBar({ light = false }: { light?: boolean }) {
  return (
    <div
      className={clsx(
        "absolute top-0 inset-x-0 h-11 z-50 flex justify-between items-end px-6 pb-1.5 text-[12px] font-bold pointer-events-none",
        light ? "text-white" : "text-slate-900"
      )}
    >
      <span>9:41</span>
      <div className="flex gap-1.5 items-center">
        <Wifi className="w-3.5 h-3.5" />
        <Battery className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

function DynamicIsland() {
  return (
    <div className="absolute top-0 inset-x-0 h-7 bg-slate-900 w-[120px] mx-auto rounded-b-3xl z-50 pointer-events-none" />
  );
}

function BottomNav({ active = "home" }: { active?: string }) {
  const items = [
    { id: "home", icon: Home, label: "Home" },
    { id: "fuel", icon: Droplet, label: "Fuel" },
    { id: "ride", icon: Users, label: "Ride" },
    { id: "eco", icon: Leaf, label: "Eco" },
  ];
  return (
    <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-100 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] pb-4 pt-2 px-2 z-40 flex justify-around items-center">
      {items.map((item) => (
        <button
          key={item.id}
          className={clsx(
            "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors",
            active === item.id ? "text-fp-primary" : "text-slate-400"
          )}
        >
          <item.icon
            className={clsx(
              "w-5 h-5 transition-all",
              active === item.id && "scale-110"
            )}
          />
          <span className={clsx("text-[9px] font-bold uppercase tracking-wider", active === item.id && "text-fp-primary")}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Skeleton primitives ────────────────────────────────────────────────────

function Bone({ className }: { className?: string }) {
  return <div className={clsx("bg-slate-200 rounded-xl animate-pulse", className)} />;
}

// ─── Weekly bar chart data ───────────────────────────────────────────────────

const weeklyData = [
  { day: "Mon", saved: 4, co2: 0.8 },
  { day: "Tue", saved: 9, co2: 1.4 },
  { day: "Wed", saved: 6, co2: 1.1 },
  { day: "Thu", saved: 12, co2: 1.9 },
  { day: "Fri", saved: 7, co2: 1.2 },
  { day: "Sat", saved: 4, co2: 0.7 },
  { day: "Sun", saved: 2, co2: 0.4 },
];

// ─── DEFAULT state content ──────────────────────────────────────────────────

function SavingsBarChart({
  data,
  highlightIndex,
}: {
  data: typeof weeklyData;
  highlightIndex: number;
}) {
  const [tooltip, setTooltip] = useState<{ index: number; x: number; y: number } | null>(null);
  const svgW = 320;
  const svgH = 64;
  const padX = 4;
  const barAreaW = svgW - padX * 2;
  const maxVal = Math.max(...data.map((d) => d.saved));
  const barW = 12;
  const gap = (barAreaW - barW * data.length) / (data.length - 1);

  return (
    <div className="relative select-none">
      <svg viewBox={`0 0 ${svgW} ${svgH + 16}`} className="w-full" style={{ height: svgH + 16 }}>
        {data.map((d, i) => {
          const barH = Math.max(4, (d.saved / maxVal) * (svgH - 8));
          const x = padX + i * (barW + gap);
          const y = svgH - barH;
          const isHigh = i === highlightIndex;
          return (
            <g key={d.day}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                fill={isHigh ? "#1D9E75" : "#BBE9D6"}
                onMouseEnter={() => setTooltip({ index: i, x: x + barW / 2, y })}
                onMouseLeave={() => setTooltip(null)}
                className="cursor-pointer transition-opacity hover:opacity-80"
              />
              <text
                x={x + barW / 2}
                y={svgH + 12}
                textAnchor="middle"
                fontSize={9}
                fontWeight={600}
                fill={isHigh ? "#1D9E75" : "#94a3b8"}
              >
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>
      {tooltip !== null && (
        <div
          className="absolute pointer-events-none z-10 bg-white shadow-md rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 border border-slate-100 -translate-x-1/2 -translate-y-full"
          style={{ left: (tooltip.x / svgW) * 100 + "%", top: ((tooltip.y - 4) / (svgH + 16)) * 100 + "%" }}
        >
          RM {data[tooltip.index].saved}
        </div>
      )}
    </div>
  );
}

function DefaultDashboard() {
  const [alertDismissed, setAlertDismissed] = useState(false);

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-20 pt-12 bg-[#F8F9FA]">

      {/* ── Greeting Card ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-gradient-to-br from-fp-primary to-fp-carpool rounded-2xl p-5 text-white shadow-lg shadow-fp-primary/25 relative overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -right-2 w-36 h-36 rounded-full bg-white/5" />

          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-fp-carpool-light text-xs font-semibold uppercase tracking-wider mb-0.5">
                Friday, 13 Jun
              </p>
              <h2 className="text-xl font-bold leading-tight">Good morning,</h2>
              <h2 className="text-xl font-bold">Amirul 👋</h2>
              <p className="text-fp-carpool-light text-xs mt-1.5 font-medium">
                You've saved RM 44 this month
              </p>
            </div>
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden backdrop-blur-sm">
                <div className="w-full h-full bg-fp-carpool-light/30 flex items-center justify-center text-lg font-bold text-white">
                  A
                </div>
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
            </div>
          </div>

          {/* Quick impact pills */}
          <div className="flex gap-2 mt-4 flex-wrap relative z-10">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/20">
              <Award className="w-2.5 h-2.5" /> Top 18% Saver
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/20">
              <Leaf className="w-2.5 h-2.5" /> 6.8 kg CO₂ saved
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/20">
              <Users className="w-2.5 h-2.5" /> 3 rides shared
            </span>
          </div>
        </div>
      </div>

      {/* ── Fuel Alert ── */}
      <AnimatePresence>
        {!alertDismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pt-2"
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-fp-warning/15 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-fp-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <p className="text-xs font-bold text-amber-800">RON95 Price Alert</p>
                  <AiBadge label="AI Predicted" />
                </div>
                <p className="text-[11px] text-amber-700 leading-snug">
                  Prices likely rising by <strong>+RM 0.05</strong> this Friday. Consider filling up today.
                </p>
              </div>
              <button
                onClick={() => setAlertDismissed(true)}
                className="text-amber-400 hover:text-amber-600 shrink-0 mt-0.5 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fuel Level Card ── */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-fp-secondary-light flex items-center justify-center">
                <Fuel className="w-3.5 h-3.5 text-fp-secondary" />
              </div>
              <span className="text-sm font-bold text-slate-800">Fuel Level</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Perodua Myvi 1.5L</span>
          </div>

          <div className="p-4">
            {/* Tank gauge */}
            <div className="flex items-end gap-3 mb-3">
              <div className="flex-1">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-slate-500 font-medium">Current</span>
                  <span className="text-xs font-bold text-slate-800">28 / 42 L</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "66%" }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-fp-secondary to-fp-primary rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-slate-400">Empty</span>
                  <span className="text-[9px] font-bold text-fp-primary">66% Full</span>
                  <span className="text-[9px] text-slate-400">Full</span>
                </div>
              </div>
              <div className="text-center shrink-0">
                <span className="text-2xl font-bold text-slate-900">66%</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Range", value: "392 km", icon: MapPin, color: "text-fp-secondary" },
                { label: "Efficiency", value: "14.2 km/L", icon: BarChart2, color: "text-fp-primary" },
                { label: "Last Fill", value: "3 days", icon: Clock, color: "text-slate-500" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                  <s.icon className={clsx("w-3.5 h-3.5 mx-auto mb-1", s.color)} />
                  <p className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">{s.label}</p>
                  <p className="text-xs font-bold text-slate-800">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Weekly Impact ── */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-fp-primary-light flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-fp-primary" />
              </div>
              <span className="text-sm font-bold text-slate-800">Weekly Impact</span>
            </div>
            <span className="text-[10px] font-bold text-fp-primary bg-fp-primary-light px-2 py-0.5 rounded-full">Jun 7–13</span>
          </div>

          {/* Big stats */}
          <div className="grid grid-cols-2 gap-0 border-b border-slate-50">
            {[
              { label: "Fuel Saved", value: "RM 44", icon: "💰", delta: "+12%", positive: true },
              { label: "CO₂ Reduced", value: "6.8 kg", icon: "🌿", delta: "-8% vs last wk", positive: true },
              { label: "Rides Shared", value: "3 rides", icon: "🚗", delta: "with 5 people", positive: true },
              { label: "Eco Rank", value: "Top 18%", icon: "🏆", delta: "↑ 4 positions", positive: true },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={clsx(
                  "px-4 py-3 flex flex-col gap-0.5",
                  i % 2 === 0 && "border-r border-slate-50",
                  i < 2 && "border-b border-slate-50"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{stat.icon}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-slate-900 leading-tight">{stat.value}</p>
                <span className="text-[10px] text-fp-primary font-semibold">{stat.delta}</span>
              </div>
            ))}
          </div>

          {/* Bar chart — plain SVG, no recharts */}
          <div className="px-2 pb-3 pt-3">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider px-2 mb-2">Daily savings (RM)</p>
            <SavingsBarChart data={weeklyData} highlightIndex={3} />
          </div>
        </div>
      </div>

      {/* ── AI Weekly Insight ── */}
      <div className="px-4 pt-3">
        <div className="bg-gradient-to-br from-[#1a1040] to-fp-ai rounded-2xl p-4 shadow-lg shadow-fp-ai/20 relative overflow-hidden">
          <div className="absolute -bottom-8 -right-4 w-28 h-28 rounded-full bg-white/5" />
          <div className="absolute top-2 right-10 w-12 h-12 rounded-full bg-white/5" />

          <div className="flex items-start gap-2.5 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-fp-ai-light/20 border border-fp-ai-light/30 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 text-fp-ai-light" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs font-bold text-white">AI Weekly Insight</span>
                <AiBadge label="Gemini" />
              </div>
              <p className="text-[12px] text-fp-ai-light/90 leading-relaxed">
                You save the most on <strong className="text-white">Thursdays</strong> — your carpool match rate peaks at 78% on that day. Scheduling a ride for next Thursday could save an extra{" "}
                <strong className="text-fp-carpool-light">RM 11.50</strong>.
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <button className="text-[11px] font-bold text-white bg-white/15 border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/25 transition-colors flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Book Thu Ride
                </button>
                <button className="text-[11px] text-fp-ai-light/70 font-medium hover:text-white transition-colors">
                  View full analysis →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Carpool Matches ── */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-fp-secondary" />
            <span className="text-sm font-bold text-slate-800">Nearby Matches</span>
            <AiBadge label="AI Match" />
          </div>
          <button className="text-[11px] font-bold text-fp-secondary flex items-center gap-0.5">
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {[
            {
              name: "Farah Nadia",
              rating: 4.9,
              rides: 88,
              from: "Sunway Pyramid",
              to: "UTM Skudai",
              depart: "8:00 AM",
              price: "RM 5.50",
              seats: 2,
              match: 94,
              verified: true,
              initials: "FN",
              color: "bg-pink-400",
            },
            {
              name: "Haziq Izzat",
              rating: 4.7,
              rides: 143,
              from: "Larkin Terminal",
              to: "UTM Skudai",
              depart: "8:15 AM",
              price: "RM 4.00",
              seats: 1,
              match: 87,
              verified: true,
              initials: "HI",
              color: "bg-fp-secondary",
            },
          ].map((match) => (
            <motion.div
              key={match.name}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-3.5 flex items-start gap-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold", match.color)}>
                    {match.initials}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-bold text-slate-900 truncate">{match.name}</span>
                    {match.verified && <ShieldCheck className="w-3.5 h-3.5 text-fp-primary shrink-0" />}
                    <span className="ml-auto text-[10px] font-bold bg-fp-primary-light text-fp-primary px-1.5 py-0.5 rounded-full shrink-0">
                      {match.match}% match
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1.5">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    <span>{match.rating} · {match.rides} rides</span>
                  </div>

                  {/* Route */}
                  <div className="relative pl-3.5 pb-2.5 text-[11px]">
                    <div className="absolute left-1.5 top-1.5 bottom-0 w-[1.5px] bg-slate-200" />
                    <div className="absolute left-[4px] top-1.5 w-2 h-2 rounded-full bg-fp-secondary" />
                    <p className="font-semibold text-slate-700 leading-none">{match.from}</p>
                    <p className="text-slate-400 mb-1">{match.depart}</p>
                    <div className="absolute left-[4px] bottom-0 w-2 h-2 rounded-full border-[1.5px] border-fp-danger bg-white" />
                    <p className="font-semibold text-slate-700 leading-none">{match.to}</p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{match.price}</span>
                      <span className="text-[10px] text-fp-primary font-bold bg-fp-primary-light px-1.5 py-0.5 rounded-sm">
                        {match.seats} seat{match.seats > 1 ? "s" : ""}
                      </span>
                    </div>
                    <button className="text-[11px] font-bold bg-slate-900 text-white px-3 py-1.5 rounded-xl hover:bg-slate-700 transition-colors">
                      Request
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Current Fuel Prices ── */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Droplet className="w-4 h-4 text-fp-primary" />
            <span className="text-sm font-bold text-slate-800">Fuel Prices</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Effective Jun 13</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { type: "RON95", price: "RM 2.05", delta: "→ Stable", color: "fp-primary", bg: "fp-primary-light", deltaTone: "text-slate-500", subsidised: true },
            { type: "RON97", price: "RM 3.47", delta: "↑ +0.05", color: "fp-warning", bg: "fp-warning/10", deltaTone: "text-fp-warning", subsidised: false },
            { type: "Diesel", price: "RM 2.15", delta: "→ Stable", color: "fp-secondary", bg: "fp-secondary-light", deltaTone: "text-slate-500", subsidised: true },
          ].map((fuel) => (
            <div key={fuel.type} className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
              <div className={clsx("w-6 h-6 rounded-lg mx-auto mb-1.5 flex items-center justify-center", `bg-${fuel.bg}`)}>
                <Droplet className={clsx("w-3 h-3", `text-${fuel.color}`)} />
              </div>
              <p className="text-[10px] text-slate-500 font-semibold">{fuel.type}</p>
              <p className="text-sm font-bold text-slate-900 leading-tight">{fuel.price}</p>
              <p className={clsx("text-[9px] font-bold mt-0.5", fuel.deltaTone)}>{fuel.delta}</p>
              {fuel.subsidised && (
                <span className="text-[8px] font-bold text-fp-primary bg-fp-primary-light px-1 py-0.5 rounded-sm mt-1 inline-block">
                  BUDI95
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LOADING state content ──────────────────────────────────────────────────

function LoadingDashboard() {
  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-20 pt-12 bg-[#F8F9FA]">
      {/* Greeting skeleton */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-slate-200 animate-pulse rounded-2xl p-5 h-[140px]" />
      </div>

      {/* Alert skeleton */}
      <div className="px-4 pt-2">
        <Bone className="h-16 w-full" />
      </div>

      {/* Fuel card skeleton */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bone className="w-7 h-7" />
            <Bone className="h-3.5 w-24" />
          </div>
          <Bone className="h-3 w-full" />
          <Bone className="h-8 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-2">
            <Bone className="h-16" />
            <Bone className="h-16" />
            <Bone className="h-16" />
          </div>
        </div>
      </div>

      {/* Impact card skeleton */}
      <div className="px-4 pt-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bone className="w-7 h-7" />
            <Bone className="h-3.5 w-28" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => <Bone key={i} className="h-16" />)}
          </div>
          <Bone className="h-16 w-full" />
        </div>
      </div>

      {/* AI insight skeleton */}
      <div className="px-4 pt-3">
        <Bone className="h-28 w-full rounded-2xl" />
      </div>

      {/* Carpool skeleton */}
      <div className="px-4 pt-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <Bone className="w-4 h-4" />
          <Bone className="h-3.5 w-28" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3.5 flex gap-3">
            <Bone className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Bone className="h-3.5 w-3/4" />
              <Bone className="h-3 w-1/2" />
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>

      {/* Fuel prices skeleton */}
      <div className="px-4 pt-3 pb-2">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <Bone key={i} className="h-24" />)}
        </div>
      </div>
    </div>
  );
}

// ─── EMPTY state content ────────────────────────────────────────────────────

function EmptyDashboard() {
  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-20 pt-12 bg-[#F8F9FA]">
      {/* Minimal greeting */}
      <div className="px-4 pt-4">
        <div className="bg-gradient-to-br from-fp-primary to-fp-carpool rounded-2xl p-5 text-white">
          <p className="text-fp-carpool-light text-xs font-semibold uppercase tracking-wider mb-0.5">Friday, 13 Jun</p>
          <h2 className="text-xl font-bold">Welcome, Amirul 👋</h2>
          <p className="text-fp-carpool-light text-xs mt-1 font-medium">Let's set up your first journey.</p>
        </div>
      </div>

      {/* Empty state hero */}
      <div className="px-4 pt-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-fp-primary-light flex items-center justify-center mb-4 shadow-inner">
          <Droplet className="w-9 h-9 text-fp-primary" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">No data yet</h3>
        <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
          Log your first fuel fill-up or join a carpool to start tracking your impact.
        </p>
      </div>

      {/* Setup cards */}
      <div className="px-4 pt-6 space-y-2.5">
        {[
          { icon: Fuel, label: "Log Fuel Fill-up", desc: "Track your RON95 spend", color: "fp-secondary", bg: "fp-secondary-light", cta: "Log Now" },
          { icon: Users, label: "Find Carpool", desc: "Match with nearby drivers", color: "fp-carpool", bg: "fp-primary-light", cta: "Browse" },
          { icon: Leaf, label: "Set Eco Goal", desc: "Reduce your carbon footprint", color: "fp-ai", bg: "fp-ai-light", cta: "Set Goal" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3"
          >
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", `bg-${item.bg}`)}>
              <item.icon className={clsx("w-5 h-5", `text-${item.color}`)} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">{item.label}</p>
              <p className="text-[11px] text-slate-500">{item.desc}</p>
            </div>
            <button className={clsx("text-[11px] font-bold px-3 py-1.5 rounded-xl text-white", `bg-${item.color}`)}>
              {item.cta}
            </button>
          </div>
        ))}
      </div>

      {/* AI nudge */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-fp-ai-light/50 border border-fp-ai/15 rounded-2xl p-4 flex gap-2.5 items-start">
          <Cpu className="w-4 h-4 text-fp-ai shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-bold text-fp-ai">AI Tip</span>
              <AiBadge />
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Users who log their first fill-up save an average of <strong>RM 38/month</strong> within 4 weeks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ERROR state content ────────────────────────────────────────────────────

function ErrorDashboard() {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => setRetrying(false), 2000);
  };

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-20 pt-12 bg-[#F8F9FA]">
      {/* Greyed-out header */}
      <div className="px-4 pt-4">
        <div className="bg-slate-300 rounded-2xl p-5 h-[116px] relative overflow-hidden">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
            <WifiOff className="w-7 h-7 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Error card */}
      <div className="px-4 pt-6 flex flex-col items-center text-center">
        <motion.div
          animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-16 h-16 rounded-full bg-fp-danger/10 border-2 border-fp-danger/20 flex items-center justify-center mb-3"
        >
          <CircleAlert className="w-7 h-7 text-fp-danger" />
        </motion.div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Connection Error</h3>
        <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed mb-4">
          Unable to load your dashboard. Check your internet connection and try again.
        </p>
        <button
          onClick={handleRetry}
          className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all",
            retrying ? "bg-slate-400" : "bg-fp-primary shadow-md shadow-fp-primary/30 hover:bg-fp-primary/90"
          )}
        >
          <RefreshCw className={clsx("w-4 h-4", retrying && "animate-spin")} />
          {retrying ? "Retrying..." : "Retry"}
        </button>
      </div>

      {/* Cached data notice */}
      <div className="px-4 pt-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-fp-warning animate-pulse" />
            <span className="text-xs font-bold text-slate-600">Showing cached data</span>
            <span className="text-[10px] text-slate-400">· 2h ago</span>
          </div>

          {/* Partial cached stats */}
          <div className="grid grid-cols-2 gap-2 opacity-60">
            {[
              { label: "Fuel Saved", value: "RM 44", icon: "💰" },
              { label: "CO₂ Reduced", value: "6.8 kg", icon: "🌿" },
              { label: "Rides Shared", value: "3 rides", icon: "🚗" },
              { label: "Eco Rank", value: "Top 18%", icon: "🏆" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{stat.icon}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{stat.label}</span>
                </div>
                <p className="text-sm font-bold text-slate-500 mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error detail */}
      <div className="px-4 pt-3 pb-2">
        <div className="bg-fp-danger/5 border border-fp-danger/15 rounded-2xl p-3.5">
          <p className="text-[10px] text-fp-danger font-mono">
            Error 503 · FuelPool API · dashboard/v2/summary
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Our servers may be temporarily unavailable. No action needed on your end.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Phone frame wrapper ────────────────────────────────────────────────────

function PhoneFrame({
  title,
  badge,
  badgeColor,
  children,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 items-center snap-center shrink-0">
      <div className="text-center">
        <h3 className="font-bold text-slate-700 bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-100 text-sm inline-block">
          {title}
        </h3>
        <span className={clsx("ml-2 text-[10px] font-bold px-2 py-1 rounded-full inline-block", badgeColor)}>
          {badge}
        </span>
      </div>

      <div className="w-[390px] h-[844px] border-[12px] border-slate-900 rounded-[3rem] overflow-hidden relative bg-[#F8F9FA] shadow-2xl">
        <DynamicIsland />
        <StatusBar />
        {children}
        <BottomNav />
      </div>
    </div>
  );
}

// ─── Main export ────────────────────────────────────────────────────────────

export function HomeDashboard() {
  const [activeState, setActiveState] = useState<DashboardState>("default");

  const states: { id: DashboardState; label: string }[] = [
    { id: "default", label: "Default" },
    { id: "loading", label: "Loading" },
    { id: "empty", label: "Empty" },
    { id: "error", label: "Error" },
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-fp-bg">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-fp-primary rounded-xl flex items-center justify-center shadow-md shadow-fp-primary/20">
                <Home className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Home Dashboard</h1>
            </div>
            <p className="text-slate-500 font-medium text-sm ml-10">
              Primary screen · L1 Fuel · L2 Carpool · L3 Eco · Daily driver view
            </p>
          </div>

          {/* State switcher */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {states.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveState(s.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeState === s.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Horizontal scroll — all 4 states side by side */}
      <div className="flex gap-8 overflow-x-auto pb-12 px-2 snap-x snap-mandatory items-start"
        style={{ scrollbarWidth: "none" }}
      >
        <AnimatePresence mode="wait">
          {activeState === "default" && (
            <motion.div key="default" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <PhoneFrame title="Default State" badge="Live Data" badgeColor="bg-fp-primary-light text-fp-primary">
                <DefaultDashboard />
              </PhoneFrame>
            </motion.div>
          )}
          {activeState === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <PhoneFrame title="Loading State" badge="Skeleton UI" badgeColor="bg-slate-100 text-slate-500">
                <LoadingDashboard />
              </PhoneFrame>
            </motion.div>
          )}
          {activeState === "empty" && (
            <motion.div key="empty" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <PhoneFrame title="Empty State" badge="First-time User" badgeColor="bg-fp-secondary-light text-fp-secondary">
                <EmptyDashboard />
              </PhoneFrame>
            </motion.div>
          )}
          {activeState === "error" && (
            <motion.div key="error" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              <PhoneFrame title="Error State" badge="Network Failure" badgeColor="bg-fp-danger/10 text-fp-danger">
                <ErrorDashboard />
              </PhoneFrame>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
