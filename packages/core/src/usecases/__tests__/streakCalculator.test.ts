import { describe, it, expect } from 'vitest';
import { calculateStreaks, calculateStats, getLocalDateString } from '../streakCalculator';
import { SessionLog } from '../../domain/entities';

// Helper to make session log
const makeLog = (id: string, presetId: string, daysAgo: number, duration: number = 300): SessionLog => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id,
    presetId,
    presetName: presetId === 'box' ? 'Box Breathing' : 'Wim Hof',
    startedAt: new Date(date.getTime() - duration * 1000).toISOString(),
    completedAt: date.toISOString(),
    durationSeconds: duration
  };
};

describe('Streak and Stats Calculator', () => {
  describe('calculateStreaks', () => {
    it('should return 0 streak for empty logs', () => {
      const result = calculateStreaks([], 'combined');
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.lastCompletedDate).toBeNull();
    });

    it('should calculate active daily streak correctly if completed today', () => {
      const logs = [
        makeLog('1', 'box', 0), // Today
        makeLog('2', 'box', 1), // Yesterday
        makeLog('3', 'box', 2), // 2 days ago
        makeLog('4', 'box', 4), // 4 days ago (streak broken at 3 days)
      ];

      const result = calculateStreaks(logs, 'combined');
      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
      expect(result.lastCompletedDate).toBe(getLocalDateString(new Date()));
    });

    it('should calculate active daily streak correctly if completed yesterday', () => {
      const logs = [
        makeLog('1', 'box', 1), // Yesterday
        makeLog('2', 'box', 2), // 2 days ago
      ];

      const result = calculateStreaks(logs, 'combined');
      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(2);
    });

    it('should return 0 current streak if last completion was 2 days ago', () => {
      const logs = [
        makeLog('1', 'box', 2), // 2 days ago
        makeLog('2', 'box', 3), // 3 days ago
      ];

      const result = calculateStreaks(logs, 'combined');
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(2); // longest streak remains 2
    });

    it('should calculate separate streaks for different presets', () => {
      const logs = [
        makeLog('1', 'box', 0), // Box today
        makeLog('2', 'box', 1), // Box yesterday
        makeLog('3', 'wimhof', 0), // Wim Hof today
        makeLog('4', 'wimhof', 2), // Wim Hof 2 days ago (streak broken)
      ];

      const boxStreak = calculateStreaks(logs, 'box');
      const wimHofStreak = calculateStreaks(logs, 'wimhof');
      const combinedStreak = calculateStreaks(logs, 'combined');

      expect(boxStreak.currentStreak).toBe(2);
      expect(wimHofStreak.currentStreak).toBe(1);
      expect(combinedStreak.currentStreak).toBe(3);
    });
  });

  describe('calculateStats', () => {
    it('should return empty stats for empty logs', () => {
      const stats = calculateStats([]);
      expect(stats.totalTimeSeconds).toBe(0);
      expect(stats.sessionCount).toBe(0);
      expect(stats.dailyAverageSeconds).toBe(0);
    });

    it('should compute totals and preset breakdown correctly', () => {
      const logs = [
        makeLog('1', 'box', 0, 100), // Today (100s)
        makeLog('2', 'box', 0, 200), // Today (200s)
        makeLog('3', 'wimhof', 1, 300), // Yesterday (300s)
      ];

      const stats = calculateStats(logs);
      expect(stats.totalTimeSeconds).toBe(600);
      expect(stats.sessionCount).toBe(3);
      expect(stats.dailyAverageSeconds).toBe(300); // 600s total / 2 unique days (today and yesterday) = 300s/day
      expect(stats.presetTimeBreakdown).toEqual({
        box: 300,
        wimhof: 300
      });
      expect(stats.presetCountBreakdown).toEqual({
        box: 2,
        wimhof: 1
      });
    });
  });
});
