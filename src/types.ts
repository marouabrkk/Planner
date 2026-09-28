export interface User {
  email: string;
  id: string;
  role?: 'admin' | 'client';
}

export interface Task {
  id: number;
  title: string;
  done: boolean;
  date: string; // YYYY-MM-DD
  category?: 'task' | 'exam' | 'event' | 'birthday';
}

export interface QcmQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndexes: number[]; // index of correct choices (0 = A, 1 = B, ...)
  explanation?: string;
  source?: string;
  userSelected?: number[];
  validated?: boolean;
  isCorrect?: boolean;
}

export interface CourseCouches {
  c1: boolean; // Couche 1: Apprentissage & Compréhension
  c1Date?: string;
  c2: boolean; // Couche 2: Consolidation & Mémorisation
  c2Date?: string;
  c3: boolean; // Couche 3: Révision Ultime & Annales / QCMs
  c3Date?: string;
}

export interface Course {
  id: number;
  title: string;
  status: 'todo' | 'doing' | 'done';
  color: string;
  couches?: CourseCouches;
  qcms?: QcmQuestion[];
  notes?: string;
}

export interface Habit {
  id: number;
  title: string;
  doneToday: boolean;
  streak: number;
  lastDoneDate?: string;
}

export interface MonthEventItem {
  id: string;
  title: string;
  type?: 'event' | 'birthday' | 'exam' | 'note';
}

export interface UserData {
  tasks: Task[];
  courses: Course[];
  habits: Habit[];
  monthEvents: Record<string, string[]>;
}

export interface PaymentSettings {
  baridiMob: string;
  ccp: string;
  contact: string;
}
