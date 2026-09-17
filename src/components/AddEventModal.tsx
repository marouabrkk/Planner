import React, { useState } from 'react';
import { Calendar, Plus, X, Tag } from 'lucide-react';

interface AddEventModalProps {
  dateStr: string;
  onClose: () => void;
  onAdd: (title: string, category: 'task' | 'birthday' | 'exam' | 'event') => void;
}

export const AddEventModal: React.FC<AddEventModalProps> = ({ dateStr, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'task' | 'birthday' | 'exam' | 'event'>('task');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), category);
    onClose();
  };

  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c13]/85 backdrop-blur-sm p-4">
      <div className="bg-[#111522] border border-[#22293d] rounded-2xl p-5 max-w-md w-full shadow-[0_0_40px_rgba(0,0,0,0.7)] flex flex-col gap-4">
        <div className="flex justify-between items-center pb-3 border-b border-[#22293d]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Ajouter au calendrier</h3>
              <p className="text-[11px] text-cyan-400 capitalize">{formattedDate}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#171c2c] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400">Titre ou description</label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Révision Biologie, Anniversaire Sarah, Examen..."
              className="bg-[#171c2c] border border-[#22293d] focus:border-indigo-500 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none transition-all placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>Type d'entrée</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setCategory('task')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                  category === 'task'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                    : 'bg-[#171c2c] border-[#22293d] text-slate-400 hover:text-white'
                }`}
              >
                🎯 Tâche
              </button>
              <button
                type="button"
                onClick={() => setCategory('birthday')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                  category === 'birthday'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-[#171c2c] border-[#22293d] text-slate-400 hover:text-white'
                }`}
              >
                🎂 Anniv
              </button>
              <button
                type="button"
                onClick={() => setCategory('exam')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                  category === 'exam'
                    ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.3)]'
                    : 'bg-[#171c2c] border-[#22293d] text-slate-400 hover:text-white'
                }`}
              >
                📚 Examen
              </button>
              <button
                type="button"
                onClick={() => setCategory('event')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                  category === 'event'
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-[#171c2c] border-[#22293d] text-slate-400 hover:text-white'
                }`}
              >
                📌 Événement
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#171c2c] hover:bg-[#1f263b] text-slate-300 text-xs font-semibold border border-[#22293d] transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.3)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
