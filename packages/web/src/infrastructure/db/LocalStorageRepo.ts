import { UserPreferences, SessionLog, Preset } from '@jus-breathe/core';

export class LocalStorageRepo {
  private PREFS_KEY = 'jus_breathe_prefs';
  private LOGS_KEY = 'jus_breathe_logs';
  private PRESETS_KEY = 'jus_breathe_presets';
  private const_SYNC_KEY = 'jus_breathe_sync_key';

  // In-memory fallback cache if browser blocks localStorage (e.g. Incognito/Private modes)
  private memoryCache: Record<string, string> = {};

  private setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`Jus Breathe: localStorage write blocked for "${key}". Using in-memory fallback.`, error);
      this.memoryCache[key] = value;
    }
  }

  private getItem(key: string): string | null {
    try {
      return localStorage.getItem(key) || this.memoryCache[key] || null;
    } catch (error) {
      console.warn(`Jus Breathe: localStorage read blocked for "${key}". Using in-memory fallback.`, error);
      return this.memoryCache[key] || null;
    }
  }

  loadPreferences(): UserPreferences | null {
    try {
      const data = this.getItem(this.PREFS_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  savePreferences(pref: UserPreferences): void {
    this.setItem(this.PREFS_KEY, JSON.stringify(pref));
  }

  loadHistory(): SessionLog[] {
    try {
      const data = this.getItem(this.LOGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveHistory(logs: SessionLog[]): void {
    this.setItem(this.LOGS_KEY, JSON.stringify(logs));
  }

  loadPresets(): Preset[] | null {
    try {
      const data = this.getItem(this.PRESETS_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  savePresets(presets: Preset[]): void {
    this.setItem(this.PRESETS_KEY, JSON.stringify(presets));
  }

  getSyncKey(): string | null {
    return this.getItem(this.const_SYNC_KEY);
  }

  saveSyncKey(key: string): void {
    this.setItem(this.const_SYNC_KEY, key);
  }
}
export default LocalStorageRepo;
