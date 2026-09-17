import React from 'react';
import { Flame, CheckCircle2, Zap, TrendingUp } from 'lucide-react';
import { Task, Habit } from '../types';

interface HeroStatsProps {
  tasks: Task[];
  habits: Habit[];
  todayStr: string;
}

export const HeroStats: React.FC<HeroStatsProps> = ({ tasks, habits, todayStr }) => {
  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const tasksDone = todayTasks.filter((t) => t.done).length;
  const tasksPct = todayTasks.length > 0 ? Math.round((tasksDone / todayTasks.length) * 100) : 0;

  const habitsDone = habits.filter((h) => h.doneToday).length;
  const habitsPct = habits.length > 0 ? Math.round((habitsDone / habits.length) * 100) : 0;

  const globalScore = Math.round(
    todayTasks.length > 0 && habits.length > 0
      ? (tasksPct + habitsPct) / 2
      : todayTasks.length > 0
      ? tasksPct
      : habits.length > 0
      ? habitsPct
      : 0
  );

  let topStreak = 0;
  habits.forEach((h) => {
    if (h.streak > topStreak) topStreak = h.streak;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* KPI 1: Progression Globale */}
      <div className="bg-[#111522] border border-[#22293d] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:border-[#374261] transition-all shadow-sm">
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            Progression Globale
          </span>
          <span className="text-cyan-400 font-extrabold">Score Total</span>
        </div>
        <div className="text-3xl font-black my-2 flex items-baseline gap-1.5 text-white">
          <span>{globalScore}%</span>
        </div>
        <div>
          <div className="w-full h-2 bg-[#1f263b] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${globalScore}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0%</span>
            <span>Objectif 100%</span>
          </div>
        </div>
      </div>

      {/* KPI 2: Consistance & Flame */}
      <div className="bg-[#111522] border border-[#22293d] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-sm">
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Série la plus longue
          </span>
          <span className="text-amber-400 font-extrabold">Consistance</span>
        </div>
        <div className="text-3xl font-black my-2 text-amber-400 flex items-baseline gap-1.5">
          <span>{topStreak}</span>
          <span className="text-sm font-bold text-amber-300/80">jours consécutifs 🔥</span>
        </div>
        <div className="text-xs text-slate-400">
          {topStreak >= 3 ? 'Excellente régularité continue !' : 'Validez vos habitudes chaque jour pour alimenter la flamme.'}
        </div>
      </div>

      {/* KPI 3: Tâches du jour */}
      <div className="bg-[#111522] border border-[#22293d] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-sm">
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Tâches du jour
          </span>
          <span className="text-emerald-400 font-extrabold">
            {tasksDone}/{todayTasks.length}
          </span>
        </div>
        <div className="text-3xl font-black my-2 text-white flex items-baseline gap-1.5">
          <span>{tasksPct}%</span>
          <span className="text-xs text-slate-400 font-medium">complété</span>
        </div>
        <div>
          <div className="w-full h-2 bg-[#1f263b] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${tasksPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>{tasksDone} terminée(s)</span>
            <span>{Math.max(0, todayTasks.length - tasksDone)} restante(s)</span>
          </div>
        </div>
      </div>

      {/* KPI 4: Habitudes du jour */}
      <div className="bg-[#111522] border border-[#22293d] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-sm">
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Habitudes du jour
          </span>
          <span className="text-amber-400 font-extrabold">
            {habitsDone}/{habits.length}
          </span>
        </div>
        <div className="text-3xl font-black my-2 text-white flex items-baseline gap-1.5">
          <span>{habitsPct}%</span>
          <span className="text-xs text-slate-400 font-medium">routine active</span>
        </div>
        <div>
          <div className="w-full h-2 bg-[#1f263b] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${habitsPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>{habitsDone} cochée(s)</span>
            <span>{habits.length} au total</span>
          </div>
        </div>
      </div>
    </div>
  );
};
