import { UserPreferences, SessionLog, Preset } from '@jus-breathe/core';

export class LocalStorageRepo {
  private PREFS_KEY = 'jus_breathe_prefs';
  private LOGS_KEY = 'jus_breathe_logs';
  private PRESETS_KEY = 'jus_breathe_presets';
  const_SYNC_KEY = 'jus_breathe_sync_key';

  loadPreferences(): UserPreferences | null {
    const data = localStorage.getItem(this.PREFS_KEY);
    return data ? JSON.parse(data) : null;
  }

  savePreferences(pref: UserPreferences): void {
    localStorage.setItem(this.PREFS_KEY, JSON.stringify(pref));
  }

  loadHistory(): SessionLog[] {
    const data = localStorage.getItem(this.LOGS_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveHistory(logs: SessionLog[]): void {
    localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs));
  }

  loadPresets(): Preset[] | null {
    const data = localStorage.getItem(this.PRESETS_KEY);
    return data ? JSON.parse(data) : null;
  }

  savePresets(presets: Preset[]): void {
    localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
  }

  getSyncKey(): string | null {
    return localStorage.getItem(this.const_SYNC_KEY);
  }

  saveSyncKey(key: string): void {
    localStorage.setItem(this.const_SYNC_KEY, key);
  }
}
