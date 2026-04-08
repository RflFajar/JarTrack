import { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  FirebaseUser, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  Timestamp 
} from './lib/firebase';
import { LogIn, LayoutDashboard, BookOpen, Dumbbell, Utensils, CheckSquare, TrendingUp, LogOut, Loader2, User, Wallet, Menu, X as CloseIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Components
import Dashboard from './components/Dashboard';
import WeeklyPlan from './components/WeeklyPlan';
import TaskList from './components/TaskList';
import MetricTracker from './components/MetricTracker';
import Profile from './components/Profile';
import FinanceTracker from './components/FinanceTracker';

type View = 'dashboard' | 'study' | 'exercise' | 'nutrition' | 'tasks' | 'metrics' | 'profile' | 'finance';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Ensure user document exists
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: Timestamp.now()
          });
        }
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => auth.signOut();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-neutral-200/50 p-8 text-center border border-neutral-100"
        >
          <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">LifeTrack</h1>
          <p className="text-neutral-500 mb-8">Track your daily growth, habits, and health in one place.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-neutral-900 text-white py-4 px-6 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-neutral-800 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'study', label: 'Study', icon: BookOpen },
    { id: 'exercise', label: 'Exercise', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrition', icon: Utensils },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'metrics', label: 'Growth', icon: TrendingUp },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row relative overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-neutral-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-neutral-900">LifeTrack</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-all"
        >
          {sidebarOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: sidebarOpen ? (isMobile ? '280px' : '256px') : (isMobile ? '0px' : '80px'),
          x: isMobile && !sidebarOpen ? -280 : 0
        }}
        className={cn(
          "bg-white border-r border-neutral-200 flex flex-col z-50 transition-all duration-300 ease-in-out",
          isMobile ? "fixed inset-y-0 left-0 shadow-2xl" : "relative h-screen sticky top-0"
        )}
      >
        <div className={cn(
          "flex items-center gap-3 px-4 h-20 border-b border-neutral-50 shrink-0",
          !sidebarOpen && !isMobile && "justify-center px-0"
        )}>
          <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="text-white w-6 h-6" />
          </div>
          {(sidebarOpen || isMobile) && (
            <span className="text-xl font-bold text-neutral-900 truncate">LifeTrack</span>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id as View);
                if (isMobile) setSidebarOpen(false);
              }}
              title={!sidebarOpen ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group",
                currentView === item.id 
                  ? "bg-neutral-900 text-white shadow-lg shadow-neutral-900/20" 
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
                !sidebarOpen && !isMobile && "justify-center px-0"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {(sidebarOpen || isMobile) && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-neutral-100 space-y-2">
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-xl bg-neutral-50",
            !sidebarOpen && !isMobile && "justify-center p-1"
          )}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-neutral-200 rounded-full shrink-0" />
            )}
            {(sidebarOpen || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-900 truncate">{user.displayName}</p>
                <p className="text-[10px] text-neutral-500 truncate">{user.email}</p>
              </div>
            )}
          </div>
          
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all",
              !sidebarOpen && !isMobile && "justify-center px-0"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(sidebarOpen || isMobile) && <span>Sign Out</span>}
          </button>
        </div>

        {/* Desktop Toggle Button */}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-24 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 shadow-sm z-50"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'dashboard' && <Dashboard user={user} />}
              {currentView === 'study' && <WeeklyPlan user={user} type="study" />}
              {currentView === 'exercise' && <WeeklyPlan user={user} type="exercise" />}
              {currentView === 'nutrition' && <WeeklyPlan user={user} type="nutrition" />}
              {currentView === 'tasks' && <TaskList user={user} />}
              {currentView === 'metrics' && <MetricTracker user={user} />}
              {currentView === 'finance' && <FinanceTracker user={user} />}
              {currentView === 'profile' && <Profile user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
