import React, { useState, useEffect, useRef } from 'react';
import { 
  Preset, 
  TimerState, 
  TimerStateMachine, 
  defaultPresets, 
  defaultPreferences, 
  UserPreferences,
  SessionLog
} from '@jus-breathe/core';
import { webAudioService } from '../../infrastructure/audio/WebAudioService';
import { speechService } from '../../infrastructure/audio/SpeechService';
import { LocalStorageRepo } from '../../infrastructure/db/LocalStorageRepo';
import { SupabaseRepo } from '../../infrastructure/db/SupabaseRepo';
import { Dashboard } from './Dashboard';
import { PresetEditor } from './PresetEditor';

const db = new LocalStorageRepo();

// --- SVG Icons ---
const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

const SpeakerOnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>
);

const SpeakerMuteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <line x1="23" y1="9" x2="17" y2="15"></line>
    <line x1="17" y1="9" x2="23" y2="15"></line>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4"></polygon>
  </svg>
);

const PauseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const SkipIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 4 15 12 5 20 5 4"></polygon>
    <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5"></line>
  </svg>
);

const ResetIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
  </svg>
);


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
  
  // Layout views (rhythmic dashboard vs minimal Zen focus)
  const [layoutMode, setLayoutMode] = useState<'dashboard' | 'minimal'>('dashboard');

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [presetToEdit, setPresetToEdit] = useState<Preset | null>(null);

  // References
  const stateMachineRef = useRef<TimerStateMachine | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const sessionStartRef = useRef<string | null>(null);

  const [isMasterMuted, setIsMasterMuted] = useState(false);

  // Cloud Sync states & handlers
  const [syncKey, setSyncKey] = useState<string | null>(() => db.getSyncKey());
  const [inputSyncKey, setInputSyncKey] = useState('');
  const supabaseRepo = useRef(new SupabaseRepo());

  // Real-time Cloud Sync Subscription & Initial Pull
  useEffect(() => {
    if (!syncKey) return;

    supabaseRepo.current.loadData(syncKey).then((cloudData) => {
      if (cloudData) {
        const mergedHistory = [...cloudData.history];
        history.forEach(localLog => {
          if (!mergedHistory.some(cloudLog => cloudLog.id === localLog.id)) {
            mergedHistory.push(localLog);
          }
        });
        
        mergedHistory.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

        setHistory(mergedHistory);
        setPresets(cloudData.presets);
        setPreferences(cloudData.preferences);

        db.saveHistory(mergedHistory);
        db.savePresets(cloudData.presets);
        db.savePreferences(cloudData.preferences);
      } else {
        supabaseRepo.current.saveData(syncKey, {
          syncKey,
          preferences,
          presets,
          history
        });
      }
    });

    const unsubscribe = supabaseRepo.current.subscribeToUpdates(syncKey, (cloudData) => {
      if (cloudData) {
        setHistory(cloudData.history);
        setPresets(cloudData.presets);
        setPreferences(cloudData.preferences);
        db.saveHistory(cloudData.history);
        db.savePresets(cloudData.presets);
        db.savePreferences(cloudData.preferences);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [syncKey]);

  // Debounced push to cloud on local changes
  useEffect(() => {
    if (!syncKey) return;

    const timer = setTimeout(() => {
      supabaseRepo.current.saveData(syncKey, {
        syncKey,
        preferences,
        presets,
        history
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [preferences, presets, history, syncKey]);

  const handleGenerateSyncKey = () => {
    const key = `jb_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
    setSyncKey(key);
    db.saveSyncKey(key);
  };

  const handleLinkSyncKey = () => {
    const trimmed = inputSyncKey.trim();
    if (!trimmed) {
      alert("Please enter a valid Sync Key.");
      return;
    }
    setSyncKey(trimmed);
    db.saveSyncKey(trimmed);
    setInputSyncKey('');
    alert("Sync Key linked successfully! Merging data...");
  };

  const handleUnlinkSync = () => {
    if (confirm("Are you sure you want to unlink? Your data will remain on this device, but real-time sync will stop.")) {
      setSyncKey(null);
      db.saveSyncKey('');
    }
  };

  // Sync settings and theme with body classes
  useEffect(() => {
    const body = document.body;
    body.className = `theme-${preferences.accentTheme} ${preferences.themeMode}-mode`;
    
    db.savePreferences(preferences);
    
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

  // Handle visibility changes to unlock AudioContext
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
    workerRef.current?.postMessage({ action: 'stop' });
    
    const stateCallback = (newState: TimerState, event: string) => {
      setState(newState);

      // Transition the background based on current stage type
      const activeStage = newState.preset.phases[newState.currentPhaseIndex].stages[newState.currentStageIndex];
      document.body.classList.remove('stage-inhale', 'stage-exhale', 'stage-hold');
      if (activeStage) {
        if (activeStage.type === 'inhale') {
          document.body.classList.add('stage-inhale');
        } else if (activeStage.type === 'exhale') {
          document.body.classList.add('stage-exhale');
        } else {
          document.body.classList.add('stage-hold');
        }
      }

      if (event === 'stage-changed') {
        const currentStage = newState.preset.phases[newState.currentPhaseIndex].stages[newState.currentStageIndex];
        webAudioService.playChime(preferences.chimeType);
        speechService.speak(currentStage.name);
      }

      if (event === 'tick') {
        const currentStage = newState.preset.phases[newState.currentPhaseIndex].stages[newState.currentStageIndex];
        if (currentStage.duration !== null) {
          webAudioService.playTick(preferences.tickType);
        }
      }

      if (event === 'finished') {
        workerRef.current?.postMessage({ action: 'stop' });
        webAudioService.playChime(preferences.chimeType);
        speechService.speak("Session complete. Well done.");
        document.body.classList.remove('stage-inhale', 'stage-exhale', 'stage-hold');
        
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
      if (stateMachineRef.current.getState().totalSessionDuration === 0) {
        sessionStartRef.current = new Date().toISOString();
      }
      
      stateMachineRef.current.play();
      workerRef.current?.postMessage({ action: 'start', interval: 1000 });
      
      if (!preferences.ambientMuted && preferences.ambientType !== 'none') {
        webAudioService.startAmbient(preferences.ambientType);
      }
    }
  };

  const handleReset = () => {
    stateMachineRef.current?.reset();
    workerRef.current?.postMessage({ action: 'stop' });
    document.body.classList.remove('stage-inhale', 'stage-exhale', 'stage-hold');
  };

  const handleSkip = () => {
    stateMachineRef.current?.skip();
  };

  const selectPreset = (preset: Preset) => {
    setCurrentPreset(preset);
  };

  const handleMasterMuteToggle = () => {
    const isMuted = webAudioService.toggleMute('master');
    setIsMasterMuted(isMuted);
    speechService.setMuted(isMuted);
  };

  const handleDeletePreset = (presetId: string) => {
    const isDefault = ['box', 'relax', 'wimhof', 'tm'].includes(presetId);
    if (isDefault) {
      alert("Default presets cannot be deleted.");
      return;
    }
    const updated = presets.filter(p => p.id !== presetId);
    setPresets(updated);
    db.savePresets(updated);
    
    setCurrentPreset(updated[0] || defaultPresets[0]);
    setIsEditorOpen(false);
    setPresetToEdit(null);
  };

  const currentStage = state ? state.preset.phases[state.currentPhaseIndex].stages[state.currentStageIndex] : null;
  const currentPhase = state ? state.preset.phases[state.currentPhaseIndex] : null;

  // Visualizer scale calculations
  let portalScale = 1.0;
  let stageColorClass = '--inhale-color';
  let stageGlowClass = '--inhale-glow';

  if (currentStage) {
    if (currentStage.type === 'inhale') {
      portalScale = state && currentStage.duration 
        ? 0.95 + (state.timeElapsed / currentStage.duration) * 0.65
        : 1.6;
      stageColorClass = 'var(--inhale-color)';
      stageGlowClass = 'var(--inhale-glow)';
    } else if (currentStage.type === 'exhale') {
      portalScale = state && currentStage.duration 
        ? 1.6 - (state.timeElapsed / currentStage.duration) * 0.65
        : 0.95;
      stageColorClass = 'var(--exhale-color)';
      stageGlowClass = 'var(--exhale-glow)';
    } else {
      portalScale = 1.25; // holds
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
    <div className={`workspace-deck layout-${layoutMode}`}>

      {/* 1. Left Sidebar: Presets */}
      <aside className="deck-sidebar sidebar-left">
        <div className="sidebar-scrollable">
          <div className="sidebar-section-header">
            <h2>Exercise Presets</h2>
            <button 
              className="icon-btn" 
              onClick={() => {
                setPresetToEdit(null);
                setIsEditorOpen(true);
              }}
              title="Create Custom Preset"
            >
              <PlusIcon />
            </button>
          </div>
          <p className="sidebar-subtext">Select a preset to align your breath state.</p>
          
          <div className="sidebar-presets-list">
            {presets.map(p => (
              <div 
                key={`sidebar-${p.id}`} 
                className={`preset-sidebar-card ${currentPreset.id === p.id ? 'active' : ''}`}
                onClick={() => selectPreset(p)}
              >
                <div className="preset-card-title-row">
                  <h4>{p.name}</h4>
                  {currentPreset.id === p.id && (
                    <button 
                      className="inline-edit-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPresetToEdit(currentPreset);
                        setIsEditorOpen(true);
                      }}
                      title="Edit Preset"
                    >
                      <EditIcon />
                    </button>
                  )}
                </div>
                <p>{p.description}</p>
                <span className="preset-card-theme-tag">Theme: {p.theme}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* 2. Center Column: Main Breathing Portal & Playback Controls */}
      <main className="deck-center">
        {/* Ambient background glowing blobs */}
        <div className="ambient-glow-spot top" style={{ '--inhale-glow': stageGlowClass } as React.CSSProperties} />
        <div className="ambient-glow-spot bottom" style={{ '--inhale-glow': stageGlowClass } as React.CSSProperties} />

        {/* Interaction Entrance Guard Screen */}
        {!isUnlocked && (
          <div className="entrance-overlay">
            <div className="entrance-logo" style={{ '--accent-color': 'var(--accent-color)', '--inhale-color': 'var(--inhale-color)' } as React.CSSProperties} />
            <h1 style={{ marginBottom: '12px', fontWeight: 300, letterSpacing: '-0.03em' }}>Jus Breathe</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '300px', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Enter a space of stillness. Adjust your posture and prepare to breathe.
            </p>
            <button className="entrance-btn" onClick={() => {
              webAudioService.init();
              setIsUnlocked(true);
              speechService.speak("Ready.");
            }}>
              Enter Serenity
            </button>
          </div>
        )}

        {/* Header */}
        <header className="app-header">
          <h1 className="app-title">Jus Breathe</h1>

          {/* Pacôme Pertant Switch: [ dashboard • minimal ] */}
          <div className="layout-switch desktop-only">
            <button 
              className={`switch-btn ${layoutMode === 'dashboard' ? 'active' : ''}`}
              onClick={() => setLayoutMode('dashboard')}
            >
              <span>dashboard</span>
            </button>
            <span className="switch-dot"></span>
            <button 
              className={`switch-btn ${layoutMode === 'minimal' ? 'active' : ''}`}
              onClick={() => setLayoutMode('minimal')}
            >
              <span>minimal</span>
            </button>
          </div>

          <div className="header-actions">
            {/* Quick Master Mute Toggle */}
            <button className="icon-btn" onClick={handleMasterMuteToggle} title={isMasterMuted ? "Unmute All" : "Mute All"}>
              {isMasterMuted ? <SpeakerMuteIcon /> : <SpeakerOnIcon />}
            </button>
            
            <button className="icon-btn mobile-only" onClick={() => setIsDashboardOpen(true)} title="Progress & History">
              <DashboardIcon />
            </button>
            <button className="icon-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">
              <SettingsIcon />
            </button>
          </div>
        </header>

        {/* Central Visualizer Portal */}
        <div className="visualizer-container">
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
              <div className="breathing-circle-ripple" style={{ transform: `scale(${portalScale * 1.25})` } as React.CSSProperties} />
              
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
        </div>

        {/* Controls Center */}
        <div className="playback-controls-wrapper">
          <div className="control-bar">
            <button className="sub-btn" onClick={handleReset} title="Restart">
              <ResetIcon />
            </button>
            <button className="main-btn" onClick={handlePlayToggle} title={state?.isPlaying ? "Pause" : "Play"}>
              {state?.isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className="sub-btn" onClick={handleSkip} title="Skip/Next">
              <SkipIcon />
            </button>
          </div>

          {/* Presets Carousel - Mobile Only */}
          <div className="mobile-presets-selector mobile-only">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Presets</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => { setPresetToEdit(currentPreset); setIsEditorOpen(true); }} title="Edit Preset">
                  <EditIcon />
                </button>
                <button className="icon-btn" style={{ width: '28px', height: '28px' }} onClick={() => { setPresetToEdit(null); setIsEditorOpen(true); }} title="Add Preset">
                  <PlusIcon />
                </button>
              </div>
            </div>
            <div className="presets-carousel">
              {presets.map(p => (
                <div 
                  key={`carousel-${p.id}`} 
                  className={`preset-card ${currentPreset.id === p.id ? 'active' : ''}`}
                  onClick={() => selectPreset(p)}
                >
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* 3. Right Sidebar: Embedded Analytics */}
      <aside className="deck-sidebar sidebar-right">
        <div className="sidebar-scrollable">
          <h2>Progress & Analytics</h2>
          <p className="sidebar-subtext" style={{ marginBottom: '16px' }}>Your daily logs, streaks, and history.</p>
          <Dashboard history={history} currentPreset={currentPreset} onClearHistory={() => {
            if (confirm("Are you sure you want to clear all history?")) {
              setHistory([]);
              db.saveHistory([]);
            }
          }} />
        </div>
      </aside>

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
              <h3>Sound Cues</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label>TTS Voice Guide</label>
                <input 
                  type="checkbox" 
                  checked={preferences.voiceGuideEnabled && !preferences.voiceMuted} 
                  onChange={e => setPreferences(prev => ({ ...prev, voiceGuideEnabled: e.target.checked, voiceMuted: !e.target.checked }))}
                />
              </div>

              <div className="volume-row">
                <span style={{ fontSize: '0.85rem' }}>Master Volume</span>
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

            {/* Cloud Synchronization group */}
            <div className="settings-group" style={{ marginTop: '24px', borderTop: '1px solid var(--panel-border)', paddingTop: '20px' }}>
              <h3>Cloud Synchronization</h3>
              {syncKey ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Your settings and history are actively synced.
                  </span>
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      backgroundColor: 'var(--input-bg)', 
                      padding: '10px 14px', 
                      borderRadius: '12px',
                      border: '1px solid var(--input-border)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    <span>{syncKey}</span>
                    <button 
                      className="icon-btn" 
                      style={{ width: '28px', height: '28px', border: 'none', backgroundColor: 'transparent' }} 
                      onClick={() => {
                        navigator.clipboard.writeText(syncKey);
                        alert("Sync Key copied to clipboard!");
                      }}
                      title="Copy Key"
                    >
                      📋
                    </button>
                  </div>
                  <button 
                    className="option-btn" 
                    style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} 
                    onClick={handleUnlinkSync}
                  >
                    Unlink Sync Key
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button className="option-btn" style={{ width: '100%' }} onClick={handleGenerateSyncKey}>
                    Generate Sync Key
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Or enter existing key" 
                      value={inputSyncKey}
                      onChange={e => setInputSyncKey(e.target.value)}
                      className="option-btn"
                      style={{ flex: 1, textAlign: 'left', padding: '10px', fontSize: '0.8rem', cursor: 'text' }}
                    />
                    <button className="option-btn active" style={{ padding: '0 16px' }} onClick={handleLinkSyncKey}>
                      Link
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard / Analytics Drawer (Mobile Only) */}
      {isDashboardOpen && (
        <div className="drawer-overlay mobile-only" onClick={() => setIsDashboardOpen(false)}>
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
          presetToEdit={presetToEdit}
          onSave={(updatedPresets) => {
            setPresets(updatedPresets);
            db.savePresets(updatedPresets);
            setIsEditorOpen(false);
            setPresetToEdit(null);
            
            const lastPreset = updatedPresets[updatedPresets.length - 1];
            if (presetToEdit) {
              const currentEdited = updatedPresets.find(p => p.id === presetToEdit.id);
              if (currentEdited) setCurrentPreset(currentEdited);
            } else if (lastPreset) {
              setCurrentPreset(lastPreset);
            }
          }} 
          onClose={() => {
            setIsEditorOpen(false);
            setPresetToEdit(null);
          }} 
          onDelete={handleDeletePreset}
        />
      )}
    </div>
  );
};
