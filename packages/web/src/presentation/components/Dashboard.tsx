import React, { useState } from 'react';
import { 
  SessionLog, 
  Preset, 
  calculateStreaks, 
  calculateStats, 
  getLocalDateString 
} from '@jus-breathe/core';

interface DashboardProps {
  history: SessionLog[];
  currentPreset: Preset;
  onClearHistory: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ history, currentPreset, onClearHistory }) => {
  const [streakPresetFilter, setStreakPresetFilter] = useState<'combined' | 'preset'>('combined');

  // Streaks calculation
  const targetPresetId = streakPresetFilter === 'combined' ? 'combined' : currentPreset.id;
  const streak = calculateStreaks(history, targetPresetId);

  // General stats
  const stats = calculateStats(history);

  // Calendar rendering variables (Current Month)
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Create calendar days grid
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const prefixEmptyCells = Array.from({ length: firstDayIndex }, (_, i) => i);

  const getMonthName = (mIndex: number) => {
    const months = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    return months[mIndex];
  };

  const getDayCompletionClass = (day: number) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check if user has completed a session on this day
    const dayLogs = history.filter(log => getLocalDateString(log.completedAt) === formattedDate);
    
    if (dayLogs.length === 0) return '';
    
    // Check if the current filter matches
    if (streakPresetFilter === 'preset') {
      const matchPreset = dayLogs.some(log => log.presetId === currentPreset.id);
      return matchPreset ? 'completed-dot preset-match' : 'completed-dot';
    }
    
    return 'completed-dot';
  };

  // Extract Wim Hof specific logs
  const wimHofLogs = history.filter(log => log.presetId === 'wimhof');

  // Format seconds to human readable duration
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Streak Toggle */}
      <div style={{ display: 'flex', background: 'var(--input-bg)', borderRadius: '12px', padding: '4px' }}>
        <button 
          className={`option-btn ${streakPresetFilter === 'combined' ? 'active' : ''}`}
          style={{ flex: 1, border: 'none' }}
          onClick={() => setStreakPresetFilter('combined')}
        >
          Overall Streak
        </button>
        <button 
          className={`option-btn ${streakPresetFilter === 'preset' ? 'active' : ''}`}
          style={{ flex: 1, border: 'none' }}
          onClick={() => setStreakPresetFilter('preset')}
        >
          {currentPreset.name} Streak
        </button>
      </div>

      {/* Streak Display Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Current Streak</div>
          <div style={{ fontSize: '2rem', fontWeight: 500, color: 'var(--inhale-color)' }}>🔥 {streak.currentStreak} days</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Longest Streak</div>
          <div style={{ fontSize: '2rem', fontWeight: 500, color: 'var(--accent-color)' }}>🏆 {streak.longestStreak} days</div>
        </div>
      </div>

      {/* Monthly Completion Calendar Grid */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
          {getMonthName(month)} {year}
        </h3>
        
        {/* Calendar Grid Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>

        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
          {prefixEmptyCells.map(i => <div key={`empty-${i}`} />)}
          {daysArray.map(day => {
            const completionClass = getDayCompletionClass(day);
            const isToday = day === today.getDate();
            return (
              <div 
                key={`day-${day}`} 
                style={{ 
                  aspectRatio: '1', 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  borderRadius: '50%',
                  fontSize: '0.85rem',
                  fontWeight: isToday ? '600' : '400',
                  backgroundColor: isToday ? 'var(--panel-border)' : 'transparent',
                  position: 'relative'
                }}
              >
                {day}
                {completionClass && (
                  <span 
                    className={completionClass}
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      backgroundColor: completionClass.includes('preset-match') ? 'var(--accent-color)' : 'var(--inhale-color)',
                      boxShadow: '0 0 4px var(--inhale-color)'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Breathing Statistics Cards */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
          Breathing Stats
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
            <span>Total Sessions</span>
            <span style={{ fontWeight: 500 }}>{stats.sessionCount} sessions</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
            <span>Total Time Breathing</span>
            <span style={{ fontWeight: 500 }}>{formatTime(stats.totalTimeSeconds)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
            <span>Daily Average</span>
            <span style={{ fontWeight: 500 }}>{formatTime(stats.dailyAverageSeconds)}/day</span>
          </div>
        </div>
      </div>

      {/* Preset Breakdown charts */}
      {stats.sessionCount > 0 && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Preset Usage Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.keys(stats.presetTimeBreakdown).map(pId => {
              const seconds = stats.presetTimeBreakdown[pId] || 0;
              const percent = Math.round((seconds / stats.totalTimeSeconds) * 100);
              const presetName = pId === 'box' ? 'Box Breathing' : pId === 'relax' ? '4-7-8 Breathing' : pId === 'wimhof' ? 'Wim Hof' : pId === 'tm' ? 'TM Meditation' : pId;
              
              return (
                <div key={pId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span>{presetName}</span>
                    <span>{percent}% ({formatTime(seconds)})</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--input-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', backgroundColor: 'var(--accent-color)', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wim Hof Specific Retention logs */}
      {wimHofLogs.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Wim Hof Retention Times
          </h3>
          <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {wimHofLogs.map((log, index) => (
              <div 
                key={log.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '0.85rem', 
                  borderBottom: '1px solid var(--panel-border)', 
                  paddingBottom: '4px' 
                }}
              >
                <span>Session #{wimHofLogs.length - index} ({new Date(log.completedAt).toLocaleDateString()})</span>
                <span style={{ fontWeight: 500 }}>
                  {log.wimHofHolds && log.wimHofHolds.length > 0 
                    ? log.wimHofHolds.map(h => `${h}s`).join(' | ') 
                    : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clear History Button */}
      {history.length > 0 && (
        <button 
          className="option-btn" 
          style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
          onClick={onClearHistory}
        >
          Clear History Logs
        </button>
      )}
    </div>
  );
};
