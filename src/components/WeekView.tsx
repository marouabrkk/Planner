import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check, Trash2, Plus, BarChart2 } from 'lucide-react';
import { Task } from '../types';

interface WeekViewProps {
  tasks: Task[];
  todayStr: string;
  selectedMonth: number;
  selectedYear: number;
  weekOffset: number;
  onNavigateWeek: (delta: number) => void;
  onResetWeek: () => void;
  onToggleTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onOpenAddModal: (dateStr: string) => void;
}

const DAYS_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const SHORT_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const WeekView: React.FC<WeekViewProps> = ({
  tasks,
  todayStr,
  selectedMonth,
  selectedYear,
  weekOffset,
  onNavigateWeek,
  onResetWeek,
  onToggleTask,
  onDeleteTask,
  onOpenAddModal
}) => {
  // Base date from selected month and year
  const baseDate = new Date(selectedYear, selectedMonth, 15);
  const monday = getMonday(baseDate);
  monday.setDate(monday.getDate() + weekOffset * 7);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const startFormatted = monday.getDate();
  const endFormatted = sunday.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Calculate scores for each of the 7 days
  const weekDaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dateStr = formatDateISO(d);
    const dayTasks = tasks.filter((t) => t.date === dateStr);
    const doneCount = dayTasks.filter((t) => t.done).length;
    const score = dayTasks.length > 0 ? Math.round((doneCount / dayTasks.length) * 100) : 0;
    const isToday = dateStr === todayStr;

    return {
      date: d,
      dateStr,
      dayName: DAYS_NAMES[i],
      shortName: SHORT_DAYS[i],
      dayNumber: d.getDate(),
      tasks: dayTasks,
      doneCount,
      totalCount: dayTasks.length,
      score,
      isToday
    };
  });

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Diagramme de Complétion Journalière */}
      <div className="bg-[#111522] border border-[#22293d] rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
              <BarChart2 className="w-4 h-4" />
            </span>
            <strong className="text-sm font-bold text-white">
              Diagramme de Complétion Journalière (%)
            </strong>
          </div>
          <span className="text-[11px] text-slate-400">Mise à jour en temps réel</span>
        </div>

        {/* Chart Bars */}
        <div className="h-44 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 bg-[#171c2c]/60 rounded-xl border border-[#22293d]">
          {weekDaysData.map((day) => {
            const barHeight = Math.max(day.score, 4);
            return (
              <div
                key={day.dateStr}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Score tooltip above bar */}
                <div className="text-[10px] font-bold text-cyan-300 opacity-80 group-hover:opacity-100 transition-opacity mb-1">
                  {day.score}%
                </div>

                {/* Bar */}
                <div className="w-full max-w-[42px] bg-[#1f263b] rounded-t-lg h-full flex items-end overflow-hidden p-0.5">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ease-out ${
                      day.score === 100
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : day.score > 0
                        ? 'bg-gradient-to-t from-indigo-600 to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.25)]'
                        : 'bg-transparent'
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>

                {/* Day label */}
                <div className="text-center mt-2">
                  <span
                    className={`text-[11px] font-bold block ${
                      day.isToday ? 'text-indigo-400 font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    {day.shortName}
                  </span>
                  <span className="text-[10px] text-slate-500">{day.dayNumber}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Week Toolbar */}
      <div className="flex flex-wrap justify-between items-center bg-[#111522] border border-[#22293d] px-4 py-2.5 rounded-xl gap-2 shadow-sm">
        <button
          type="button"
          onClick={() => onNavigateWeek(-1)}
          className="flex items-center gap-1 bg-[#171c2c] hover:bg-[#1f263b] text-slate-200 border border-[#22293d] hover:border-indigo-500/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Semaine précédente</span>
        </button>

        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-indigo-400" />
          <strong className="text-xs sm:text-sm font-bold text-white">
            Du {startFormatted} au {endFormatted}
          </strong>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={onResetWeek}
              className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full hover:bg-indigo-500/30 transition-colors ml-1"
            >
              Cette semaine
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onNavigateWeek(1)}
          className="flex items-center gap-1 bg-[#171c2c] hover:bg-[#1f263b] text-slate-200 border border-[#22293d] hover:border-indigo-500/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        >
          <span>Semaine suivante</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 7 Days Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 overflow-x-auto pb-1">
        {weekDaysData.map((day) => (
          <div
            key={day.dateStr}
            className={`bg-[#111522] border rounded-2xl p-3 flex flex-col gap-2 min-h-[300px] transition-all shadow-sm ${
              day.isToday
                ? 'border-indigo-500 shadow-[0_0_18px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/40'
                : 'border-[#22293d] hover:border-[#374261]'
            }`}
          >
            {/* Column Head */}
            <div className="text-center pb-2 border-b border-[#22293d]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {day.dayName}
              </div>
              <div
                className={`text-xl font-extrabold my-0.5 ${
                  day.isToday ? 'text-indigo-400' : 'text-white'
                }`}
              >
                {day.dayNumber}
              </div>
              <div className="text-[10px] font-bold text-cyan-400">
                {day.score}% complété
              </div>
            </div>

            {/* Mini Tasks List */}
            <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-0.5">
              {day.tasks.length === 0 ? (
                <div className="text-center text-slate-600 text-[11px] py-6 italic">
                  Rien de prévu
                </div>
              ) : (
                day.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`bg-[#171c2c] border border-[#22293d] hover:border-[#374261] px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-1.5 transition-all ${
                      task.done ? 'opacity-50' : ''
                    }`}
                  >
                    <div
                      className="flex items-center gap-2 flex-1 overflow-hidden cursor-pointer"
                      onClick={() => onToggleTask(task.id)}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border text-[10px] ${
                          task.done
                            ? 'bg-emerald-500 border-emerald-500 text-black font-bold'
                            : 'border-slate-600 bg-[#1f263b]'
                        }`}
                      >
                        {task.done && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span
                        className={`truncate text-[11px] text-slate-200 ${
                          task.done ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="text-slate-500 hover:text-red-400 p-0.5 rounded hover:bg-red-500/10 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add button */}
            <button
              type="button"
              onClick={() => onOpenAddModal(day.dateStr)}
              className="w-full flex items-center justify-center gap-1 bg-[#171c2c] hover:bg-[#1f263b] text-slate-300 hover:text-white border border-[#22293d] hover:border-indigo-500/40 py-1.5 rounded-lg text-[11px] font-semibold transition-all mt-auto"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ajouter</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
