import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertCircle, Plus, Trash2, RotateCcw, Award, Sparkles, BookOpen, Layers } from 'lucide-react';
import { Course, QcmQuestion } from '../types';
import { triggerCelebration } from '../utils/storage';

interface CourseQcmModalProps {
  course: Course;
  onClose: () => void;
  onUpdateCourse: (updated: Course) => void;
}

export const CourseQcmModal: React.FC<CourseQcmModalProps> = ({
  course,
  onClose,
  onUpdateCourse
}) => {
  const [activeTab, setActiveTab] = useState<'practice' | 'manage'>('practice');
  const [filterMode, setFilterMode] = useState<'all' | 'mistakes'>('all');

  // Form states for adding a new QCM
  const [newQuestionText, setNewQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>([
    'A. ',
    'B. ',
    'C. ',
    'D. ',
    'E. '
  ]);
  const [correctOptionIndexes, setCorrectOptionIndexes] = useState<number[]>([0]);
  const [newExplanation, setNewExplanation] = useState('');
  const [newSource, setNewSource] = useState('Annales Résidanat');
  const [showAddSuccess, setShowAddSuccess] = useState(false);

  const qcms: QcmQuestion[] = course.qcms || [];

  // Toggle user answer selection
  const handleToggleOption = (qId: string, optionIndex: number) => {
    const updatedQcms = qcms.map((q) => {
      if (q.id === qId) {
        if (q.validated) return q; // Locked after validation until reset
        const current = q.userSelected || [];
        const next = current.includes(optionIndex)
          ? current.filter((i) => i !== optionIndex)
          : [...current, optionIndex].sort((a, b) => a - b);
        return { ...q, userSelected: next };
      }
      return q;
    });

    onUpdateCourse({ ...course, qcms: updatedQcms });
  };

  // Validate answer for a specific question
  const handleValidateAnswer = (qId: string) => {
    const updatedQcms = qcms.map((q) => {
      if (q.id === qId) {
        const userSel = (q.userSelected || []).sort((a, b) => a - b);
        const correctSel = (q.correctIndexes || []).sort((a, b) => a - b);
        const isCorrect =
          userSel.length === correctSel.length &&
          userSel.every((val, index) => val === correctSel[index]);

        if (isCorrect) {
          triggerCelebration();
        }
        return { ...q, validated: true, isCorrect };
      }
      return q;
    });

    onUpdateCourse({ ...course, qcms: updatedQcms });
  };

  // Reset all answers for this course
  const handleResetSession = () => {
    const updatedQcms = qcms.map((q) => ({
      ...q,
      userSelected: [],
      validated: false,
      isCorrect: undefined
    }));
    onUpdateCourse({ ...course, qcms: updatedQcms });
  };

  // Add new QCM to this course
  const handleAddQcm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const validOptions = options.map((opt) => opt.trim()).filter((opt) => opt.length > 0);
    if (validOptions.length < 2) return;

    const newQcm: QcmQuestion = {
      id: 'qcm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      question: newQuestionText.trim(),
      options: validOptions,
      correctIndexes: correctOptionIndexes.filter((idx) => idx < validOptions.length),
      explanation: newExplanation.trim() || undefined,
      source: newSource.trim() || 'QCM Entraînement',
      userSelected: [],
      validated: false
    };

    const updatedQcms = [...qcms, newQcm];
    onUpdateCourse({ ...course, qcms: updatedQcms });

    // Reset form
    setNewQuestionText('');
    setOptions(['A. ', 'B. ', 'C. ', 'D. ', 'E. ']);
    setCorrectOptionIndexes([0]);
    setNewExplanation('');
    setShowAddSuccess(true);
    setTimeout(() => setShowAddSuccess(false), 2500);
  };

  // Delete QCM
  const handleDeleteQcm = (id: string) => {
    const updatedQcms = qcms.filter((q) => q.id !== id);
    onUpdateCourse({ ...course, qcms: updatedQcms });
  };

  // Generate high-yield sample medical / study questions for this course
  const handleLoadSampleQcms = () => {
    const titleLower = course.title.toLowerCase();
    let samples: QcmQuestion[] = [];

    if (titleLower.includes('cardio') || titleLower.includes('coeur') || titleLower.includes('hta')) {
      samples = [
        {
          id: 'q_' + Date.now() + '_1',
          question: "Concernant l'Infarctus du Myocarde avec sus-décalage du segment ST (STEMI), quelle est la proposition EXACTE concernant le délai de reperfusion ?",
          options: [
            "A. L'angioplastie primaire doit être privilégiée si elle est réalisable dans les 120 minutes suivant le premier contact médical.",
            "B. La fibrinolyse intraveineuse est recommandée même si l'angioplastie est réalisable en 30 minutes.",
            "C. Les troponines doivent obligatoirement être positives avant d'engager la revascularisation en urgence.",
            "D. Les dérivés nitrés sont systématiquement indiqués en cas d'infarctus du ventricule droit.",
            "E. L'aspirine ne doit être introduite qu'après réalisation de la coronarographie."
          ],
          correctIndexes: [0],
          explanation: "La reperfusion par angioplastie primaire est la méthode de choix si le délai premier contact médical - passage de guide est inférieur à 120 min. En cas de STEMI, la prise en charge est une urgence clinique immédiate sans attendre les biomarqueurs.",
          source: "Résidanat - Cardiologie"
        },
        {
          id: 'q_' + Date.now() + '_2',
          question: "Parmi les étiologies suivantes, lesquelles constituent des causes classiques d'insuffisance cardiaque à fraction d'éjection préservée (IC-FEP) ? (Choix multiples)",
          options: [
            "A. Hypertension artérielle de longue date avec hypertrophie ventriculaire gauche",
            "B. Cardiomyopathie amyloïde (Amylose cardiaque)",
            "C. Sténose aortique serrée",
            "D. Infarctus antérieur étendu avec anévrisme ventriculaire gauche",
            "E. Sujet âgé avec diabète et fibrillation atriale"
          ],
          correctIndexes: [0, 1, 2, 4],
          explanation: "L'IC-FEP est favorisée par l'HTA, l'âge, le diabète, la FA, l'amylose et les cardiopathies infiltrantes ou hypertrophiques. L'infarctus étendu avec anévrisme donne typiquement une insuffisance cardiaque à fraction d'éjection altérée (IC-FEA).",
          source: "Cas Clinique - Recommandations ESC"
        }
      ];
    } else if (titleLower.includes('neuro') || titleLower.includes('avc') || titleLower.includes('céphalée')) {
      samples = [
        {
          id: 'q_' + Date.now() + '_1',
          question: "Devant une suspicion d'Accident Vasculaire Cérébral (AVC) ischémique aigu débuté il y a 2 heures, quel est l'examen d'imagerie de référence à réaliser en première intention en urgence ?",
          options: [
            "A. Électroencéphalogramme (EEG) standard",
            "B. IRM cérébrale avec séquences de diffusion, FLAIR et T2*/SWI",
            "C. Ponction lombaire avec analyse du LCR",
            "D. Scanner cérébral sans injection uniquement si l'IRM est immédiatement disponible",
            "E. Écho-doppler des troncs supra-aortiques isolée"
          ],
          correctIndexes: [1],
          explanation: "L'IRM cérébrale (séquence de diffusion) est l'examen de référence : elle confirme l'ischémie en quelques minutes (hypersignal diffusion) et permet d'évaluer le mismatch diffusion-FLAIR pour guider la thrombolyse et la thrombectomie.",
          source: "Concours Résidanat - Neurologie"
        },
        {
          id: 'q_' + Date.now() + '_2',
          question: "Concernant la méningite bactérienne aiguë purulente de l'adulte, quelle attitude thérapeutique doit être adoptée immédiatement ?",
          options: [
            "A. Attendre les résultats de la culture du LCR à 48h avant de débuter les antibiotiques",
            "B. Administrer immédiatement de la Dexaméthasone avant ou concomitamment à une C3G injectable (Céfotaxime ou Ceftriaxone)",
            "C. Ne traiter qu'après avoir fait un scanner cérébral chez tous les patients sans exception",
            "D. Prescrire une antibiothérapie orale par Amoxicilline à dose standard",
            "E. Réaliser une ponction lombaire même en présence d'un purpura fulminans sans délai"
          ],
          correctIndexes: [1],
          explanation: "En cas de suspicion de méningite bactérienne à pneumocoque/méningocoque, la corticothérapie par Dexaméthasone IV (10mg) doit être administrée avant ou en même temps que la première dose d'antibiotique (C3G forte dose) pour réduire la mortalité et les séquelles auditives.",
          source: "Urgences Médicales & Infectiologie"
        }
      ];
    } else {
      // Questions d'annales génériques adaptées au cours
      samples = [
        {
          id: 'q_' + Date.now() + '_1',
          question: `[${course.title}] Concernant les principes physiopathologiques et diagnostiques fondamentaux de ce chapitre, quelle est la proposition EXACTE ?`,
          options: [
            "A. L'interrogatoire minutieux et l'examen clinique restent la pierre angulaire avant tout examen complémentaire.",
            "B. Les examens biologiques doivent systématiquement remplacer l'analyse sémiologique.",
            "C. Le traitement de première intention est toujours invasif ou chirurgical sans palier médical.",
            "D. La surveillance biologique est inutile dès lors que les symptômes cliniques régressent.",
            "E. Les contre-indications absolues ne s'appliquent pas chez le sujet âgé."
          ],
          correctIndexes: [0],
          explanation: "L'approche clinique méthodique, le recueil des antécédents et l'évaluation du terrain sont indispensables pour cibler les examens complémentaires et instaurer une prise en charge adaptée aux recommandations officielles.",
          source: "QCM Synthèse - Concours & Résidanat"
        },
        {
          id: 'q_' + Date.now() + '_2',
          question: `[${course.title}] Quelles sont les affirmations VRAIES concernant la stratégie thérapeutique et les pièges classiques d'examen ? (Choix multiples)`,
          options: [
            "A. L'évaluation du rapport bénéfice/risque est primordiale avant l'introduction de toute thérapeutique",
            "B. L'éducation thérapeutique du patient améliore significativement l'observance et le pronostic à long terme",
            "C. La déclaration des effets indésirables graves fait partie des obligations de pharmacovigilance",
            "D. Toute complication aiguë nécessite une réévaluation immédiate du protocole initial",
            "E. Les critères de guérison ou de rémission ne doivent jamais être réévalués"
          ],
          correctIndexes: [0, 1, 2, 3],
          explanation: "Les propositions A, B, C et D sont exactes. La proposition E est fausse car un suivi régulier des critères de rémission/contrôle est systématiquement recommandé.",
          source: "Annales & Synthèse Médicale"
        }
      ];
    }

    const merged = [...qcms, ...samples];
    onUpdateCourse({ ...course, qcms: merged });
    triggerCelebration();
  };

  // Stats calculation
  const totalCount = qcms.length;
  const answeredCount = qcms.filter((q) => q.validated).length;
  const correctCount = qcms.filter((q) => q.validated && q.isCorrect).length;
  const scorePct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  const couches = course.couches || { c1: false, c2: false, c3: false };
  const couchesDoneCount = (couches.c1 ? 1 : 0) + (couches.c2 ? 1 : 0) + (couches.c3 ? 1 : 0);

  // Toggle couche directly from modal
  const handleToggleCouche = (coucheKey: 'c1' | 'c2' | 'c3') => {
    const nextVal = !couches[coucheKey];
    const today = new Date().toLocaleDateString('fr-FR');
    const updatedCouches = {
      ...couches,
      [coucheKey]: nextVal,
      [`${coucheKey}Date`]: nextVal ? today : undefined
    };

    // Calculate new status
    const allDone = updatedCouches.c1 && updatedCouches.c2 && updatedCouches.c3;
    const anyDone = updatedCouches.c1 || updatedCouches.c2 || updatedCouches.c3;
    const newStatus = allDone ? 'done' : anyDone ? 'doing' : course.status;

    if (coucheKey === 'c3' && nextVal) {
      triggerCelebration();
    }

    onUpdateCourse({
      ...course,
      couches: updatedCouches,
      status: newStatus
    });
  };

  const displayedQcms = filterMode === 'mistakes'
    ? qcms.filter((q) => q.validated && !q.isCorrect)
    : qcms;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-[#111522] border border-[#22293d] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* ================= MODAL HEADER ================= */}
        <div className="p-4 sm:p-5 border-b border-[#22293d] bg-[#141928] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-lg"
              style={{ backgroundColor: course.color, boxShadow: `0 0 12px ${course.color}` }}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">{course.title}</h2>
                <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-[#1e2538] text-slate-300 border border-[#2e374f]">
                  {qcms.length} QCMs
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Espace Révisions & QCMs • Méthode des 3 Couches d'apprentissage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Quick Couches Pill inside Header */}
            <div className="flex items-center gap-1.5 bg-[#0e121d] px-2.5 py-1.5 rounded-xl border border-[#22293d]">
              <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Couches :
              </span>
              <button
                type="button"
                onClick={() => handleToggleCouche('c1')}
                className={`text-[10px] font-black px-2 py-0.5 rounded transition-all cursor-pointer ${
                  couches.c1
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'bg-[#181f30] text-slate-500 hover:text-slate-300'
                }`}
                title="Couche 1 : Compréhension & 1ère lecture intégrale"
              >
                C1 {couches.c1 ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => handleToggleCouche('c2')}
                className={`text-[10px] font-black px-2 py-0.5 rounded transition-all cursor-pointer ${
                  couches.c2
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                    : 'bg-[#181f30] text-slate-500 hover:text-slate-300'
                }`}
                title="Couche 2 : Consolidation & Mémorisation active"
              >
                C2 {couches.c2 ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => handleToggleCouche('c3')}
                className={`text-[10px] font-black px-2 py-0.5 rounded transition-all cursor-pointer ${
                  couches.c3
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'bg-[#181f30] text-slate-500 hover:text-slate-300'
                }`}
                title="Couche 3 : Révision Ultime & Annales"
              >
                C3 {couches.c3 ? '✓' : ''}
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1f263b] transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= METHODE DES 3 COUCHES EXPLANATION BANNER ================= */}
        <div className="bg-[#0b0e17] border-b border-[#22293d] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-semibold">Progression de ce cours :</span>
            <span className="font-bold text-white bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-lg">
              {couchesDoneCount}/3 Couches validées
            </span>
            <span className="text-slate-400">• Score QCM :</span>
            <span className={`font-extrabold px-2 py-0.5 rounded-lg ${
              scorePct >= 80 ? 'text-emerald-400 bg-emerald-500/10' : scorePct >= 50 ? 'text-amber-400 bg-amber-500/10' : 'text-slate-300 bg-slate-800'
            }`}>
              {answeredCount > 0 ? `${correctCount}/${answeredCount} (${scorePct}%)` : 'Non commencé'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="hidden md:inline">C1 = Apprentissage | C2 = Mémorisation | C3 = Ultime & QCMs</span>
          </div>
        </div>

        {/* ================= TABS NAVIGATION ================= */}
        <div className="flex items-center justify-between border-b border-[#22293d] bg-[#141928] px-4 pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('practice')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'practice'
                  ? 'border-indigo-500 text-indigo-400 bg-[#111522]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>S'entraîner aux QCMs ({qcms.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'manage'
                  ? 'border-indigo-500 text-indigo-400 bg-[#111522]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter & Gérer les QCMs</span>
            </button>
          </div>

          {activeTab === 'practice' && qcms.length > 0 && (
            <div className="flex items-center gap-2 pb-2">
              <button
                type="button"
                onClick={() => setFilterMode(filterMode === 'all' ? 'mistakes' : 'all')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  filterMode === 'mistakes'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-[#181f30] text-slate-400 hover:text-slate-200 border-[#22293d]'
                }`}
                title="Afficher uniquement les questions ratées"
              >
                {filterMode === 'mistakes' ? 'Afficher Tous' : 'Revoir Erreurs ⚠️'}
              </button>
              <button
                type="button"
                onClick={handleResetSession}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#181f30] hover:bg-[#202940] text-slate-300 border border-[#22293d] flex items-center gap-1 transition-all"
                title="Effacer mes réponses et recommencer la session"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Recommencer</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= MODAL BODY ================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          
          {/* TAB 1: PRACTICE */}
          {activeTab === 'practice' && (
            <>
              {qcms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-[#171c2c] border border-dashed border-[#2b354f] rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Aucun QCM pour ce cours</h3>
                  <p className="text-xs text-slate-400 max-w-md mb-5 leading-relaxed">
                    Testez vos connaissances et préparez vos examens ou concours. Vous pouvez charger des questions types d'annales ou ajouter vos propres QCMs.
                  </p>
                  <div className="flex flex-wrap gap-2.5 justify-center">
                    <button
                      type="button"
                      onClick={handleLoadSampleQcms}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>Charger des QCMs types pour ce cours</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('manage')}
                      className="bg-[#202940] hover:bg-[#283452] text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-[#2e3a5a] flex items-center gap-2 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Rédiger mes propres QCMs</span>
                    </button>
                  </div>
                </div>
              ) : displayedQcms.length === 0 ? (
                <div className="text-center py-10 bg-[#171c2c] rounded-2xl border border-[#22293d] p-6">
                  <p className="text-sm font-semibold text-emerald-400">Aucune erreur trouvée ! 🎉</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Toutes vos réponses validées sont correctes ou vous n'avez pas encore répondu aux questions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className="mt-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-xl transition-all"
                  >
                    Voir tous les QCMs
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {displayedQcms.map((qcm, qIdx) => {
                    const userSel = qcm.userSelected || [];
                    const isValidated = qcm.validated === true;
                    const isFullyCorrect = qcm.isCorrect === true;
                    const correctIndices = qcm.correctIndexes || [];

                    return (
                      <div
                        key={qcm.id}
                        className={`bg-[#171c2c] border rounded-2xl p-4 sm:p-5 transition-all ${
                          isValidated
                            ? isFullyCorrect
                              ? 'border-emerald-500/40 bg-[#121c22]'
                              : 'border-rose-500/40 bg-[#20151c]'
                            : 'border-[#22293d] hover:border-[#333e5c]'
                        }`}
                      >
                        {/* QCM Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[11px] px-2 py-0.5 rounded-lg border border-indigo-500/30">
                              Question {qIdx + 1}/{displayedQcms.length}
                            </span>
                            {qcm.source && (
                              <span className="bg-[#101420] text-slate-400 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-[#22293d]">
                                🏷️ {qcm.source}
                              </span>
                            )}
                            {correctIndices.length > 1 && (
                              <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-cyan-500/30">
                                Choix multiples ({correctIndices.length} bonnes réponses)
                              </span>
                            )}
                          </div>

                          {isValidated && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isFullyCorrect ? (
                                <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/40">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Exact (+1 pt)</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-rose-400 font-bold text-xs bg-rose-500/20 px-2 py-1 rounded-lg border border-rose-500/40">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Incomplet / Faux</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Question Text */}
                        <h4 className="text-sm font-bold text-white mb-3 leading-relaxed">
                          {qcm.question}
                        </h4>

                        {/* Options */}
                        <div className="flex flex-col gap-2 mb-4">
                          {qcm.options.map((opt, optIndex) => {
                            const isSelected = userSel.includes(optIndex);
                            const isOptionCorrect = correctIndices.includes(optIndex);

                            let optStyle = 'bg-[#121624] border-[#22293d] text-slate-200 hover:border-indigo-500/50';

                            if (isSelected && !isValidated) {
                              optStyle = 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.25)]';
                            } else if (isValidated) {
                              if (isOptionCorrect && isSelected) {
                                optStyle = 'bg-emerald-500/25 border-emerald-500 text-emerald-200 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.2)]';
                              } else if (isOptionCorrect && !isSelected) {
                                optStyle = 'bg-emerald-500/15 border-dashed border-emerald-500/60 text-emerald-300';
                              } else if (!isOptionCorrect && isSelected) {
                                optStyle = 'bg-rose-500/25 border-rose-500 text-rose-200 line-through';
                              } else {
                                optStyle = 'bg-[#10131d] border-[#1d2335] text-slate-500 opacity-60';
                              }
                            }

                            return (
                              <button
                                key={optIndex}
                                type="button"
                                disabled={isValidated}
                                onClick={() => handleToggleOption(qcm.id, optIndex)}
                                className={`text-left p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${optStyle} ${
                                  !isValidated ? 'cursor-pointer hover:bg-[#1a2033]' : 'cursor-default'
                                }`}
                              >
                                <span className="leading-snug">{opt}</span>
                                <div className="shrink-0 flex items-center">
                                  {isValidated ? (
                                    isOptionCorrect ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : isSelected ? (
                                      <XCircle className="w-4 h-4 text-rose-400" />
                                    ) : null
                                  ) : (
                                    <div
                                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                        isSelected
                                          ? 'bg-indigo-600 border-indigo-600 text-white'
                                          : 'border-slate-600 bg-[#161a29]'
                                      }`}
                                    >
                                      {isSelected && <span className="text-[10px] font-black">✓</span>}
                                    </div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Action: Validate answer */}
                        {!isValidated ? (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleValidateAnswer(qcm.id)}
                              disabled={userSel.length === 0}
                              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md ${
                                userSel.length > 0
                                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95'
                                  : 'bg-[#1b2234] text-slate-500 cursor-not-allowed border border-[#252f48]'
                              }`}
                            >
                              Valider ma réponse
                            </button>
                          </div>
                        ) : (
                          // Explanation Section
                          <div className="bg-[#101420] border border-[#252f48] rounded-xl p-3.5 mt-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                              <AlertCircle className="w-4 h-4" />
                              <span>Justification & Explication du QCM :</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {qcm.explanation || "Bonne réponse : " + correctIndices.map((i) => String.fromCharCode(65 + i)).join(', ') + ". Référez-vous aux cours officiels pour les détails."}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: MANAGE & ADD QCMS */}
          {activeTab === 'manage' && (
            <div className="flex flex-col gap-6">
              
              {/* Quick Preset Banner */}
              <div className="bg-gradient-to-r from-indigo-950/60 to-cyan-950/50 border border-indigo-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div>
                  <h4 className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Banque rapide d'Annales & Cas Cliniques
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Chargez automatiquement des QCMs types pour « {course.title} » sans avoir à tout saisir manuellement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadSampleQcms}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Charger des questions types</span>
                </button>
              </div>

              {/* Form to add custom QCM */}
              <form onSubmit={handleAddQcm} className="bg-[#171c2c] border border-[#22293d] rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-[#22293d] pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-400" />
                    Créer un nouveau QCM pour ce cours
                  </h4>
                  {showAddSuccess && (
                    <span className="text-emerald-400 text-xs font-bold animate-pulse">
                      ✓ QCM ajouté avec succès !
                    </span>
                  )}
                </div>

                {/* Question */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Énoncé de la Question / Cas Clinique :
                  </label>
                  <textarea
                    rows={2}
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Ex: Concernant le diagnostic d'insuffisance coronaire..."
                    className="w-full bg-[#121624] border border-[#22293d] focus:border-indigo-500 text-white text-xs p-3 rounded-xl outline-none transition-all placeholder:text-slate-500 resize-none"
                    required
                  />
                </div>

                {/* Options */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Propositions (Cochez la ou les bonnes réponses) :
                  </label>
                  <div className="flex flex-col gap-2">
                    {options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isCorrect = correctOptionIndexes.includes(idx);
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = isCorrect
                                ? correctOptionIndexes.filter((i) => i !== idx)
                                : [...correctOptionIndexes, idx];
                              setCorrectOptionIndexes(next);
                            }}
                            className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              isCorrect
                                ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                : 'bg-[#121624] border border-[#22293d] text-slate-400 hover:border-slate-500'
                            }`}
                            title={isCorrect ? 'Bonne réponse ✓' : 'Cliquer pour marquer comme bonne réponse'}
                          >
                            {letter}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const copy = [...options];
                              copy[idx] = e.target.value;
                              setOptions(copy);
                            }}
                            placeholder={`Proposition ${letter}...`}
                            className={`flex-1 bg-[#121624] border text-xs px-3 py-2 rounded-xl outline-none transition-all ${
                              isCorrect ? 'border-emerald-500/50 text-white' : 'border-[#22293d] text-slate-300'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Source & Justification */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Source du QCM :
                    </label>
                    <input
                      type="text"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      placeholder="Ex: Concours Alger 2023, Annales, etc."
                      className="w-full bg-[#121624] border border-[#22293d] focus:border-indigo-500 text-white text-xs px-3 py-2 rounded-xl outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Explication / Justification :
                    </label>
                    <input
                      type="text"
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      placeholder="Pourquoi cette réponse est vraie ou fausse..."
                      className="w-full bg-[#121624] border border-[#22293d] focus:border-indigo-500 text-white text-xs px-3 py-2 rounded-xl outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)] flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Enregistrer le QCM dans ce cours</span>
                  </button>
                </div>
              </form>

              {/* Existing QCMs list with delete action */}
              {qcms.length > 0 && (
                <div className="bg-[#171c2c] border border-[#22293d] rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
                    <span>QCMs enregistrés pour ce cours ({qcms.length}) :</span>
                  </h4>
                  <div className="flex flex-col gap-2">
                    {qcms.map((q, idx) => (
                      <div
                        key={q.id}
                        className="bg-[#121624] border border-[#22293d] p-3 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-indigo-400">#{idx + 1}</span>
                            <span className="text-slate-400 text-[10px]">
                              Bonne(s) réponse(s) : {q.correctIndexes.map((i) => String.fromCharCode(65 + i)).join(', ')}
                            </span>
                            {q.source && (
                              <span className="text-slate-500 text-[10px]">({q.source})</span>
                            )}
                          </div>
                          <p className="text-slate-200 truncate">{q.question}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteQcm(q.id)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Supprimer ce QCM"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="p-3 sm:p-4 bg-[#141928] border-t border-[#22293d] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>Sauvegarde automatique liée à votre compte</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#202940] hover:bg-[#283452] text-white font-bold px-4 py-1.5 rounded-xl transition-all"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
