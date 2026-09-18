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
import { AdminPortal, ADMIN_SECRET_KEY } from './components/AdminPortal';
import { AddEventModal } from './components/AddEventModal';

export default function App() {
  const todayStr = getTodayStr();

  // Route state: Check if on dedicated secret admin site
  const checkIsAdminRoute = () => {
    try {
      const hash = (window.location.hash || '').toLowerCase();
      const path = (window.location.pathname || '').toLowerCase();
      const search = (window.location.search || '').toLowerCase();
      return (
        hash.includes('validation') ||
        hash.includes('admin') ||
        hash.includes('espace-prive') ||
        hash.includes('ber7iche') ||
        path.includes('admin') ||
        search.includes('admin') ||
        search.includes('validation') ||
        search.includes('ber7iche')
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

  // User Authentication & Permissions State
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

  // Navigation & Date selection
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'focus' | 'week' | 'month'>('focus');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Modals
  const [addEventDate, setAddEventDate] = useState<string | null>(null);

  // User Planner Data State
  const [userData, setUserData] = useState<UserData>(() => {
    if (currentUser) {
      return loadUserData(currentUser.id);
    }
    return getInitialUserData();
  });

  // Direct activation link listener (?token=AURA-2026&email=...)
  useEffect(() => {
    const handleDirectActivation = async () => {
      try {
        const fullUrl = window.location.href;
        const hash = window.location.hash || '';
        if (hash.includes('activate') || hash.includes('token=')) {
          const matchToken = fullUrl.match(/[?&#]token=([^&#]+)/);
          const matchEmail = fullUrl.match(/[?&#]email=([^&#]+)/);
          const token = matchToken ? decodeURIComponent(matchToken[1]).trim() : '';
          const emailParam = matchEmail ? decodeURIComponent(matchEmail[1]).trim().toLowerCase() : '';

          if (emailParam && (token === 'AURA-2026' || token === ADMIN_SECRET_KEY)) {
            // 1. Ensure approved locally
            const current = loadApprovedEmails();
            const updated = Array.from(new Set([...current, emailParam]));
            saveApprovedEmails(updated);
            setApprovedEmails(updated);

            // 2. Set as logged-in approved user
            const user: User = {
              email: emailParam,
              id: 'u_' + btoa(emailParam).replace(/=/g, ''),
              role: isOwnerEmail(emailParam) ? 'admin' : 'client'
            };
            localStorage.setItem('aura_current_user', JSON.stringify(user));
            setCurrentUser(user);

            // 3. Confirm with server
            fetch(`/api/admin/approve?key=${encodeURIComponent(ADMIN_SECRET_KEY)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_SECRET_KEY },
              body: JSON.stringify({ email: emailParam, adminKey: ADMIN_SECRET_KEY })
            }).catch(() => {});

            // 4. Trigger celebration
            triggerCelebration();

            // 5. Clean URL hash
            window.location.hash = '';
          }
        }
      } catch (err) {
        console.error('Failed to parse activation link:', err);
      }
    };

    handleDirectActivation();
    window.addEventListener('hashchange', handleDirectActivation);
    return () => window.removeEventListener('hashchange', handleDirectActivation);
  }, []);

  // Sync approved list from backend
  const refreshApprovalStatus = async (checkEmail?: string) => {
    const targetEmail = (checkEmail || currentUser?.email || '').trim().toLowerCase();
    try {
      if (targetEmail && !isOwnerEmail(targetEmail)) {
        const statusRes = await fetch(`/api/auth/status?email=${encodeURIComponent(targetEmail)}`);
        const statusContentType = statusRes.headers.get('content-type') || '';
        if (statusRes.ok && statusContentType.includes('application/json')) {
          const statusData = await statusRes.json().catch(() => ({}));
          if (statusData.approved) {
            const current = loadApprovedEmails();
            const updated = Array.from(new Set([...current, targetEmail]));
            setApprovedEmails(updated);
            saveApprovedEmails(updated);
          } else if (statusData.status === 'revoked' || statusData.status === 'deleted') {
            // Client was explicitly revoked or deleted by admin!
            const current = loadApprovedEmails().filter((e) => e.toLowerCase() !== targetEmail);
            setApprovedEmails(current);
            saveApprovedEmails(current);

            // Immediate forced logout ONLY when revoked or deleted
            localStorage.removeItem('aura_current_user');
            setCurrentUser(null);
            return;
          }
          // Note: If status is 'pending', DO NOT logout! The user is viewing PendingApprovalModal (BaridiMob)
        }
      }

      const res = await fetch('/api/auth/approved-emails');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.emails)) {
          const serverEmails = data.emails.map((e: string) => e.toLowerCase());
          const currentLocal = loadApprovedEmails();
          const approved = Array.from(new Set([
            ...DEFAULT_APPROVED_EMAILS.map((e) => e.toLowerCase()),
            ...currentLocal.map((e) => e.toLowerCase()),
            ...serverEmails
          ]));
          setApprovedEmails(approved);
          saveApprovedEmails(approved);
          return;
        }
      }
    } catch {
      // fallback to localStorage
    }
    const local = loadApprovedEmails();
    setApprovedEmails(local);
  };

  useEffect(() => {
    refreshApprovalStatus();

    // Check approval status periodically (every 4 seconds) if client is logged in
    const interval = setInterval(() => {
      const stored = localStorage.getItem('aura_current_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u?.email && !isOwnerEmail(u.email)) {
            refreshApprovalStatus(u.email);
          }
        } catch {}
      }
    }, 4000);

    const handleStorageChange = () => {
      const current = loadApprovedEmails();
      setApprovedEmails(current);
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // When current user changes, reload their partitioned data
  useEffect(() => {
    if (currentUser) {
      const data = loadUserData(currentUser.id);
      setUserData(data);
    }
  }, [currentUser?.id]);

  // Persist user data when state updates
  const updateData = (newData: UserData) => {
    setUserData(newData);
    if (currentUser) {
      saveUserData(currentUser.id, newData);
    }
  };

  // Auth Handlers
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

    localStorage.setItem('aura_current_user', JSON.stringify(user));
    setCurrentUser(user);

    if (userIsApproved) {
      const updated = Array.from(new Set([
        ...approvedEmails,
        cleanEmail,
        ...ADMIN_EMAILS.map((e) => e.toLowerCase()),
        ...DEFAULT_APPROVED_EMAILS.map((e) => e.toLowerCase())
      ]));
      setApprovedEmails(updated);
      saveApprovedEmails(updated);
    }

    refreshApprovalStatus(cleanEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem('aura_current_user');
    setCurrentUser(null);
  };

  // Check if current user is approved
  const isApproved =
    currentUser &&
    (isOwnerEmail(currentUser.email) ||
      approvedEmails.some((e) => e.toLowerCase() === currentUser.email.toLowerCase()));

  // ================= Task Handlers =================
  const handleAddTask = (title: string, targetDate?: string) => {
    const date = targetDate || todayStr;
    const newTask: Task = {
      id: Date.now(),
      title,
      done: false,
      date
    };
    updateData({
      ...userData,
      tasks: [newTask, ...userData.tasks]
    });
  };

  const handleToggleTask = (id: number) => {
    let nowDone = false;
    const updatedTasks = userData.tasks.map((t) => {
      if (t.id === id) {
        nowDone = !t.done;
        return { ...t, done: nowDone };
      }
      return t;
    });

    if (nowDone) {
      const todayTasks = updatedTasks.filter((t) => t.date === todayStr);
      const allDone = todayTasks.length > 0 && todayTasks.every((t) => t.done);
      if (allDone) {
        triggerCelebration();
      }
    }

    updateData({
      ...userData,
      tasks: updatedTasks
    });
  };

  const handleDeleteTask = (id: number) => {
    const taskToDelete = userData.tasks.find((x) => x.id === id);
    let updatedEvents = { ...userData.monthEvents };

    if (taskToDelete && taskToDelete.date && updatedEvents[taskToDelete.date]) {
      updatedEvents[taskToDelete.date] = updatedEvents[taskToDelete.date].filter(
        (evt) => evt !== taskToDelete.title
      );
      if (updatedEvents[taskToDelete.date].length === 0) {
        delete updatedEvents[taskToDelete.date];
      }
    }

    updateData({
      ...userData,
      tasks: userData.tasks.filter((x) => x.id !== id),
      monthEvents: updatedEvents
    });
  };

  // ================= Course Handlers =================
  const handleAddCourse = (title: string, color: string) => {
    const newCourse: Course = {
      id: Date.now(),
      title,
      status: 'todo',
      color
    };
    updateData({
      ...userData,
      courses: [...userData.courses, newCourse]
    });
  };

  const handleCycleCourse = (id: number) => {
    const updatedCourses = userData.courses.map((c) => {
      if (c.id === id) {
        let nextStatus: 'todo' | 'doing' | 'done' = 'todo';
        if (c.status === 'todo') nextStatus = 'doing';
        else if (c.status === 'doing') nextStatus = 'done';
        else nextStatus = 'todo';

        if (nextStatus === 'done') {
          triggerCelebration();
        }
        return { ...c, status: nextStatus };
      }
      return c;
    });
    updateData({
      ...userData,
      courses: updatedCourses
    });
  };

  const handleDeleteCourse = (id: number) => {
    updateData({
      ...userData,
      courses: userData.courses.filter((c) => c.id !== id)
    });
  };

  // ================= Habit Handlers =================
  const handleAddHabit = (title: string) => {
    const newHabit: Habit = {
      id: Date.now(),
      title,
      doneToday: false,
      streak: 0
    };
    updateData({
      ...userData,
      habits: [...userData.habits, newHabit]
    });
  };

  const handleToggleHabit = (id: number) => {
    const updatedHabits = userData.habits.map((h) => {
      if (h.id === id) {
        const nextDone = !h.doneToday;
        const nextStreak = nextDone ? h.streak + 1 : Math.max(0, h.streak - 1);
        if (nextDone) {
          triggerCelebration();
        }
        return { ...h, doneToday: nextDone, streak: nextStreak };
      }
      return h;
    });
    updateData({
      ...userData,
      habits: updatedHabits
    });
  };

  const handleDeleteHabit = (id: number) => {
    updateData({
      ...userData,
      habits: userData.habits.filter((h) => h.id !== id)
    });
  };

  // ================= Calendar & Month Events =================
  const handleAddEventOrTask = (
    title: string,
    category: 'task' | 'birthday' | 'exam' | 'event'
  ) => {
    if (!addEventDate) return;

    let displayTitle = title;
    if (category === 'birthday' && !displayTitle.includes('🎂')) {
      displayTitle = `🎂 ${displayTitle}`;
    } else if (category === 'exam' && !displayTitle.includes('📚')) {
      displayTitle = `📚 ${displayTitle}`;
    } else if (category === 'event' && !displayTitle.includes('📌')) {
      displayTitle = `📌 ${displayTitle}`;
    }

    const currentMonthEvents = { ...userData.monthEvents };
    const dayEvents = currentMonthEvents[addEventDate] ? [...currentMonthEvents[addEventDate]] : [];
    dayEvents.push(displayTitle);
    currentMonthEvents[addEventDate] = dayEvents;

    // Also add to tasks list for tracking
    const newTask: Task = {
      id: Date.now(),
      title: displayTitle,
      done: false,
      date: addEventDate,
      category
    };

    updateData({
      ...userData,
      tasks: [newTask, ...userData.tasks],
      monthEvents: currentMonthEvents
    });
  };

  const handleDeleteMonthEvent = (dateStr: string, index: number) => {
    if (!userData.monthEvents[dateStr]) return;
    const removedTitle = userData.monthEvents[dateStr][index];
    const newEventsForDate = userData.monthEvents[dateStr].filter((_, i) => i !== index);

    const updatedMonthEvents = { ...userData.monthEvents };
    if (newEventsForDate.length === 0) {
      delete updatedMonthEvents[dateStr];
    } else {
      updatedMonthEvents[dateStr] = newEventsForDate;
    }

    const updatedTasks = userData.tasks.filter(
      (t) => !(t.date === dateStr && t.title === removedTitle)
    );

    updateData({
      ...userData,
      tasks: updatedTasks,
      monthEvents: updatedMonthEvents
    });
  };

  // ================= Admin Handlers =================
  const handleAddApprovedEmail = (email: string) => {
    const clean = email.trim().toLowerCase();
    if (!approvedEmails.some((e) => e.toLowerCase() === clean)) {
      const updated = [...approvedEmails, clean];
      setApprovedEmails(updated);
      saveApprovedEmails(updated);
    }
  };

  const handleRemoveApprovedEmail = (email: string) => {
    const clean = email.trim().toLowerCase();
    const updated = approvedEmails.filter((e) => e.toLowerCase() !== clean);
    setApprovedEmails(updated);
    saveApprovedEmails(updated);
  };

  const handleUpdatePaymentSettings = (settings: PaymentSettings) => {
    setPaymentSettings(settings);
    savePaymentSettings(settings);
  };

  // If currently on dedicated admin route, render separate admin site
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

  // 1. Auth screen if not logged in - strictly do not render private dashboard into DOM
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0c13] text-[#f8fafc] flex items-center justify-center p-4">
        <AuthModal onLogin={handleLogin} />
      </div>
    );
  }

  // 2. Pending Approval screen if logged in but unapproved - strictly do not render private dashboard into DOM
  if (!isApproved && !isOwnerEmail(currentUser.email)) {
    return (
      <div className="min-h-screen bg-[#0a0c13] text-[#f8fafc] flex items-center justify-center p-4">
        <PendingApprovalModal
          userEmail={currentUser.email}
          paymentSettings={paymentSettings}
          onRefreshCheck={refreshApprovalStatus}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  // 3. Main Dashboard (rendered ONLY when authenticated AND verified approved)
  return (
    <div className="min-h-screen bg-[#0a0c13] text-[#f8fafc] p-4 sm:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto">
      <Header
        currentUser={currentUser}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        activeTab={activeTab}
        onMonthChange={(m) => {
          setSelectedMonth(m);
          setWeekOffset(0);
        }}
        onYearChange={(y) => {
          setSelectedYear(y);
          setWeekOffset(0);
        }}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Hero Stats */}
      <HeroStats tasks={userData.tasks} habits={userData.habits} todayStr={todayStr} />

      {/* View Tabs */}
      {activeTab === 'focus' && (
        <FocusView
          tasks={userData.tasks}
          courses={userData.courses}
          habits={userData.habits}
          todayStr={todayStr}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onAddCourse={handleAddCourse}
          onCycleCourse={handleCycleCourse}
          onDeleteCourse={handleDeleteCourse}
          onAddHabit={handleAddHabit}
          onToggleHabit={handleToggleHabit}
          onDeleteHabit={handleDeleteHabit}
        />
      )}

      {activeTab === 'week' && (
        <WeekView
          tasks={userData.tasks}
          todayStr={todayStr}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          weekOffset={weekOffset}
          onNavigateWeek={(delta) => setWeekOffset((prev) => prev + delta)}
          onResetWeek={() => setWeekOffset(0)}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
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
          onDeleteMonthEvent={handleDeleteMonthEvent}
        />
      )}

      {/* Add Event / Task Modal */}
      {addEventDate && (
        <AddEventModal
          dateStr={addEventDate}
          onClose={() => setAddEventDate(null)}
          onAdd={handleAddEventOrTask}
        />
      )}
    </div>
  );
}
