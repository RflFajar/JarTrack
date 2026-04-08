import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, query, where, orderBy, onSnapshot, FirebaseUser, Timestamp, updateDoc, doc, deleteDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { Task } from '../types';
import { CheckSquare, Plus, Trash2, Loader2, Square } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TaskListProps {
  user: FirebaseUser;
}

export default function TaskList({ user }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'users', user.uid, 'tasks'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/tasks`);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      await addDoc(collection(db, 'users', user.uid, 'tasks'), {
        uid: user.uid,
        title: newTask,
        completed: false,
        createdAt: Timestamp.now()
      });
      setNewTask('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/tasks`);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const taskRef = doc(db, 'users', user.uid, 'tasks', task.id!);
      await updateDoc(taskRef, {
        completed: !task.completed,
        completedAt: !task.completed ? Timestamp.now() : null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/tasks/${task.id}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/tasks/${taskId}`);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-500 text-white shadow-lg shadow-purple-500/20">
          <CheckSquare className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">To-Do List</h1>
          <p className="text-neutral-500">Manage your daily tasks and goals.</p>
        </div>
      </header>

      <form onSubmit={handleAddTask} className="flex gap-4">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 px-6 py-4 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all shadow-sm"
        />
        <button
          type="submit"
          className="bg-neutral-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-900/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add
        </button>
      </form>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-300" />
          </div>
        ) : tasks.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between group transition-all",
                  task.completed && "bg-neutral-50 border-transparent opacity-70"
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => toggleTask(task)}
                    className={cn(
                      "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                      task.completed ? "bg-purple-500 border-purple-500 text-white" : "border-neutral-200 hover:border-neutral-400"
                    )}
                  >
                    {task.completed && <CheckSquare className="w-4 h-4" />}
                  </button>
                  <div className="flex-1">
                    <p className={cn(
                      "text-lg font-medium text-neutral-900 transition-all",
                      task.completed && "line-through text-neutral-400"
                    )}>
                      {task.title}
                    </p>
                    <p className="text-xs text-neutral-400">Created {format(task.createdAt.toDate(), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id!)}
                  className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-neutral-300">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-8 h-8 text-neutral-300" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">All caught up!</h3>
            <p className="text-neutral-500">You have no tasks to complete.</p>
          </div>
        )}
      </div>
    </div>
  );
}
