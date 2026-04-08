import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, query, where, orderBy, onSnapshot, FirebaseUser, Timestamp, handleFirestoreError, OperationType, doc, updateDoc, getDoc } from '../lib/firebase';
import { Metric } from '../types';
import { TrendingUp, Plus, Ruler, Weight, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, calculateAge } from '../lib/utils';

interface MetricTrackerProps {
  user: FirebaseUser;
}

export default function MetricTracker({ user }: MetricTrackerProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile(data);
        if (data.birthDate) setBirthDate(data.birthDate);
      }
    };
    fetchProfile();
  }, [user.uid]);

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'metrics'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMetrics(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Metric)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/metrics`);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight && !height && !birthDate) return;

    try {
      // Add to metrics collection
      await addDoc(collection(db, 'users', user.uid, 'metrics'), {
        uid: user.uid,
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        timestamp: Timestamp.now()
      });

      // Update user profile with birthDate if provided
      if (birthDate) {
        await updateDoc(doc(db, 'users', user.uid), {
          birthDate: birthDate
        });
      }

      setWeight('');
      setHeight('');
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/metrics`);
    }
  };

  const chartData = metrics.map(m => ({
    date: format(m.timestamp.toDate(), 'MMM d'),
    weight: m.weight,
    height: m.height
  }));

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Body Growth</h1>
            <p className="text-neutral-500">Track your weight and height over time.</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all",
            isAdding ? "bg-neutral-100 text-neutral-600" : "bg-neutral-900 text-white shadow-lg shadow-neutral-900/20"
          )}
        >
          {isAdding ? 'Cancel' : <><Plus className="w-5 h-5" /> Log Metrics</>}
        </button>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAdd} className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                    <Weight className="w-4 h-4" /> Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 70.5"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                    <Ruler className="w-4 h-4" /> Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="e.g. 175"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Birth Date
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-colors shadow-lg shadow-neutral-900/20"
              >
                Save Metrics
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Weight Progress</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Height Progress</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a3a3a3', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="height" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-neutral-600 flex items-center gap-2"><Calendar className="w-4 h-4" /> Date</th>
              <th className="px-6 py-4 text-sm font-semibold text-neutral-600"><Weight className="w-4 h-4 inline mr-2" /> Weight</th>
              <th className="px-6 py-4 text-sm font-semibold text-neutral-600"><Ruler className="w-4 h-4 inline mr-2" /> Height</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {metrics.slice().reverse().map((m, i) => (
              <tr key={m.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 text-sm text-neutral-900 font-medium">{format(m.timestamp.toDate(), 'MMMM do, yyyy')}</td>
                <td className="px-6 py-4 text-sm text-neutral-600">{m.weight ? `${m.weight} kg` : '-'}</td>
                <td className="px-6 py-4 text-sm text-neutral-600">{m.height ? `${m.height} cm` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
