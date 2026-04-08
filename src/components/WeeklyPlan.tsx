import React, { useState, useEffect } from 'react';
import { WeeklyTask, Metric, UserProfile } from '../types';
import { Calendar, CheckCircle2, Circle, Sparkles, Loader2, Info, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { startOfWeek, format, addDays } from 'date-fns';
import { db, collection, query, where, onSnapshot, FirebaseUser, doc, updateDoc, addDoc, getDocs, writeBatch, deleteDoc, getDoc, handleFirestoreError, OperationType, orderBy, limit } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn, calculateAge } from '../lib/utils';
import { getWeeklyPlan } from '../services/geminiService';

interface WeeklyPlanProps {
  user: FirebaseUser;
  type: 'study' | 'exercise' | 'nutrition';
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export default function WeeklyPlan({ user, type }: WeeklyPlanProps) {
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(format(new Date(), 'EEEE'));
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'weekly_tasks'),
      where('type', '==', type),
      where('weekStart', '==', weekStart)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklyTask)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid, type, weekStart]);

  const toggleTask = async (task: WeeklyTask) => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'weekly_tasks', task.id!), {
        completed: !task.completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/weekly_tasks/${task.id}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'weekly_tasks', taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/weekly_tasks/${taskId}`);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const path = `users/${user.uid}/weekly_tasks`;
    try {
      await addDoc(collection(db, path), {
        uid: user.uid,
        type,
        day: selectedDay,
        title: newTaskTitle,
        description: newTaskDesc,
        completed: false,
        weekStart
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setIsAddingTask(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const generatePlan = async () => {
    setGenerating(true);
    try {
      // Get latest metrics for AI context
      const metricsPath = `users/${user.uid}/metrics`;
      const metricsSnap = await getDocs(query(
        collection(db, metricsPath),
        where('uid', '==', user.uid)
      ));
      const latestMetric = metricsSnap.docs
        .map(d => d.data() as Metric)
        .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0];

      // Get user profile for birthDate - Use getDoc instead of query on collection
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      const profile = userDocSnap.data() as UserProfile | undefined;
      const age = profile?.birthDate ? calculateAge(profile.birthDate) : undefined;

      // Get transactions for nutrition context
      let transactions: any[] = [];
      if (type === 'nutrition') {
        const transSnap = await getDocs(query(
          collection(db, 'users', user.uid, 'transactions'),
          orderBy('date', 'desc'),
          limit(20)
        ));
        transactions = transSnap.docs.map(d => d.data());
      }

      const plan = await getWeeklyPlan(type, latestMetric?.weight, latestMetric?.height, age, transactions);
      
      const batch = writeBatch(db);
      
      // Delete existing tasks for this week and type
      tasks.forEach(t => {
        batch.delete(doc(db, 'users', user.uid, 'weekly_tasks', t.id!));
      });

      // Add new tasks
      const sortedPlan = [...plan].sort((a: any, b: any) => {
        if (a.day !== b.day) return 0; // Keep day grouping
        return a.title.localeCompare(b.title); // Sort by title (time)
      });

      sortedPlan.forEach((item: any) => {
        const newDocRef = doc(collection(db, 'users', user.uid, 'weekly_tasks'));
        batch.set(newDocRef, {
          uid: user.uid,
          type,
          day: item.day,
          title: item.title,
          description: item.description || '',
          completed: false,
          weekStart
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error generating plan:", error);
      if (error instanceof Error && !error.message.includes('{')) {
        alert("Gagal membuat rencana: " + error.message);
      } else {
        alert("Gagal membuat rencana. Silakan coba lagi.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const filteredTasks = tasks
    .filter(t => t.day === selectedDay)
    .sort((a, b) => a.title.localeCompare(b.title));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
            type === 'study' ? "bg-blue-500 shadow-blue-500/20" :
            type === 'exercise' ? "bg-green-500 shadow-green-500/20" :
            "bg-orange-500 shadow-orange-500/20"
          )}>
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 capitalize">Weekly {type} Plan</h1>
            <p className="text-neutral-500">
              {type === 'study' ? 'Kelola rencana belajar mingguan Anda.' : 'Rencana mingguan yang dipersonalisasi oleh AI.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {type !== 'study' && (
            <button
              onClick={generatePlan}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-2xl font-semibold hover:bg-neutral-800 transition-all disabled:opacity-50 shadow-lg shadow-neutral-900/20"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-yellow-400" />}
              {tasks.length > 0 ? 'Regenerate Plan' : 'Generate with AI'}
            </button>
          )}
          <button
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-neutral-900 border border-neutral-200 rounded-2xl font-semibold hover:bg-neutral-50 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>
      </header>

      {/* Day Selector */}
      <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={cn(
              "px-6 py-3 rounded-2xl font-medium whitespace-nowrap transition-all border",
              selectedDay === day 
                ? "bg-neutral-900 text-white border-neutral-900 shadow-md" 
                : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
            )}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="wait">
          {isAddingTask && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm"
            >
              <form onSubmit={addTask} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-neutral-900">Add New Task for {selectedDay}</h3>
                  <button type="button" onClick={() => setIsAddingTask(false)} className="text-neutral-400 hover:text-neutral-900">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Task Title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none"
                  autoFocus
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 outline-none min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="px-4 py-2 text-neutral-500 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800"
                  >
                    Add Task
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {filteredTasks.length > 0 ? (
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {filteredTasks.map((task) => (
                <div 
                  key={task.id}
                  className={cn(
                    "group bg-white p-6 rounded-3xl border transition-all flex items-start gap-4",
                    task.completed ? "border-neutral-100 opacity-60" : "border-neutral-200 hover:border-neutral-300 shadow-sm"
                  )}
                >
                  <button 
                    onClick={() => toggleTask(task)}
                    className="mt-1 text-neutral-400 hover:text-neutral-900 transition-colors"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className={cn(
                      "text-lg font-bold text-neutral-900 mb-1",
                      task.completed && "line-through text-neutral-400"
                    )}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-neutral-500 text-sm leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => deleteTask(task.id!)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </motion.div>
          ) : (
            !isAddingTask && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-12 rounded-3xl border border-dashed border-neutral-300 text-center"
              >
                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-neutral-300" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">No tasks for {selectedDay}</h3>
                <p className="text-neutral-500 mb-6">
                  {type === 'study' ? 'Tambah tugas belajar Anda secara manual.' : 'Generate a weekly plan with AI or add manually.'}
                </p>
                <div className="flex items-center justify-center gap-3">
                  {type !== 'study' && (
                    <button
                      onClick={generatePlan}
                      disabled={generating}
                      className="px-8 py-3 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 transition-all disabled:opacity-50"
                    >
                      {generating ? 'Generating...' : 'Generate Plan Now'}
                    </button>
                  )}
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="px-8 py-3 bg-white text-neutral-900 border border-neutral-200 rounded-2xl font-bold hover:bg-neutral-50 transition-all"
                  >
                    Add Task Manually
                  </button>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {tasks.length > 0 && (
        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-start gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <Info className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h4 className="font-bold text-indigo-900 mb-1">Tips Mingguan</h4>
            <p className="text-indigo-700 text-sm">
              Rencana ini dibuat khusus untuk Anda. Cobalah untuk konsisten dan selesaikan tugas setiap hari untuk hasil maksimal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
