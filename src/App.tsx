import React, { useState, useEffect } from 'react';
import { User, UserData, PaymentSettings, Task, Course, Habit } from './types';
import {
  ADMIN_EMAIL,
  ADMIN_EMAILS,
  DEFAULT_APPROVED_EMAILS,
  isOwnerEmail,
  getTodayStr,
  getInitialUserData,
  loadApprovedEmails,
  saveApprovedEmails,
  loadUserData,
  saveUserData,
  loadPaymentSettings,
  savePaymentSettings,
  triggerCelebration
} from './utils/storage';
import { Header } from './components/Header';
import { HeroStats } from './components/HeroStats';
import { FocusView } from './components/FocusView';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { AuthModal } from './components/AuthModal';
import { PendingApprovalModal } from './components/PendingApprovalModal';
import { AdminPortal } from './components/AdminPortal';
import { AddEventModal } from './components/AddEventModal';

export default function App() {
  const todayStr = getTodayStr();

  // Détection STRICTE de la route admin (Lien séparé uniquement)
  const checkIsAdminRoute = () => {
    try {
      const hash = (window.location.hash || '').toLowerCase();
      const path = (window.location.pathname || '').toLowerCase();
      return (
        hash.includes('validation-clients') ||
        hash.includes('admin') ||
        hash.includes('espace-prive') ||
        path.startsWith('/admin')
      );
    } catch {
      return false;
    }
  };

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminRoute);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Utilisateur connecté
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('aura_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [approvedEmails, setApprovedEmails] = useState<string[]>(() => loadApprovedEmails());
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() => loadPaymentSettings());

  // Date et vue
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'focus' | 'week' | 'month'>('focus');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [addEventDate, setAddEventDate] = useState<string | null>(null);

  // Données de l'utilisateur (isolées par identifiant)
  const [userData, setUserData] = useState<UserData>(() => {
    if (currentUser) {
      return loadUserData(currentUser.id);
    }
    return getInitialUserData();
  });

  // Synchronisation du statut d'approbation
  const refreshApprovalStatus = async (checkEmail?: string) => {
    const targetEmail = (checkEmail || currentUser?.email || '').trim().toLowerCase();
    if (!targetEmail) return;

    if (isOwnerEmail(targetEmail)) {
      const current = loadApprovedEmails();
      if (!current.includes(targetEmail)) {
        const upd = [...current, targetEmail];
        setApprovedEmails(upd);
        saveApprovedEmails(upd);
      }
      return;
    }

    try {
      const statusRes = await fetch(`/api/auth/status?email=${encodeURIComponent(targetEmail)}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json().catch(() => ({}));
        if (statusData && statusData.approved === true) {
          const current = loadApprovedEmails();
          const updated = Array.from(new Set([...current, targetEmail]));
          setApprovedEmails(updated);
          saveApprovedEmails(updated);
          return;
        } else if (statusData && statusData.status === 'revoked') {
          // Uniquement si l'administrateur a explicitement révoqué le compte
          const updated = loadApprovedEmails().filter((e) => e.toLowerCase() !== targetEmail);
          setApprovedEmails(updated);
          saveApprovedEmails(updated);
          localStorage.removeItem('aura_current_user');
          setCurrentUser(null);
          return;
        }
      }
    } catch {
      // En cas de micro-coupure réseau, NE JAMAIS déconnecter brutalement le client
    }
  };

  useEffect(() => {
    refreshApprovalStatus();

    // Vérification toutes les 5 secondes pour débloquer automatiquement le client dès que vous cliquez sur "Valider"
    const interval = setInterval(() => {
      if (currentUser && !isOwnerEmail(currentUser.email)) {
        refreshApprovalStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setUserData(loadUserData(currentUser.id));
    }
  }, [currentUser?.id]);

  const updateData = (newData: UserData) => {
    setUserData(newData);
    if (currentUser) {
      saveUserData(currentUser.id, newData);
    }
  };

  // Gestion de connexion / inscription
  const handleLogin = (email: string, isApprovedDirectly = false) => {
    const cleanEmail = email.trim().toLowerCase();
    const isOwner = isOwnerEmail(cleanEmail);

    const userIsApproved =
      isApprovedDirectly ||
      isOwner ||
      approvedEmails.some((e) => e.toLowerCase() === cleanEmail);

    const user: User = {
      email: cleanEmail,
      id: 'u_' + btoa(cleanEmail).replace(/=/g, ''),
      role: isOwner ? 'admin' : 'client'
    };

    // CORRECTION MAJEURE : On enregistre TOUJOURS l'utilisateur (même en attente)
    // pour qu'il puisse voir la page BaridiMob et suivre son statut !
    localStorage.setItem('aura_current_user', JSON.stringify(user));
    setCurrentUser(user);

    if (userIsApproved) {
      const updated = Array.from(new Set([...approvedEmails, cleanEmail]));
      setApprovedEmails(updated);
      saveApprovedEmails(updated);
    }

    refreshApprovalStatus(cleanEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem('aura_current_user');
    setCurrentUser(null);
  };

  const isApproved =
    currentUser &&
    (isOwnerEmail(currentUser.email) ||
      approvedEmails.some((e) => e.toLowerCase() === currentUser.email.toLowerCase()));

  // ================= 1. ESPACE PRIVÉ ADMIN (LIEN SÉPARÉ UNIQUEMENT) =================
  if (isAdminRoute) {
    return (
      <AdminPortal
        onGoToPlanner={() => {
          window.location.hash = '';
          if (window.location.pathname.startsWith('/admin')) {
            window.history.pushState(null, '', '/');
          }
          setIsAdminRoute(false);
        }}
      />
    );
  }

  // ================= 2. NON CONNECTÉ -> CONNEXION / INSCRIPTION =================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0c13] text-[#f8fafc] flex items-center justify-center p-4">
        <AuthModal onLogin={handleLogin} />
      </div>
    );
  }

  // ================= 3. CONNECTÉ MAIS NON VALIDÉ -> ÉCRAN PAIEMENT BARIDIMOB =================
  if (!isApproved && !isOwnerEmail(currentUser.email)) {
    return (
      <div className="min-h-screen bg-[#0a0c13] text-[#f8fafc] flex items-center justify-center p-4">
        <PendingApprovalModal
          userEmail={currentUser.email}
          paymentSettings={paymentSettings}
          onRefreshCheck={() => refreshApprovalStatus(currentUser.email)}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // ================= 4. DASHBOARD CLIENT COMPLET (ACCÈS DÉBLOQUÉ) =================
  return (
    <div className="min-h-screen bg-[#0a0c13] text-[#f8fafc] p-4 sm:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto">
      <Header
        currentUser={currentUser}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        activeTab={activeTab}
        onMonthChange={(m) => { setSelectedMonth(m); setWeekOffset(0); }}
        onYearChange={(y) => { setSelectedYear(y); setWeekOffset(0); }}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <HeroStats tasks={userData.tasks} habits={userData.habits} todayStr={todayStr} />

      {activeTab === 'focus' && (
        <FocusView
          tasks={userData.tasks}
          courses={userData.courses}
          habits={userData.habits}
          todayStr={todayStr}
          onAddTask={(title, d) => {
            const newTask: Task = { id: Date.now(), title, done: false, date: d || todayStr };
            updateData({ ...userData, tasks: [newTask, ...userData.tasks] });
          }}
          onToggleTask={(id) => {
            const updated = userData.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
            updateData({ ...userData, tasks: updated });
          }}
          onDeleteTask={(id) => {
            updateData({ ...userData, tasks: userData.tasks.filter((t) => t.id !== id) });
          }}
          onAddCourse={(title, color) => {
            const newCourse: Course = { id: Date.now(), title, status: 'todo', color };
            updateData({ ...userData, courses: [...userData.courses, newCourse] });
          }}
          onCycleCourse={(id) => {
            const updated = userData.courses.map((c) => {
              if (c.id === id) {
                const next = c.status === 'todo' ? 'doing' : c.status === 'doing' ? 'done' : 'todo';
                if (next === 'done') triggerCelebration();
                return { ...c, status: next };
              }
              return c;
            });
            updateData({ ...userData, courses: updated });
          }}
          onDeleteCourse={(id) => {
            updateData({ ...userData, courses: userData.courses.filter((c) => c.id !== id) });
          }}
          onAddHabit={(title) => {
            const newHabit: Habit = { id: Date.now(), title, doneToday: false, streak: 0 };
            updateData({ ...userData, habits: [...userData.habits, newHabit] });
          }}
          onToggleHabit={(id) => {
            const updated = userData.habits.map((h) => {
              if (h.id === id) {
                const nextDone = !h.doneToday;
                if (nextDone) triggerCelebration();
                return { ...h, doneToday: nextDone, streak: nextDone ? h.streak + 1 : Math.max(0, h.streak - 1) };
              }
              return h;
            });
            updateData({ ...userData, habits: updated });
          }}
          onDeleteHabit={(id) => {
            updateData({ ...userData, habits: userData.habits.filter((h) => h.id !== id) });
          }}
        />
      )}

      {activeTab === 'week' && (
        <WeekView
          tasks={userData.tasks}
          todayStr={todayStr}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          weekOffset={weekOffset}
          onNavigateWeek={(delta) => setWeekOffset((p) => p + delta)}
          onResetWeek={() => setWeekOffset(0)}
          onToggleTask={(id) => {
            const updated = userData.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
            updateData({ ...userData, tasks: updated });
          }}
          onDeleteTask={(id) => {
            updateData({ ...userData, tasks: userData.tasks.filter((t) => t.id !== id) });
          }}
          onOpenAddModal={(dStr) => setAddEventDate(dStr)}
        />
      )}

      {activeTab === 'month' && (
        <MonthView
          tasks={userData.tasks}
          habits={userData.habits}
          monthEvents={userData.monthEvents}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          todayStr={todayStr}
          onOpenAddModal={(dStr) => setAddEventDate(dStr)}
          onDeleteMonthEvent={(dStr, index) => {
            const dayEvents = (userData.monthEvents[dStr] || []).filter((_, i) => i !== index);
            const copy = { ...userData.monthEvents };
            if (dayEvents.length === 0) delete copy[dStr];
            else copy[dStr] = dayEvents;
            updateData({ ...userData, monthEvents: copy });
          }}
        />
      )}

      {addEventDate && (
        <AddEventModal
          dateStr={addEventDate}
          onClose={() => setAddEventDate(null)}
          onAdd={(title, cat) => {
            const displayTitle = cat === 'birthday' ? `🎂 ${title}` : cat === 'exam' ? `📚 ${title}` : title;
            const currentEvents = { ...userData.monthEvents };
            const dayEvts = currentEvents[addEventDate] ? [...currentEvents[addEventDate]] : [];
            dayEvts.push(displayTitle);
            currentEvents[addEventDate] = dayEvts;

            const newTask: Task = { id: Date.now(), title: displayTitle, done: false, date: addEventDate, category: cat };
            updateData({ ...userData, tasks: [newTask, ...userData.tasks], monthEvents: currentEvents });
          }}
        />
      )}
    </div>
  );
}
