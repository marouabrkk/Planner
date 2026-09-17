import React from 'react';
import { Calendar as CalendarIcon, Flame, Zap, Plus, Trash2 } from 'lucide-react';
import { Task, Habit } from '../types';

interface MonthViewProps {
  tasks: Task[];
  habits: Habit[];
  monthEvents: Record<string, string[]>;
  selectedMonth: number;
  selectedYear: number;
  todayStr: string;
  onOpenAddModal: (dateStr: string) => void;
  onDeleteMonthEvent: (dateStr: string, index: number) => void;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const MonthView: React.FC<MonthViewProps> = ({
  tasks,
  habits,
  monthEvents,
  selectedMonth,
  selectedYear,
  todayStr,
  onOpenAddModal,
  onDeleteMonthEvent
}) => {
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  // First day of month index (Monday = 0, ..., Sunday = 6)
  let firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const monthTitle = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`.toUpperCase();

  return (
    <div className="bg-[#111522] border border-[#22293d] rounded-2xl p-4 shadow-sm flex flex-col gap-3 flex-1">
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-[#22293d]">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
            <CalendarIcon className="w-4 h-4" />
          </span>
          <h3 className="text-base font-extrabold text-white tracking-wide">{monthTitle}</h3>
        </div>
        <span className="text-xs text-slate-400">
          Cliquez sur une case pour planifier une tâche, un examen ou un anniversaire
        </span>
      </div>

      {/* Weekdays header */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-1">
        {WEEKDAY_HEADERS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 flex-1">
        {/* Empty cells before 1st day */}
        {Array.from({ length: firstDayIndex }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="bg-[#171c2c]/30 border border-transparent rounded-xl min-h-[110px] opacity-20 pointer-events-none"
          />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }, (_, idx) => {
          const day = idx + 1;
          const dStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasks.filter((t) => t.date === dStr);
          const eventsForDay = monthEvents[dStr] || [];
          const isToday = dStr === todayStr;

          let totalItems = dayTasks.length;
          let doneItems = dayTasks.filter((t) => t.done).length;

          if (isToday) {
            totalItems += habits.length;
            doneItems += habits.filter((h) => h.doneToday).length;
          }

          const score = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
          const hasFlame = score === 100 && totalItems > 0;

          return (
            <div
              key={dStr}
              onClick={() => onOpenAddModal(dStr)}
              className={`bg-[#171c2c] border rounded-xl min-h-[110px] p-2.5 text-xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] hover:border-indigo-500/70 group ${
                isToday
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_16px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/40'
                  : hasFlame
                  ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                  : 'border-[#22293d] hover:bg-[#1f263b]'
              }`}
            >
              {/* Top Row: Day number + Badge */}
              <div className="flex justify-between items-center">
                <strong
                  className={`text-sm font-extrabold ${
                    isToday ? 'text-indigo-400' : 'text-slate-200'
                  }`}
                >
                  {day}
                </strong>

                {hasFlame ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm">
                    <Flame className="w-3 h-3 fill-amber-400" />
                    <span>100%</span>
                  </span>
                ) : score > 0 ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    <Zap className="w-3 h-3" />
                    <span>{score}%</span>
                  </span>
                ) : null}
              </div>

              {/* Events & Reminders List */}
              <div className="flex flex-col gap-1 my-1.5 max-h-[56px] overflow-y-auto pr-0.5">
                {eventsForDay.map((evt, evtIdx) => {
                  const isBirthday =
                    evt.toLowerCase().includes('anniv') || evt.includes('🎂');
                  const isExam =
                    evt.toLowerCase().includes('exam') ||
                    evt.toLowerCase().includes('devoir') ||
                    evt.includes('📚');

                  return (
                    <div
                      key={evtIdx}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center justify-between gap-1 overflow-hidden transition-all ${
                        isBirthday
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200'
                          : isExam
                          ? 'bg-purple-500/20 border border-purple-500/40 text-purple-200'
                          : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-200'
                      }`}
                      title={evt}
                    >
                      <span className="truncate">{evt}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMonthEvent(dStr, evtIdx);
                        }}
                        className="text-slate-400 hover:text-red-400 shrink-0"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom stats & progress */}
              <div className="text-[10px] text-slate-400 mt-auto pt-1">
                <div className="flex justify-between items-center">
                  <span>{dayTasks.length} tâche(s)</span>
                  {score > 0 && <span className="font-bold text-slate-300">{score}%</span>}
                </div>
                {totalItems > 0 && (
                  <div className="w-full h-1 bg-[#1f263b] rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        hasFlame
                          ? 'bg-gradient-to-r from-amber-500 to-red-500'
                          : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
