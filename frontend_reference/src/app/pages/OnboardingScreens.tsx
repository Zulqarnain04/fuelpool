import { motion } from "motion/react";
import { 
  Wifi, 
  Battery, 
  Droplet, 
  Leaf, 
  Loader2, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  ChevronDown, 
  MapPin, 
  Clock, 
  ArrowRight,
  EyeOff
} from "lucide-react";
import { clsx } from "clsx";

export function OnboardingScreens() {
  return (
    <div className="p-4 md:p-8 min-h-screen bg-fp-bg">
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Onboarding Experience</h1>
        <p className="text-slate-500 font-medium mt-2">High-fidelity screens illustrating the setup flow.</p>
      </div>

      {/* Horizontal scroll container for phones */}
      <div className="flex gap-8 overflow-x-auto pb-12 px-4 snap-x snap-mandatory hide-scrollbar items-start">
        
        {/* Splash (Loading State) */}
        <MobileFrame title="Splash (Loading State)" id="splash">
          <div className="absolute inset-0 bg-fp-primary flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative flex items-center justify-center w-24 h-24 bg-white rounded-3xl shadow-2xl mb-6"
            >
              <Droplet className="w-12 h-12 text-fp-primary fill-fp-primary" />
              <Leaf className="w-6 h-6 text-fp-carpool-light fill-fp-carpool-light absolute bottom-5 right-5" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-16">FuelPool</h2>
            
            <div className="absolute bottom-24 flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-white animate-spin opacity-80" />
              <span className="text-fp-primary-light text-sm font-medium">Optimizing your route...</span>
            </div>
          </div>
        </MobileFrame>

        {/* Login (Error State) */}
        <MobileFrame title="Login (Error State)" id="login">
          <div className="px-6 pt-12 pb-6 flex flex-col h-full bg-white">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-fp-primary rounded-xl flex items-center justify-center shadow-md">
                <Droplet className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900 tracking-tight">FuelPool</span>
            </div>
            
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h1>
              <p className="text-slate-500 text-sm">Log in to track your fuel and find rides.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Email or Phone Number</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value="amirul@gmail.com"
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 font-medium focus:outline-none" 
                  />
                </div>
              </div>

              {/* Error State Input */}
              <div className="relative">
                <label className="text-sm font-medium text-fp-danger block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-4 top-3.5 text-fp-danger" />
                  <input 
                    type="password" 
                    value="wrongpassword"
                    readOnly
                    className="w-full bg-fp-danger/5 border-2 border-fp-danger rounded-xl pl-12 pr-12 py-3.5 text-slate-900 font-medium focus:outline-none" 
                  />
                  <EyeOff className="w-5 h-5 absolute right-4 top-3.5 text-slate-400" />
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <AlertCircle className="w-4 h-4 text-fp-danger" />
                  <span className="text-xs font-medium text-fp-danger">Incorrect password. Please try again.</span>
                </div>
              </div>
            </div>

            <div className="mt-4 mb-8 text-right">
              <a href="#" className="text-sm font-bold text-fp-primary">Forgot Password?</a>
            </div>

            <div className="mt-auto">
              <button className="w-full bg-fp-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-fp-primary/30 flex items-center justify-center gap-2 mb-4 hover:bg-fp-primary/90 transition-colors">
                Log In
              </button>
              <p className="text-center text-sm font-medium text-slate-600">
                Don't have an account? <a href="#" className="text-fp-primary font-bold">Sign Up</a>
              </p>
            </div>
          </div>
        </MobileFrame>

        {/* Register (Validation State) */}
        <MobileFrame title="Register (Validation State)" id="register">
          <div className="px-6 pt-12 pb-6 flex flex-col h-full bg-white">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
              <p className="text-slate-500 text-sm">Join the smartest commuting network.</p>
            </div>

            <div className="space-y-5 flex-1">
              {/* Validated Input */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-4 top-3.5 text-fp-primary" />
                  <input 
                    type="text" 
                    value="Amirul Asyraf"
                    readOnly
                    className="w-full bg-white border-2 border-fp-primary/50 rounded-xl pl-12 pr-12 py-3.5 text-slate-900 font-medium focus:outline-none" 
                  />
                  <CheckCircle2 className="w-5 h-5 absolute right-4 top-3.5 text-fp-primary" />
                </div>
              </div>

              {/* Validated Input */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-4 top-3.5 text-fp-primary" />
                  <input 
                    type="email" 
                    value="amirul.asyraf@utm.my"
                    readOnly
                    className="w-full bg-white border-2 border-fp-primary/50 rounded-xl pl-12 pr-12 py-3.5 text-slate-900 font-medium focus:outline-none" 
                  />
                  <CheckCircle2 className="w-5 h-5 absolute right-4 top-3.5 text-fp-primary" />
                </div>
                <span className="text-xs text-fp-secondary font-semibold mt-1.5 block flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Student email detected (Eligible for discounts)
                </span>
              </div>

              {/* Default Input */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    readOnly
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 focus:outline-none" 
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 mb-4 hover:bg-slate-800 transition-colors">
                Continue <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-center text-xs font-medium text-slate-500">
                By registering, you agree to our <a href="#" className="underline">Terms</a> & <a href="#" className="underline">Privacy Policy</a>
              </p>
            </div>
          </div>
        </MobileFrame>

        {/* Welcome (Animation/Success State) */}
        <MobileFrame title="Welcome" id="welcome">
          <div className="px-6 flex flex-col h-full bg-fp-primary relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-20 right-[-40px] w-64 h-64 bg-fp-carpool rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-40 left-[-40px] w-64 h-64 bg-fp-primary-light rounded-full blur-3xl opacity-20"></div>

            <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl"
              >
                <CheckCircle2 className="w-12 h-12 text-fp-primary" />
              </motion.div>
              
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-4xl font-bold text-white mb-4 leading-tight"
              >
                Welcome,<br/>Amirul!
              </motion.h1>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-fp-primary-light text-lg font-medium max-w-[280px]"
              >
                Your account is ready. Let's set up your vehicle to calculate your savings.
              </motion.p>
            </div>

            <motion.div 
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-auto pb-8 relative z-10"
            >
              <button className="w-full bg-white text-fp-primary font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                Setup Vehicle <ArrowRight className="w-5 h-5" />
              </button>
              <button className="w-full mt-4 text-white font-semibold py-3">
                Skip for now
              </button>
            </motion.div>
          </div>
        </MobileFrame>

        {/* Vehicle Setup (Default State) */}
        <MobileFrame title="Vehicle Setup" id="vehicle">
          <div className="flex flex-col h-full bg-fp-bg">
            <div className="px-6 pt-6 pb-4 bg-white shadow-sm relative z-10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-400">Step 1 of 2</span>
                <span className="text-xs font-bold bg-fp-primary-light text-fp-primary px-2 py-1 rounded-full">BUDI95 Eligible</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-1/2 h-full bg-fp-primary rounded-full"></div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Vehicle</h2>
                <p className="text-slate-500 text-sm">Add your car details to help us calculate fuel efficiency accurately.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Make</label>
                    <div className="relative">
                      <input type="text" value="Perodua" readOnly className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-slate-900 font-semibold focus:outline-none" />
                      <ChevronDown className="w-5 h-5 absolute right-3 top-3.5 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Model</label>
                    <div className="relative">
                      <input type="text" value="Myvi (Gen 3)" readOnly className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-slate-900 font-semibold focus:outline-none" />
                      <ChevronDown className="w-5 h-5 absolute right-3 top-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Fuel Type</label>
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 bg-fp-primary border-2 border-fp-primary text-white font-bold rounded-xl shadow-sm shadow-fp-primary/20">
                      RON 95
                    </button>
                    <button className="flex-1 py-3 bg-white border-2 border-slate-200 text-slate-500 font-bold rounded-xl hover:border-slate-300">
                      RON 97
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Tank Cap.</label>
                    <div className="relative">
                      <input type="text" value="36" readOnly className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-slate-900 font-semibold focus:outline-none" />
                      <span className="absolute right-4 top-3.5 text-slate-400 font-medium">L</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Efficiency</label>
                    <div className="relative">
                      <input type="text" value="21.1" readOnly className="w-white bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-slate-900 font-semibold text-fp-primary focus:outline-none" />
                      <span className="absolute right-3 top-3.5 text-slate-400 font-medium text-sm">km/L</span>
                    </div>
                    <span className="text-[10px] text-fp-primary font-medium mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Auto-filled</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Current Odometer</label>
                  <div className="relative">
                    <input type="text" value="45,200" readOnly className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-slate-900 font-semibold focus:outline-none" />
                    <span className="absolute right-4 top-3.5 text-slate-400 font-medium">km</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100">
              <button className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                Next: Set Route <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </MobileFrame>

        {/* Route Setup (Default State) */}
        <MobileFrame title="Route Setup" id="route">
          <div className="flex flex-col h-full bg-fp-bg">
            <div className="px-6 pt-6 pb-4 bg-white shadow-sm relative z-10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-400">Step 2 of 2</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-full h-full bg-fp-primary rounded-full"></div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Commute Route</h2>
                <p className="text-slate-500 text-sm">Set your daily commute to auto-match with passengers and save on fuel.</p>
              </div>

              {/* Route Input */}
              <div className="relative bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="absolute left-[27px] top-9 bottom-9 w-0.5 bg-slate-200"></div>
                
                <div className="flex gap-3 mb-4">
                  <div className="mt-2.5 w-3 h-3 rounded-full bg-fp-secondary shrink-0 relative z-10 shadow-[0_0_0_4px_white]"></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Home</label>
                    <input type="text" value="Kolej 17, UTM" readOnly className="w-full font-semibold text-slate-900 bg-transparent focus:outline-none" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-2.5 w-3 h-3 rounded-full bg-fp-danger shrink-0 relative z-10 shadow-[0_0_0_4px_white]"></div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Destination</label>
                    <input type="text" value="Faculty of Computing, UTM" readOnly className="w-full font-semibold text-slate-900 bg-transparent focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* Schedule Input */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Depart At</label>
                    <div className="relative">
                      <Clock className="w-5 h-5 absolute left-4 top-3.5 text-fp-primary" />
                      <input type="text" value="08:00 AM" readOnly className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 font-semibold focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Return At</label>
                    <div className="relative">
                      <Clock className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                      <input type="text" value="05:00 PM" readOnly className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 font-semibold focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2.5">Active Days</label>
                  <div className="flex justify-between">
                    {['M','T','W','T','F','S','S'].map((day, i) => (
                      <button 
                        key={i} 
                        className={clsx(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors",
                          i < 5 
                            ? "bg-fp-primary text-white shadow-md shadow-fp-primary/30" 
                            : "bg-white border border-slate-200 text-slate-400"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Auto Request Toggle */}
              <div className="bg-fp-ai-light/50 border border-fp-ai/20 p-4 rounded-xl flex items-start gap-3 mt-2">
                <div className="mt-0.5">
                  <div className="w-12 h-6 bg-fp-ai rounded-full p-1 cursor-pointer transition-colors relative">
                    <motion.div className="w-4 h-4 bg-white rounded-full ml-6 shadow-sm"></motion.div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Smart Seat Auto-Match</h4>
                  <p className="text-xs text-slate-500 mt-1">Automatically list available seats 2 hours before departure to maximize savings.</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 mt-auto">
              <button className="w-full bg-fp-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-fp-primary/30 flex items-center justify-center gap-2 hover:bg-fp-primary/90 transition-colors">
                Complete Setup
              </button>
            </div>
          </div>
        </MobileFrame>

      </div>
    </div>
  );
}

function MobileFrame({ children, title, id }: { children: React.ReactNode, title: string, id: string }) {
  return (
    <div className="flex flex-col gap-4 items-center snap-center" id={id}>
      <h3 className="font-bold text-slate-700 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">{title}</h3>
      <div className="w-[390px] h-[844px] shrink-0 border-[12px] border-slate-900 rounded-[3rem] overflow-hidden relative bg-white shadow-2xl flex flex-col">
        
        {/* Status bar mock */}
        <div className="h-12 w-full absolute top-0 z-50 flex justify-between items-center px-7 text-[13px] font-bold pointer-events-none">
          <span className={clsx("transition-colors", id === 'splash' || id === 'welcome' ? 'text-white' : 'text-slate-900')}>9:41</span>
          <div className={clsx("flex gap-1.5 transition-colors", id === 'splash' || id === 'welcome' ? 'text-white' : 'text-slate-900')}>
            <Wifi className="w-4 h-4"/>
            <Battery className="w-4 h-4"/>
          </div>
        </div>
        
        {/* Dynamic Island / Notch Mock */}
        <div className="absolute top-0 inset-x-0 h-7 bg-slate-900 w-36 mx-auto rounded-b-3xl z-50 pointer-events-none"></div>
        
        <div className="flex-1 w-full h-full relative">
          {children}
        </div>
        
        {/* Home indicator */}
        <div className="absolute bottom-2 inset-x-0 h-1 w-32 bg-slate-900 rounded-full mx-auto z-50 pointer-events-none opacity-50 mix-blend-difference"></div>
      </div>
    </div>
  );
}