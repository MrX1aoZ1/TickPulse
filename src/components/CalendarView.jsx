'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/context/TaskContext';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatToLocalDateStr(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string' && dateInput.length === 10) return dateInput;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDateStr(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function priorityDot(priority) {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-amber-500';
    case 'low':
      return 'bg-blue-500';
    default:
      return 'bg-zinc-500';
  }
}

function priorityLabelClass(priority) {
  switch (priority) {
    case 'high':
      return 'text-red-400 bg-red-500/10';
    case 'medium':
      return 'text-amber-400 bg-amber-500/10';
    case 'low':
      return 'text-blue-400 bg-blue-500/10';
    default:
      return 'text-zinc-400 bg-zinc-700/50';
  }
}

export default function CalendarView() {
  const router = useRouter();
  const { tasks = [], categories = [], dispatch } = useTasks();
  const todayStr = formatToLocalDateStr(new Date());

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const days = [];

    let prevYear = viewYear;
    let prevMonth = viewMonth - 1;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }

    for (let i = firstDayIndex - 1; i >= 0; i -= 1) {
      const day = totalDaysInPrevMonth - i;
      days.push({
        day,
        isCurrentMonth: false,
        dateStr: toDateStr(prevYear, prevMonth, day),
      });
    }

    for (let i = 1; i <= totalDaysInMonth; i += 1) {
      days.push({
        day: i,
        isCurrentMonth: true,
        dateStr: toDateStr(viewYear, viewMonth, i),
      });
    }

    let nextYear = viewYear;
    let nextMonth = viewMonth + 1;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }

    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i += 1) {
      days.push({
        day: i,
        isCurrentMonth: false,
        dateStr: toDateStr(nextYear, nextMonth, i),
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const tasksByDate = useMemo(() => {
    const grouped = {};
    tasks.forEach((task) => {
      if (!task.deadline) return;
      if (task.status === 'deleted' || task.status === 'cancelled') return;

      const dateKey = formatToLocalDateStr(task.deadline);
      if (!dateKey) return;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);
    });
    return grouped;
  }, [tasks]);

  const selectedDayTasks = tasksByDate[selectedDateStr] || [];

  const getCategoryName = (task) => {
    if (task.category_name) return task.category_name;
    const match = categories.find((cat) => cat.id === task.category_id);
    return match?.name || 'Inbox';
  };

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const start = Math.min(now - 15, viewYear);
    const end = Math.max(now + 10, viewYear);
    const years = [];
    for (let year = start; year <= end; year += 1) years.push(year);
    return years;
  }, [viewYear]);

  const jumpToMonth = (year, monthIndex, { keepSelectedDay = true } = {}) => {
    setViewYear(year);
    setViewMonth(monthIndex);

    if (!keepSelectedDay || !selectedDateStr) return;

    const selectedDay = Number(selectedDateStr.split('-')[2]);
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    setSelectedDateStr(toDateStr(year, monthIndex, Math.min(selectedDay, lastDay)));
  };

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      jumpToMonth(viewYear - 1, 11, { keepSelectedDay: false });
    } else {
      jumpToMonth(viewYear, viewMonth - 1, { keepSelectedDay: false });
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      jumpToMonth(viewYear + 1, 0, { keepSelectedDay: false });
    } else {
      jumpToMonth(viewYear, viewMonth + 1, { keepSelectedDay: false });
    }
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDateStr(formatToLocalDateStr(now));
  };

  const openTask = (task) => {
    dispatch({ type: 'SELECT_TASK', payload: task.id });
    if (task.category_id) {
      dispatch({ type: 'SET_VIEW', payload: 'category' });
      dispatch({ type: 'SELECT_CATEGORY', payload: task.category_id });
    }
    router.push('/webapp');
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-50 dark:bg-[#252525] text-zinc-800 dark:text-zinc-200">
      <section className="flex-1 min-w-0 flex flex-col p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Calendar</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Click a day to see its deadlines</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <label className="sr-only" htmlFor="calendar-month">Month</label>
            <select
              id="calendar-month"
              value={viewMonth}
              onChange={(e) => jumpToMonth(viewYear, Number(e.target.value))}
              className="appearance-none bg-white dark:bg-[#2a2a2a] border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 pr-8 text-sm text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1rem',
              }}
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="calendar-year">Year</label>
            <select
              id="calendar-year"
              value={viewYear}
              onChange={(e) => jumpToMonth(Number(e.target.value), viewMonth)}
              className="appearance-none bg-white dark:bg-[#2a2a2a] border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 pr-8 text-sm text-zinc-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1rem',
              }}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={goToNextMonth}
              className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              aria-label="Next month"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="ml-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Today
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1f1f1f] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="py-2.5 text-center text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                {name}
              </div>
            ))}
          </div>

          <div
            className="grid grid-cols-7 flex-1 min-h-0"
            style={{ gridTemplateRows: 'repeat(6, minmax(0, 1fr))' }}
          >
            {calendarDays.map((cell, index) => {
              const dayTasks = tasksByDate[cell.dateStr] || [];
              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === todayStr;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`
                    relative h-full min-h-0 overflow-hidden flex flex-col items-stretch text-left p-2
                    border-r border-b border-zinc-200 dark:border-zinc-800/80
                    ${cell.isCurrentMonth ? 'bg-transparent' : 'bg-zinc-100/80 dark:bg-black/20'}
                    ${isSelected ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-500' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'}
                  `}
                >
                  <div className="flex items-center justify-between flex-shrink-0">
                    <span
                      className={`
                        inline-flex h-6 w-6 items-center justify-center rounded-full text-sm
                        ${isToday ? 'bg-blue-600 text-white font-semibold' : ''}
                        ${!isToday && cell.isCurrentMonth ? 'text-zinc-800 dark:text-zinc-200' : ''}
                        ${!isToday && !cell.isCurrentMonth ? 'text-zinc-400 dark:text-zinc-600' : ''}
                      `}
                    >
                      {cell.day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-medium text-blue-400">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-0.5 min-h-0 overflow-hidden">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center gap-1 min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${priorityDot(task.priority)}`} />
                        <span className={`truncate text-[11px] ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}>
                          {task.task_name}
                        </span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-zinc-500">+{dayTasks.length - 3} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="w-[340px] flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1a1a1a] flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Deadlines</h3>
          <p className="text-xs text-zinc-500 mt-1">{formatDisplayDate(selectedDateStr)}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {selectedDayTasks.length === 0 ? (
            <p className="text-sm text-zinc-500 px-1 py-8 text-center">
              No deadlines on this day
            </p>
          ) : (
            selectedDayTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => openTask(task)}
                className="w-full text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#222] hover:bg-zinc-100 dark:hover:bg-zinc-800/80 p-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className={`text-sm font-medium ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {task.task_name}
                  </h4>
                  <span className={`flex-shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${priorityLabelClass(task.priority)}`}>
                    {task.priority || 'none'}
                  </span>
                </div>
                {task.content && (
                  <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2">{task.content}</p>
                )}
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{getCategoryName(task)}</span>
                  <span className="capitalize">{task.status || 'pending'}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
