import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, query, where, orderBy, onSnapshot, FirebaseUser, Timestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { Activity, ActivityType } from '../types';
import { BookOpen, Dumbbell, Utensils, Plus, Clock, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ActivityTrackerProps {
  user: FirebaseUser;
  type: ActivityType;
}

export default function ActivityTracker({ user, type }: ActivityTrackerProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  const config = {
    study: { 
      icon: BookOpen, 
      label: 'Study Time', 
      unit: 'min', 
      color: 'bg-blue-500', 
      text: 'text-blue-500', 
      placeholder: 'Duration in minutes',
      noteLabel: 'What did you learn?',
      notePlaceholder: 'Describe the topics you covered and key takeaways...',
      isNoteRequired: true
    },
    exercise: { 
      icon: Dumbbell, 
      label: 'Exercise', 
      unit: 'min', 
      color: 'bg-green-500', 
      text: 'text-green-500', 
      placeholder: 'Duration in minutes',
      noteLabel: 'Note (Optional)',
      notePlaceholder: 'What did you do?',
      isNoteRequired: false
    },
    nutrition: { 
      icon: Utensils, 
      label: 'Nutrition', 
      unit: 'kcal', 
      color: 'bg-orange-500', 
      text: 'text-orange-500', 
      placeholder: 'Calories in kcal',
      noteLabel: 'Note (Optional)',
      notePlaceholder: 'What did you eat?',
      isNoteRequired: false
    },
  }[type];

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'activities'),
      where('type', '==', type),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/activities`);
    });

    return () => unsubscribe();
  }, [user.uid, type]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || isNaN(Number(value))) return;

    try {
      const path = `users/${user.uid}/activities`;
      await addDoc(collection(db, path), {
        uid: user.uid,
        type,
        value: Number(value),
        unit: config.unit,
        note,
        timestamp: Timestamp.now()
      });
      setValue('');
      setNote('');
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/activities`);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-neutral-900/10", config.color)}>
            <config.icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">{config.label}</h1>
            <p className="text-neutral-500">Log and monitor your {type} sessions.</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all",
            isAdding ? "bg-neutral-100 text-neutral-600" : "bg-neutral-900 text-white shadow-lg shadow-neutral-900/20"
          )}
        >
          {isAdding ? 'Cancel' : <><Plus className="w-5 h-5" /> Add Log</>}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700">Value ({config.unit})</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={config.placeholder}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700">{config.noteLabel}</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={config.notePlaceholder}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all resize-none"
                    required={config.isNoteRequired}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-colors"
              >
                Save Activity
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
          </div>
        ) : activities.length > 0 ? (
          activities.map((activity, i) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-neutral-50 mt-1", config.text)}>
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl font-bold text-neutral-900">{activity.value} {activity.unit}</span>
                    <span className="text-neutral-400 text-sm">{format(activity.timestamp.toDate(), 'MMM d, h:mm a')}</span>
                  </div>
                  {activity.note && (
                    <div className={cn(
                      "p-4 rounded-2xl",
                      type === 'study' ? "bg-blue-50 text-blue-900 border border-blue-100" : "bg-neutral-50 text-neutral-600"
                    )}>
                      {type === 'study' && <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-60">Learned Materials:</p>}
                      <p className="text-sm whitespace-pre-wrap">{activity.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-neutral-300">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <config.icon className="w-8 h-8 text-neutral-300" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">No logs yet</h3>
            <p className="text-neutral-500">Start tracking your {type} today!</p>
          </div>
        )}
      </div>
    </div>
  );
}
