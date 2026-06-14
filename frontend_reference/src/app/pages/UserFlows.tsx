import { motion } from "motion/react";
import { LogIn, UserPlus, Fingerprint, Smartphone, CheckCircle, Car, Map, ShieldCheck, Play, ArrowDown } from "lucide-react";

export function UserFlows() {
  const authSteps = [
    { name: "Splash Screen", icon: Play, desc: "Brand intro & loading" },
    { name: "Sign Up / Log In", icon: LogIn, desc: "Phone number or Google Auth" },
    { name: "OTP Verification", icon: Smartphone, desc: "6-digit code sent via SMS" },
    { name: "Create Profile", icon: UserPlus, desc: "Name, photo, university/company" },
    { name: "Biometric Setup", icon: Fingerprint, desc: "Optional FaceID/TouchID for quick access" },
  ];

  const onboardSteps = [
    { name: "Welcome to FuelPool", icon: CheckCircle, desc: "Brief value proposition" },
    { name: "Vehicle Setup", icon: Car, desc: "Car model, plate #, engine capacity" },
    { name: "Routine Setup", icon: Map, desc: "Home address to Work/Campus" },
    { name: "BUDI95 Status", icon: ShieldCheck, desc: "Verify eligibility for government subsidy" },
    { name: "Dashboard", icon: Play, desc: "Fully personalized home feed" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-slate-900">User Flows</h1>
        <p className="text-slate-500 mt-2">Diagrams for core Authentication and Onboarding experiences.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Authentication Flow */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Fingerprint className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Authentication Flow</h2>
          </div>

          <div className="relative pl-6">
            <div className="absolute top-4 bottom-4 left-6 w-0.5 bg-blue-200 -z-10" />
            <div className="space-y-8">
              {authSteps.map((step, idx) => (
                <div key={idx} className="relative">
                  {idx !== 0 && (
                    <div className="absolute -top-6 left-[-11px] bg-white text-blue-300">
                      <ArrowDown className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex items-start gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-blue-300 transition-colors">
                    <div className="p-2 bg-blue-50 text-blue-500 rounded-lg shrink-0">
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{step.name}</h3>
                      <p className="text-sm text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Onboarding Flow */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Map className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Onboarding Flow</h2>
          </div>

          <div className="relative pl-6">
            <div className="absolute top-4 bottom-4 left-6 w-0.5 bg-emerald-200 -z-10" />
            <div className="space-y-8">
              {onboardSteps.map((step, idx) => (
                <div key={idx} className="relative">
                  {idx !== 0 && (
                    <div className="absolute -top-6 left-[-11px] bg-white text-emerald-300">
                      <ArrowDown className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex items-start gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-emerald-300 transition-colors">
                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg shrink-0">
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{step.name}</h3>
                      <p className="text-sm text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}