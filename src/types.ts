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

export interface Course {
  id: number;
  title: string;
  status: 'todo' | 'doing' | 'done';
  color: string;
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
