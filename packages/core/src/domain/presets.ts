import { Preset } from './entities';

export const defaultPresets: Preset[] = [
  {
    id: "box",
    name: "Box Breathing",
    description: "Used by Navy SEALs to reduce stress, calm the nervous system, and clear the mind.",
    theme: "forest",
    type: "standard",
    phases: [
      {
        name: "Cycle",
        repeats: null, // Loop indefinitely
        stages: [
          { name: "Inhale", duration: 4, type: "inhale" },
          { name: "Hold (Full)", duration: 4, type: "hold" },
          { name: "Exhale", duration: 4, type: "exhale" },
          { name: "Hold (Empty)", duration: 4, type: "hold" }
        ]
      }
    ]
  },
  {
    id: "relax",
    name: "4-7-8 Breathing",
    description: "A natural tranquilizer for the nervous system, helpful for falling asleep and calming anxiety.",
    theme: "lavender",
    type: "standard",
    phases: [
      {
        name: "Cycle",
        repeats: null,
        stages: [
          { name: "Inhale", duration: 4, type: "inhale" },
          { name: "Hold (Full)", duration: 7, type: "hold" },
          { name: "Exhale", duration: 8, type: "exhale" }
        ]
      }
    ]
  },
  {
    id: "wimhof",
    name: "Wim Hof Method",
    description: "Deep breathing followed by breath retention to increase oxygen, reduce stress, and boost immunity.",
    theme: "ocean",
    type: "wim-hof",
    phases: [
      {
        name: "Deep Breaths",
        repeats: 30,
        stages: [
          { name: "Inhale Deeply", duration: 2.0, type: "inhale" },
          { name: "Let Go (Exhale)", duration: 1.5, type: "exhale" }
        ]
      },
      {
        name: "Retention (Hold)",
        repeats: 1,
        stages: [
          { name: "Breath Hold (Empty)", duration: null, type: "hold" }
        ]
      },
      {
        name: "Recovery Breath",
        repeats: 1,
        stages: [
          { name: "Inhale & Hold (Full)", duration: 15, type: "hold" }
        ]
      }
    ]
  },
  {
    id: "tm",
    name: "Transcendental Meditation",
    description: "A simple, silent meditation. Sit comfortably, close your eyes, and repeat a mantra silently.",
    theme: "amber",
    type: "meditation",
    phases: [
      {
        name: "Meditation Timer",
        repeats: 1,
        stages: [
          { name: "Silent Meditation", duration: 1200, type: "hold" } // 20 minutes
        ]
      }
    ]
  }
];

export const defaultPreferences = {
  themeMode: 'dark' as const,
  accentTheme: 'forest' as const,
  clockStyle: 'digital' as const,
  soundVolume: 0.5,
  tickType: 'woodblock' as const,
  chimeType: 'singing-bowl' as const,
  ambientType: 'none' as const,
  ambientVolume: 0.08,
  tickVolume: 0.1, // very soft ticking default
  chimeVolume: 0.45,
  voiceGuideEnabled: true,
  tickMuted: true, // muted by default to avoid driving the user crazy!
  chimeMuted: false,
  voiceMuted: false,
  ambientMuted: false
};
