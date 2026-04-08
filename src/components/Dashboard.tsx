import { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, FirebaseUser, Timestamp, doc, getDoc, orderBy, limit } from '../lib/firebase';
import { Activity, Task, Metric, UserProfile, WeeklyTask } from '../types';
import { BookOpen, Dumbbell, Utensils, CheckSquare, TrendingUp, Calendar } from 'lucide-react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn, calculateAge } from '../lib/utils';

interface DashboardProps {
  user: FirebaseUser;
}

export default function Dashboard({ user }: DashboardProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTask[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Fetch user profile for age
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setUserProfile({ id: snap.id, ...snap.data() } as any);
      }
    };
    fetchProfile();

    const todayStart = Timestamp.fromDate(startOfDay(new Date()));
    const todayEnd = Timestamp.fromDate(endOfDay(new Date()));

    const qActivities = query(
      collection(db, 'users', user.uid, 'activities'),
      where('timestamp', '>=', todayStart),
      where('timestamp', '<=', todayEnd)
    );

    const qTasks = query(
      collection(db, 'users', user.uid, 'tasks'),
      where('createdAt', '>=', todayStart)
    );

    const qMetrics = query(
      collection(db, 'users', user.uid, 'metrics'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );

    const qWeeklyTasks = query(
      collection(db, 'users', user.uid, 'weekly_tasks'),
      where('day', '==', format(new Date(), 'EEEE'))
    );

    const unsubActivities = onSnapshot(qActivities, (snap) => {
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
    });

    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });

    const unsubMetrics = onSnapshot(qMetrics, (snap) => {
      setMetrics(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Metric)));
    });

    const unsubWeeklyTasks = onSnapshot(qWeeklyTasks, (snap) => {
      setWeeklyTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyTask)));
    });

    return () => {
      unsubActivities();
      unsubTasks();
      unsubMetrics();
      unsubWeeklyTasks();
    };
  }, [user.uid]);

  const stats = [
    { 
      label: 'Study Plan', 
      value: weeklyTasks.filter(t => t.type === 'study' && t.completed).length, 
      total: weeklyTasks.filter(t => t.type === 'study').length,
      unit: 'tasks', 
      icon: BookOpen,
      color: 'bg-blue-500'
    },
    { 
      label: 'Exercise Plan', 
      value: weeklyTasks.filter(t => t.type === 'exercise' && t.completed).length, 
      total: weeklyTasks.filter(t => t.type === 'exercise').length,
      unit: 'tasks', 
      icon: Dumbbell,
      color: 'bg-green-500'
    },
    { 
      label: 'Nutrition Plan', 
      value: weeklyTasks.filter(t => t.type === 'nutrition' && t.completed).length, 
      total: weeklyTasks.filter(t => t.type === 'nutrition').length,
      unit: 'tasks', 
      icon: Utensils,
      color: 'bg-orange-500'
    },
    { 
      label: 'Daily Tasks', 
      value: tasks.filter(t => t.completed).length, 
      total: tasks.length,
      unit: '', 
      icon: CheckSquare,
      color: 'bg-purple-500'
    },
  ];

  const chartData = stats.map(s => ({
    name: s.label,
    value: s.value,
    color: s.color.replace('bg-', '')
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Hello, {user.displayName?.split(' ')[0]}!</h1>
          <p className="text-neutral-500">Here's your progress for today, {format(new Date(), 'MMMM do, yyyy')}.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-neutral-200 text-neutral-600 shadow-sm">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium">Today</span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-neutral-500 text-sm font-medium">{stat.label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-neutral-900">
                {stat.total !== undefined ? `${stat.value}/${stat.total}` : stat.value}
              </span>
              <span className="text-neutral-400 text-sm">{stat.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">Activity Overview</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8f8f8' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color.includes('blue') ? '#3b82f6' : entry.color.includes('green') ? '#22c55e' : entry.color.includes('orange') ? '#f97316' : '#a855f7'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Recent Metrics</h2>
          {metrics.length > 0 ? (
            <div className="space-y-6">
              {metrics.slice(0, 3).map((m, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-neutral-200">
                      <TrendingUp className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{format(m.timestamp.toDate(), 'MMM d')}</p>
                      <p className="text-xs text-neutral-500">Body Growth Log</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-neutral-900">{m.weight}kg</p>
                    <p className="text-xs text-neutral-500">{m.height}cm</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-neutral-300" />
              </div>
              <p className="text-neutral-400 text-sm">No metrics recorded today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


