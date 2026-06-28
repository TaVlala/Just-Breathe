import { SessionLog, StreakState } from '../domain/entities';

// Helper to convert date to YYYY-MM-DD in local time
export function getLocalDateString(dateInput: string | Date): string {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate streaks for a given preset or all combined
export function calculateStreaks(logs: SessionLog[], presetId: string | 'combined'): StreakState {
  // Filter logs by preset if specified
  const filteredLogs = presetId === 'combined' 
    ? logs 
    : logs.filter(log => log.presetId === presetId);

  if (filteredLogs.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
  }

  // Get unique completion dates in YYYY-MM-DD format, sorted chronologically
  const localDates = filteredLogs.map(log => getLocalDateString(log.completedAt));
  const uniqueDates = Array.from(new Set(localDates)).sort();

  const todayStr = getLocalDateString(new Date());
  
  // Calculate yesterday's date string
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  // Check if we completed a session today or yesterday
  const hasCompletedToday = uniqueDates.includes(todayStr);
  const hasCompletedYesterday = uniqueDates.includes(yesterdayStr);

  let currentStreak = 0;
  if (hasCompletedToday || hasCompletedYesterday) {
    // Trace back day by day starting from the most recent completed date
    let checkDate = hasCompletedToday ? new Date() : yesterday;
    let checkStr = getLocalDateString(checkDate);

    while (uniqueDates.includes(checkStr)) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
      checkStr = getLocalDateString(checkDate);
    }
  }

  // Calculate longest streak of all time
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: Date | null = null;

  for (const dateStr of uniqueDates) {
    const currentDate = new Date(dateStr + 'T00:00:00'); // enforce local time interpretation

    if (previousDate === null) {
      runningStreak = 1;
    } else {
      const diffTime = currentDate.getTime() - previousDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        runningStreak += 1;
      } else if (diffDays > 1) {
        runningStreak = 1; // broken streak, start over
      }
    }

    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    previousDate = currentDate;
  }

  const lastCompletedDate = uniqueDates[uniqueDates.length - 1];

  return {
    currentStreak,
    longestStreak,
    lastCompletedDate
  };
}

export interface BreathingStats {
  totalTimeSeconds: number;
  sessionCount: number;
  dailyAverageSeconds: number;
  presetTimeBreakdown: Record<string, number>; // Maps presetId to seconds spent
  presetCountBreakdown: Record<string, number>; // Maps presetId to session counts
}

// Calculate comprehensive breathing statistics
export function calculateStats(logs: SessionLog[]): BreathingStats {
  if (logs.length === 0) {
    return {
      totalTimeSeconds: 0,
      sessionCount: 0,
      dailyAverageSeconds: 0,
      presetTimeBreakdown: {},
      presetCountBreakdown: {}
    };
  }

  let totalTimeSeconds = 0;
  const presetTimeBreakdown: Record<string, number> = {};
  const presetCountBreakdown: Record<string, number> = {};
  const uniqueDays = new Set<string>();

  for (const log of logs) {
    totalTimeSeconds += log.durationSeconds;
    uniqueDays.add(getLocalDateString(log.completedAt));

    // Preset breakdown
    presetTimeBreakdown[log.presetId] = (presetTimeBreakdown[log.presetId] || 0) + log.durationSeconds;
    presetCountBreakdown[log.presetId] = (presetCountBreakdown[log.presetId] || 0) + 1;
  }

  const dailyAverageSeconds = uniqueDays.size > 0 
    ? Math.round(totalTimeSeconds / uniqueDays.size) 
    : 0;

  return {
    totalTimeSeconds,
    sessionCount: logs.length,
    dailyAverageSeconds,
    presetTimeBreakdown,
    presetCountBreakdown
  };
}
