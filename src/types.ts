import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  birthDate?: string; // YYYY-MM-DD
  gender?: 'Male' | 'Female' | 'Other';
  status?: 'Single' | 'Married';
  occupation?: string;
  createdAt: Timestamp;
}

export interface Transaction {
  id?: string;
  uid: string;
  type: 'income' | 'expense';
  date: Timestamp;
  sourceOrCategory: string;
  amount: number;
  quantity?: number;
  note?: string;
}

export type ActivityType = 'study' | 'exercise' | 'nutrition';

export interface Activity {
  id?: string;
  uid: string;
  type: ActivityType;
  value: number;
  unit: string;
  timestamp: Timestamp;
  note?: string;
}

export interface Task {
  id?: string;
  uid: string;
  title: string;
  completed: boolean;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface Metric {
  id?: string;
  uid: string;
  weight?: number;
  height?: number;
  timestamp: Timestamp;
}

export interface WeeklyTask {
  id?: string;
  uid: string;
  type: 'study' | 'exercise' | 'nutrition';
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  title: string;
  description?: string;
  completed: boolean;
  weekStart: string; // YYYY-MM-DD (Monday)
}
