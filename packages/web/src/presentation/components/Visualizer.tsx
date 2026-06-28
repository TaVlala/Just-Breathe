import React, { useState, useEffect, useRef } from 'react';
import { 
  Preset, 
  TimerState, 
  TimerStateMachine, 
  defaultPresets, 
  defaultPreferences, 
  UserPreferences,
  SessionLog,
  calculateStreaks,
  calculateStats,
  getLocalDateString
} from '@jus-breathe/core';
import { webAudioService } from '../../infrastructure/audio/WebAudioService';
import { speechService } from '../../infrastructure/audio/SpeechService';
import { LocalStorageRepo } from '../../infrastructure/db/LocalStorageRepo';
import { Dashboard } from './Dashboard';
import { PresetEditor } from './PresetEditor';

const db = new LocalStorageRepo();

export const Visualizer: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => db.loadPreferences() || defaultPreferences);
  const [presets, setPresets] = useState<Preset[]>(() => db.loadPresets() || defaultPresets);
  const [history, setHistory] = useState<SessionLog[]>(() => db.loadHistory());
  
  const [currentPreset, setCurrentPreset] = useState<Preset>(() => presets[0] || defaultPresets[0]);
  const [state, setState] = useState<TimerState | null>(null);
  
  // UI Panels
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // References
  const stateMachineRef = useRef<TimerStateMachine | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const sessionStartRef = useRef<string | null>(null);

  // Sync settings and theme with body classes
  useEffect(() => {
    const body = document.body;
    body.className = `theme-${preferences.accentTheme} ${preferences.themeMode}-mode`;
    
    // Save to LocalStorage
    db.savePreferences(preferences);
    
    // Sync to synthesizers
    webAudioService.setVolumes({
      master: preferences.soundVolume,
      tick: preferences.tickVolume,
      chime: preferences.chimeVolume,
      ambient: preferences.ambientVolume
    });

    webAudioService.setMutes({
      tick: preferences.tickMuted,
      chime: preferences.chimeMuted,
      ambient: preferences.ambientMuted
    });

    speechService.setEnabled(preferences.voiceGuideEnabled);
    speechService.setMuted(preferences.voiceMuted);
    
    if (!preferences.ambientMuted && preferences.ambientType !== 'none') {
      webAudioService.startAmbient(preferences.ambientType);
    } else {
      webAudioService.stopAmbient();
    }
  }, [preferences]);

  // Handle Web Worker setup for background ticking
  useEffect(() => {
    // Check if worker.js exists and load it
    workerRef.current = new Worker(new URL('/timerWorker.js', import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'TICK' && stateMachineRef.current) {
        stateMachineRef.current.tick();
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Handle visibility changes to unlock iOS AudioContext
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        webAudioService.resumeContext();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Initialize state machine when current preset changes
  useEffect(() => {
    // If playing, stop the worker
    workerRef.current?.postMessage({ action: 'stop' });
    
    const stateCallback = (newState: TimerState, event: string) => {
      setState(newState);

      // Trigger synthesizers based on events
      if (event === 'stage-changed') {
        const currentStage = newState.preset.phases[newState.currentPhaseIndex].stages[newState.currentStageIndex];
        
        // Play Chime
        webAudioService.playChime(preferences.chimeType);
        
        // Speak transition (TTS)
        speechService.speak(currentStage.name);
      }

      if (event === 'tick') {
        const currentStage = newState.preset.phases[newState.currentPhaseIndex].stages[newState.currentStageIndex];
        
        // Tick each second unless it's a hold empty/full stage and we chose to silence ticks during hold
        if (currentStage.duration !== null) {
          webAudioService.playTick(preferences.tickType);
        }
      }

      if (event === 'finished') {
        workerRef.current?.postMessage({ action: 'stop' });
        webAudioService.playChime(preferences.chimeType);
        speechService.speak("Session complete. Well done.");
        
        // Log history
        if (sessionStartRef.current) {
          const newLog: SessionLog = {
            id: crypto.randomUUID(),
            presetId: newState.preset.id,
            presetName: newState.preset.name,
            startedAt: sessionStartRef.current,
            completedAt: new Date().toISOString(),
            durationSeconds: newState.totalSessionDuration,
            wimHofHolds: newState.wimHofHolds
          };
          
          const updatedHistory = [newLog, ...history];
          setHistory(updatedHistory);
          db.saveHistory(updatedHistory);
        }
      }
    };

    stateMachineRef.current = new TimerStateMachine(currentPreset, stateCallback);
    setState(stateMachineRef.current.getState());
    
    // Set default accent theme of the preset
    setPreferences(prev => ({
      ...prev,
      accentTheme: currentPreset.theme
    }));

  }, [currentPreset]);

  // Handle play/pause
  const handlePlayToggle = () => {
    if (!stateMachineRef.current) return;
    
    const currentIsPlaying = stateMachineRef.current.getState().isPlaying;
    
    if (currentIsPlaying) {
      stateMachineRef.current.pause();
      workerRef.current?.postMessage({ action: 'stop' });
    } else {
      // Record starting date if starting from the beginning
      if (stateMachineRef.current.getState().totalSessionDuration === 0) {
        sessionStartRef.current = new Date().toISOString();
      }
      
      stateMachineRef.current.play();
      workerRef.current?.postMessage({ action: 'start', interval: 1000 });
      
      // Warm up ambient audio if selected
      if (!preferences.ambientMuted && preferences.ambientType !== 'none') {
        webAudioService.startAmbient(preferences.ambientType);
      }
    }
  };

  const handleReset = () => {
    stateMachineRef.current?.reset();
    workerRef.current?.postMessage({ action: 'stop' });
  };

  const handleSkip = () => {
    stateMachineRef.current?.skip();
  };

  const selectPreset = (preset: Preset) => {
    setCurrentPreset(preset);
  };

  // Safe haptic trigger
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(80);
      } catch (e) {}
    }
  };

  // Central Core Render Helper
  const currentStage = state ? state.preset.phases[state.currentPhaseIndex].stages[state.currentStageIndex] : null;
  const currentPhase = state ? state.preset.phases[state.currentPhaseIndex] : null;

  // Visualizer scale calculations (Inhale grows, Exhale shrinks, Hold static)
  let portalScale = 1.0;
  let stageColorClass = '--inhale-color';
  let stageGlowClass = '--inhale-glow';

  if (currentStage) {
    if (currentStage.type === 'inhale') {
      portalScale = state && currentStage.duration 
        ? 0.9 + (state.timeElapsed / currentStage.duration) * 0.7 
        : 1.6;
      stageColorClass = 'var(--inhale-color)';
      stageGlowClass = 'var(--inhale-glow)';
    } else if (currentStage.type === 'exhale') {
      portalScale = state && currentStage.duration 
        ? 1.6 - (state.timeElapsed / currentStage.duration) * 0.7 
        : 0.9;
      stageColorClass = 'var(--exhale-color)';
      stageGlowClass = 'var(--exhale-glow)';
    } else {
      portalScale = 1.3; // holds
      stageColorClass = 'var(--hold-color)';
      stageGlowClass = 'var(--hold-glow)';
    }
  }

  // SVG Progress Ring calculations
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  let strokeDashoffset = circumference;
  if (state && currentStage && currentStage.duration) {
    const progress = state.timeElapsed / currentStage.duration;
    strokeDashoffset = circumference - progress * circumference;
  }

  // Linear Progress Fill
  let linearProgressPercent = 0;
  if (state && currentStage && currentStage.duration) {
    linearProgressPercent = (state.timeElapsed / currentStage.duration) * 100;
  }

  return (
    <div className="app-container">
      {/* Ambient background glowing blobs */}
      <div className="ambient-glow-spot top" style={{ '--inhale-glow': stageGlowClass } as React.CSSProperties} />
      <div className="ambient-glow-spot bottom" style={{ '--inhale-glow': stageGlowClass } as React.CSSProperties} />

      {/* Interaction Entrance Guard Screen */}
      {!isUnlocked && (
        <div className="entrance-overlay">
          <div className="entrance-logo" style={{ '--accent-color': 'var(--accent-color)', '--inhale-color': 'var(--inhale-color)' } as React.CSSProperties} />
          <h1 style={{ marginBottom: '12px', fontWeight: 400 }}>Jus Breathe</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '300px' }}>
            Enter a space of stillness. Adjust your posture and prepare to breathe.
          </p>
          <button className="entrance-btn" onClick={() => {
            webAudioService.init();
            setIsUnlocked(true);
            speechService.speak("Ready to breathe.");
          }}>
            Enter Serenity
          </button>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Jus Breathe</h1>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setIsDashboardOpen(true)} title="Progress & History">
            📈
          </button>
          <button className="icon-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">
            ⚙️
          </button>
        </div>
      </header>

      {/* Central Visualizer Portal */}
      <main className="visualizer-container">
        {state && currentStage && (
          <div 
            className="breathing-portal" 
            style={{ 
              transform: `scale(${portalScale})`,
              '--current-stage-color': stageColorClass,
              '--current-stage-glow': stageGlowClass
            } as React.CSSProperties}
          >
            <div className="breathing-circle" />
            <div className="breathing-core">
              <span className="stage-label">{currentStage.name}</span>
              
              {preferences.clockStyle === 'digital' && (
                <span className="timer-countdown">
                  {currentStage.duration === null 
                    ? state.timeElapsed 
                    : state.timeRemaining}
                </span>
              )}

              {currentPhase && currentPhase.repeats !== null && (
                <span className="rep-indicator">
                  Cycle {state.currentRepetition + 1} of {currentPhase.repeats}
                </span>
              )}
            </div>

            {/* SVG Ring Progress */}
            {preferences.clockStyle === 'ring' && currentStage.duration !== null && (
              <svg className="progress-ring-svg" viewBox="0 0 200 200">
                <circle
                  className="progress-ring-circle"
                  cx="100"
                  cy="100"
                  r={radius}
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset
                  }}
                />
              </svg>
            )}
          </div>
        )}

        {/* Linear progress bar at the bottom */}
        {preferences.clockStyle === 'linear' && currentStage && currentStage.duration !== null && (
          <div className="linear-progress-bar">
            <div className="linear-progress-fill" style={{ width: `${linearProgressPercent}%` }} />
          </div>
        )}
      </main>

      {/* Control bar */}
      <section style={{ width: '100%' }}>
        <div className="control-bar">
          <button className="sub-btn" onClick={handleReset} title="Restart">
            🔄
          </button>
          <button className="main-btn" onClick={handlePlayToggle} title={state?.isPlaying ? "Pause" : "Play"}>
            {state?.isPlaying ? '⏸' : '▶'}
          </button>
          <button className="sub-btn" onClick={handleSkip} title="Skip/Next">
            ⏭
          </button>
        </div>

        {/* Presets carousel */}
        <div className="presets-carousel">
          {presets.map(p => (
            <div 
              key={p.id} 
              className={`preset-card ${currentPreset.id === p.id ? 'active' : ''}`}
              onClick={() => selectPreset(p)}
            >
              {p.name}
            </div>
          ))}
          <button 
            className="preset-card" 
            style={{ borderStyle: 'dashed', opacity: 0.7 }}
            onClick={() => setIsEditorOpen(true)}
          >
            + Custom Preset
          </button>
        </div>
      </section>

      {/* Settings Drawer Panel */}
      {isSettingsOpen && (
        <div className="drawer-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Settings</h2>
              <button className="icon-btn" onClick={() => setIsSettingsOpen(false)}>✕</button>
            </div>

            <div className="settings-group">
              <h3>Aesthetic Accent</h3>
              <div className="options-grid">
                {(['forest', 'ocean', 'lavender', 'amber'] as const).map(theme => (
                  <button
                    key={theme}
                    className={`option-btn ${preferences.accentTheme === theme ? 'active' : ''}`}
                    onClick={() => setPreferences(prev => ({ ...prev, accentTheme: theme }))}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <h3>Dark / Light Mode</h3>
              <div className="options-grid">
                {(['dark', 'light'] as const).map(mode => (
                  <button
                    key={mode}
                    className={`option-btn ${preferences.themeMode === mode ? 'active' : ''}`}
                    onClick={() => setPreferences(prev => ({ ...prev, themeMode: mode }))}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <h3>Timer Visual Style</h3>
              <div className="options-grid">
                {(['digital', 'ring', 'minimal', 'linear'] as const).map(style => (
                  <button
                    key={style}
                    className={`option-btn ${preferences.clockStyle === style ? 'active' : ''}`}
                    onClick={() => setPreferences(prev => ({ ...prev, clockStyle: style }))}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-group">
              <h3>Sound Settings</h3>
              {/* Ticking Mute/Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Clock Ticking</label>
                <input 
                  type="checkbox" 
                  checked={!preferences.tickMuted} 
                  onChange={e => setPreferences(prev => ({ ...prev, tickMuted: !e.target.checked }))}
                />
              </div>
              <select 
                value={preferences.tickType}
                onChange={e => setPreferences(prev => ({ ...prev, tickType: e.target.value as any }))}
                className="option-btn"
                style={{ width: '100%', marginBottom: '12px' }}
              >
                <option value="woodblock">Woodblock</option>
                <option value="click">Mechanical Click</option>
                <option value="heartbeat">Organic Heartbeat</option>
              </select>

              {/* Chime Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Transition Chimes</label>
                <input 
                  type="checkbox" 
                  checked={!preferences.chimeMuted} 
                  onChange={e => setPreferences(prev => ({ ...prev, chimeMuted: !e.target.checked }))}
                />
              </div>
              <select 
                value={preferences.chimeType}
                onChange={e => setPreferences(prev => ({ ...prev, chimeType: e.target.value as any }))}
                className="option-btn"
                style={{ width: '100%', marginBottom: '12px' }}
              >
                <option value="singing-bowl">Tibetan Singing Bowl</option>
                <option value="crystal">Crystal Chime</option>
                <option value="gong">Warm Gong</option>
              </select>

              {/* Ambient sound settings */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>Ambient Noise</label>
                <input 
                  type="checkbox" 
                  checked={!preferences.ambientMuted} 
                  onChange={e => setPreferences(prev => ({ ...prev, ambientMuted: !e.target.checked }))}
                />
              </div>
              <select 
                value={preferences.ambientType}
                onChange={e => setPreferences(prev => ({ ...prev, ambientType: e.target.value as any }))}
                className="option-btn"
                style={{ width: '100%', marginBottom: '16px' }}
              >
                <option value="none">No Background Ambient</option>
                <option value="waves">Ocean Waves</option>
                <option value="rain">Gentle Rain</option>
                <option value="drone">Zen Drone</option>
              </select>

              {/* Voice Guide Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label>TTS Voice Guide</label>
                <input 
                  type="checkbox" 
                  checked={preferences.voiceGuideEnabled && !preferences.voiceMuted} 
                  onChange={e => setPreferences(prev => ({ ...prev, voiceGuideEnabled: e.target.checked, voiceMuted: !e.target.checked }))}
                />
              </div>

              {/* Master volume slider */}
              <div className="volume-row">
                <span>🔊</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={preferences.soundVolume} 
                  onChange={e => setPreferences(prev => ({ ...prev, soundVolume: parseFloat(e.target.value) }))}
                  className="slider-input"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard / Analytics Drawer */}
      {isDashboardOpen && (
        <div className="drawer-overlay" onClick={() => setIsDashboardOpen(false)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>Analytics & Stats</h2>
              <button className="icon-btn" onClick={() => setIsDashboardOpen(false)}>✕</button>
            </div>
            <Dashboard history={history} currentPreset={currentPreset} onClearHistory={() => {
              if (confirm("Are you sure you want to clear all history?")) {
                setHistory([]);
                db.saveHistory([]);
              }
            }} />
          </div>
        </div>
      )}

      {/* Preset Custom Editor Modal */}
      {isEditorOpen && (
        <PresetEditor 
          presets={presets} 
          onSave={(updatedPresets) => {
            setPresets(updatedPresets);
            db.savePresets(updatedPresets);
            setIsEditorOpen(false);
          }} 
          onClose={() => setIsEditorOpen(false)} 
        />
      )}
    </div>
  );
};
