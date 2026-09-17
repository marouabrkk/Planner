import React, { useState } from 'react';
import { Target, BookOpen, Zap, Trash2, Plus, Flame, Check } from 'lucide-react';
import { Task, Course, Habit } from '../types';

interface FocusViewProps {
  tasks: Task[];
  courses: Course[];
  habits: Habit[];
  todayStr: string;
  onAddTask: (title: string, date?: string) => void;
  onToggleTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onAddCourse: (title: string, color: string) => void;
  onCycleCourse: (id: number) => void;
  onDeleteCourse: (id: number) => void;
  onAddHabit: (title: string) => void;
  onToggleHabit: (id: number) => void;
  onDeleteHabit: (id: number) => void;
}

const PRESET_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const FocusView: React.FC<FocusViewProps> = ({
  tasks,
  courses,
  habits,
  todayStr,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onAddCourse,
  onCycleCourse,
  onDeleteCourse,
  onAddHabit,
  onToggleHabit,
  onDeleteHabit
}) => {
  const [taskInput, setTaskInput] = useState('');
  const [courseInput, setCourseInput] = useState('');
  const [courseColor, setCourseColor] = useState('#6366f1');
  const [habitInput, setHabitInput] = useState('');

  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const tasksDone = todayTasks.filter((t) => t.done).length;
  const tasksPct = todayTasks.length > 0 ? Math.round((tasksDone / todayTasks.length) * 100) : 0;

  const coursesDone = courses.filter((c) => c.status === 'done').length;
  const habitsDone = habits.filter((h) => h.doneToday).length;

  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskInput.trim()) return;
    onAddTask(taskInput.trim(), todayStr);
    setTaskInput('');
  };

  const handleAddCourse = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!courseInput.trim()) return;
    onAddCourse(courseInput.trim(), courseColor);
    setCourseInput('');
  };

  const handleAddHabit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!habitInput.trim()) return;
    onAddHabit(habitInput.trim());
    setHabitInput('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
      {/* ================= COLONNE 1 : TÂCHES DU JOUR ================= */}
      <div className="bg-[#111522] border border-[#22293d] rounded-2xl p-4 flex flex-col gap-3 min-h-[460px] max-h-[75vh] shadow-sm">
        <div className="flex justify-between items-center pb-2.5 border-b border-[#22293d]">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Target className="w-4 h-4" />
            </span>
            <span>Tâches du Jour</span>
          </div>
          <span className="bg-[#1f263b] border border-[#22293d] text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
            {tasksPct}%
          </span>
        </div>

        {/* Input */}
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="+ Ajouter une tâche (Entrée)..."
            className="flex-1 bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs px-3 py-2 rounded-xl outline-none transition-all placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 rounded-xl text-sm font-bold flex items-center justify-center transition-all shadow-[0_0_10px_rgba(99,102,241,0.3)]"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {/* Tasks list */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
          {todayTasks.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-8 italic">
              Aucune tâche pour aujourd'hui. Profitez de votre journée ou ajoutez-en une !
            </div>
          ) : (
            todayTasks.map((t) => (
              <div
                key={t.id}
                className={`bg-[#171c2c] border border-[#22293d] hover:border-[#374261] p-3 rounded-xl flex items-center justify-between gap-3 transition-all ${
                  t.done ? 'opacity-60 bg-[#141824]' : ''
                }`}
              >
                <div
                  className="flex items-center gap-2.5 flex-1 overflow-hidden cursor-pointer"
                  onClick={() => onToggleTask(t.id)}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                      t.done
                        ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                        : 'border-slate-600 bg-[#1f263b] hover:border-indigo-400'
                    }`}
                  >
                    {t.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-xs font-medium text-slate-200 truncate ${
                      t.done ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {t.title}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteTask(t.id)}
                  className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Supprimer la tâche"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= COLONNE 2 : COURS & RÉVISIONS ================= */}
      <div className="bg-[#111522] border border-[#22293d] rounded-2xl p-4 flex flex-col gap-3 min-h-[460px] max-h-[75vh] shadow-sm">
        <div className="flex justify-between items-center pb-2.5 border-b border-[#22293d]">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </span>
            <span>Cours & Révisions</span>
          </div>
          <span className="bg-[#1f263b] border border-[#22293d] text-cyan-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
            {coursesDone}/{courses.length} maîtrisés
          </span>
        </div>

        {/* Input */}
        <form onSubmit={handleAddCourse} className="flex gap-2 items-center">
          <input
            type="text"
            value={courseInput}
            onChange={(e) => setCourseInput(e.target.value)}
            placeholder="+ Nom du cours / module..."
            className="flex-1 bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs px-3 py-2 rounded-xl outline-none transition-all placeholder:text-slate-500"
          />
          <div className="relative flex items-center">
            <input
              type="color"
              value={courseColor}
              onChange={(e) => setCourseColor(e.target.value)}
              className="w-8 h-8 rounded-xl border border-[#22293d] bg-[#171c2c] cursor-pointer p-0.5 outline-none shrink-0"
              title="Choisir la couleur de ce module"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 h-8 rounded-xl text-sm font-bold flex items-center justify-center transition-all shadow-[0_0_10px_rgba(99,102,241,0.3)]"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {/* Quick color preset chips */}
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] text-slate-500 font-semibold">Teintes :</span>
          {PRESET_COLORS.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => setCourseColor(col)}
              className={`w-4 h-4 rounded-full transition-transform ${
                courseColor === col ? 'scale-125 ring-2 ring-white/60' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: col }}
              title={col}
            />
          ))}
        </div>

        {/* Courses list */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
          {courses.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-8 italic">
              Aucun cours ou module enregistré. Ajoutez vos matières de révision !
            </div>
          ) : (
            courses.map((c) => {
              const color = c.color || '#6366f1';
              let tagClass = 'bg-red-500/15 text-red-400 border-red-500/30';
              let tagLabel = 'À réviser';
              if (c.status === 'doing') {
                tagClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                tagLabel = 'En cours';
              } else if (c.status === 'done') {
                tagClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                tagLabel = 'Maîtrisé ✓';
              }

              return (
                <div
                  key={c.id}
                  className="bg-[#171c2c] border border-[#22293d] hover:border-[#374261] p-3 rounded-xl flex items-center justify-between gap-3 transition-all"
                  style={{ borderLeftWidth: '4px', borderLeftColor: color }}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                    />
                    <span className="text-xs font-semibold text-slate-200 truncate">{c.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onCycleCourse(c.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all hover:scale-105 active:scale-95 cursor-pointer ${tagClass}`}
                      title="Cliquez pour changer le statut (À réviser ➔ En cours ➔ Maîtrisé)"
                    >
                      {tagLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCourse(c.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Supprimer ce cours"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= COLONNE 3 : HABITUDES & ROUTINE ================= */}
      <div className="bg-[#111522] border border-[#22293d] rounded-2xl p-4 flex flex-col gap-3 min-h-[460px] max-h-[75vh] shadow-sm">
        <div className="flex justify-between items-center pb-2.5 border-b border-[#22293d]">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
              <Zap className="w-4 h-4" />
            </span>
            <span>Habitudes & Routine</span>
          </div>
          <span className="bg-[#1f263b] border border-[#22293d] text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
            {habitsDone}/{habits.length}
          </span>
        </div>

        {/* Input */}
        <form onSubmit={handleAddHabit} className="flex gap-2">
          <input
            type="text"
            value={habitInput}
            onChange={(e) => setHabitInput(e.target.value)}
            placeholder="+ Nouvelle habitude quotidienne..."
            className="flex-1 bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs px-3 py-2 rounded-xl outline-none transition-all placeholder:text-slate-500"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 rounded-xl text-sm font-bold flex items-center justify-center transition-all shadow-[0_0_10px_rgba(99,102,241,0.3)]"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {/* Habits list */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
          {habits.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-8 italic">
              Aucune habitude configurée. Ajoutez votre routine quotidienne pour créer une série !
            </div>
          ) : (
            habits.map((h) => (
              <div
                key={h.id}
                className={`bg-[#171c2c] border border-[#22293d] hover:border-[#374261] p-3 rounded-xl flex items-center justify-between gap-3 transition-all ${
                  h.doneToday ? 'bg-[#141824] border-amber-500/30' : ''
                }`}
              >
                <div
                  className="flex items-center gap-2.5 flex-1 overflow-hidden cursor-pointer"
                  onClick={() => onToggleHabit(h.id)}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                      h.doneToday
                        ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : 'border-slate-600 bg-[#1f263b] hover:border-amber-400'
                    }`}
                  >
                    {h.doneToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-xs font-medium text-slate-200 truncate ${
                      h.doneToday ? 'text-amber-200 font-semibold' : ''
                    }`}
                  >
                    {h.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                    <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{h.streak}j</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteHabit(h.id)}
                    className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                    title="Supprimer l'habitude"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
