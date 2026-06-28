// Core Domain Entities for Jus Breathe

export type StageType = 'inhale' | 'hold-full' | 'exhale' | 'hold-empty';
export type PresetType = 'standard' | 'wim-hof' | 'meditation';

export interface Stage {
  name: string;
  duration: number | null; // null represents manual count-up hold (e.g., Wim Hof retention)
  type: StageType;
}

export interface Phase {
  name: string;
  repeats: number | null; // null represents infinite loop (e.g. standard cycles)
  stages: Stage[];
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  theme: 'forest' | 'ocean' | 'lavender' | 'amber';
  type: PresetType;
  phases: Phase[];
}

export interface SessionLog {
  id: string;
  presetId: string;
  presetName: string;
  startedAt: string; // ISO String
  completedAt: string; // ISO String
  durationSeconds: number;
  wimHofHolds?: number[]; // Stores retention duration (seconds) for each round
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null; // Format: "YYYY-MM-DD"
}

export interface UserPreferences {
  themeMode: 'light' | 'dark';
  accentTheme: 'forest' | 'ocean' | 'lavender' | 'amber';
  clockStyle: 'digital' | 'ring' | 'minimal' | 'linear';
  soundVolume: number;
  tickType: 'woodblock' | 'click' | 'heartbeat';
  chimeType: 'singing-bowl' | 'crystal' | 'gong';
  ambientType: 'none' | 'waves' | 'rain' | 'drone';
  ambientVolume: number;
  tickVolume: number;
  chimeVolume: number;
  voiceGuideEnabled: boolean;
  tickMuted: boolean;
  chimeMuted: boolean;
  voiceMuted: boolean;
  ambientMuted: boolean;
}

export interface UserData {
  syncKey: string;
  presets: Preset[];
  history: SessionLog[];
  preferences: UserPreferences;
  lastSynced?: string; // ISO String
}
