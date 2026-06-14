import { Outlet, NavLink } from "react-router";
import { Map, Layers, GitMerge, Route, Palette, Smartphone, Car, LayoutDashboard, Droplet } from "lucide-react";
import { clsx } from "clsx";

export function Layout() {
  const navItems = [
    { name: "Nav Map", path: "/", icon: Map },
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Fuel Intel", path: "/fuel", icon: Droplet },
    { name: "Hierarchy", path: "/hierarchy", icon: Layers },
    { name: "Flows", path: "/flows", icon: GitMerge },
    { name: "Journeys", path: "/journeys", icon: Route },
    { name: "Design", path: "/design-system", icon: Palette },
    { name: "Onboarding", path: "/onboarding", icon: Smartphone },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-emerald-900 text-white shadow-xl">
        <div className="p-6 flex items-center space-x-3">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">FuelPool IA</h1>
            <p className="text-emerald-300 text-xs font-medium">Architecture Map</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-emerald-800 text-white shadow-inner font-semibold"
                    : "text-emerald-100 hover:bg-emerald-800/50 hover:text-white"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-6 border-t border-emerald-800">
          <div className="bg-emerald-800/50 rounded-lg p-4">
            <p className="text-xs text-emerald-200">
              Information Architecture for <strong>FuelPool</strong>
              <br />Mobile Application
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-emerald-900 text-white p-4 shadow-md flex items-center space-x-3 shrink-0 z-10">
          <div className="bg-emerald-500 p-1.5 rounded-lg">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">FuelPool IA</h1>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50/50 pb-20 md:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe z-20">
        <div className="flex justify-around items-center p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-colors",
                  isActive
                    ? "text-emerald-600"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )
              }
            >
              <item.icon className={clsx("w-5 h-5 mb-1", "transition-transform duration-200")} />
              <span className="text-[10px] font-medium tracking-wide">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}