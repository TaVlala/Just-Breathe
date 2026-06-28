import { describe, it, expect } from 'vitest';
import { defaultPresets, defaultPreferences } from '../presets';

describe('Domain Default Presets & Preferences', () => {
  it('should load default presets correctly', () => {
    expect(defaultPresets).toBeDefined();
    expect(Array.isArray(defaultPresets)).toBe(true);
    expect(defaultPresets.length).toBeGreaterThan(0);
  });

  it('should contain box breathing with 4 stages', () => {
    const box = defaultPresets.find(p => p.id === 'box');
    expect(box).toBeDefined();
    expect(box?.phases[0].stages.length).toBe(4);
    expect(box?.phases[0].stages[0].duration).toBe(4);
  });

  it('should load default preferences correctly', () => {
    expect(defaultPreferences).toBeDefined();
    expect(defaultPreferences.themeMode).toBe('dark');
    expect(defaultPreferences.accentTheme).toBe('forest');
    expect(defaultPreferences.clockStyle).toBe('digital');
  });
});
