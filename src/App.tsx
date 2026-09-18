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

  // Sync approved list from backend
  const refreshApprovalStatus = async () => {
    try {
      const res = await fetch('/api/auth/approved-emails');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.emails)) {
          const approved = Array.from(new Set([
            ...DEFAULT_APPROVED_EMAILS.map(e => e.toLowerCase()),
            ...data.emails.map((e: string) => e.toLowerCase())
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
  }, []);

  // Listen for direct URL activation tokens (#activate?token=AURA-2026&email=...)
  useEffect(() => {
    try {
      const href = window.location.href;
      const isActivation =
        href.includes('activate') ||
        href.includes('token=AURA-2026') ||
        href.includes('token=VALID-2026') ||
        href.includes('token=ber7iche-aura-2026') ||
        href.includes('token=') ||
        href.includes('approve');

      if (isActivation) {
        let targetEmail = '';
        const emailMatch = href.match(/[?&#]email=([^&#]+)/i);
        if (emailMatch && emailMatch[1]) {
          targetEmail = decodeURIComponent(emailMatch[1]).trim().toLowerCase();
        } else {
          try {
            const urlObj = new URL(href.replace('#', '?'));
            targetEmail = (urlObj.searchParams.get('email') || '').trim().toLowerCase();
          } catch {
            // ignore
          }
        }

        const emailToApprove = targetEmail || currentUser?.email?.toLowerCase();
        if (emailToApprove) {
          const current = loadApprovedEmails();
          const updated = Array.from(new Set([...current, emailToApprove]));
          saveApprovedEmails(updated);
          setApprovedEmails(updated);
          triggerCelebration();

          if (!currentUser && targetEmail) {
            handleLogin(targetEmail);
          }
        }

        if (!href.includes('validation') && !href.includes('admin')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch {
      // ignore
    }
  }, [currentUser?.email]);

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
  const handleLogin = (email: string) => {
    const isOwner = isOwnerEmail(email);
    const user: User = {
      email,
      id: 'u_' + btoa(email.toLowerCase()).replace(/=/g, ''),
      role: isOwner ? 'admin' : 'client'
    };

    localStorage.setItem('aura_current_user', JSON.stringify(user));
    setCurrentUser(user);

    // Only auto-approve if owner! Clients must be validated by admin after payment
    if (isOwner) {
      const updated = Array.from(new Set([
        ...approvedEmails,
        email.toLowerCase(),
        ...ADMIN_EMAILS.map(e => e.toLowerCase()),
        ...DEFAULT_APPROVED_EMAILS.map(e => e.toLowerCase())
      ]));
      setApprovedEmails(updated);
      saveApprovedEmails(updated);
    }
    refreshApprovalStatus();
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

  return (
    <div className="min-h-screen bg-[#0a0c13] text-[#f8fafc] p-4 sm:p-6 flex flex-col gap-4 max-w-[1600px] mx-auto">
      {/* 1. Auth Overlay if not logged in */}
      {!currentUser && (
        <AuthModal onLogin={handleLogin} />
      )}

      {/* 2. Pending Approval Overlay if logged in but not approved */}
      {currentUser && !isApproved && !isOwnerEmail(currentUser.email) && (
        <PendingApprovalModal
          userEmail={currentUser.email}
          paymentSettings={paymentSettings}
          onRefreshCheck={refreshApprovalStatus}
          onLogout={handleLogout}
        />
      )}

      {/* 3. Main Dashboard (shown when authenticated and approved) */}
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
