import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IUserDataRepository, UserData } from '@jus-breathe/core';

// Retrieve environment keys (loaded via Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'PLACEHOLDER_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'PLACEHOLDER_KEY';

export class SupabaseRepo implements IUserDataRepository {
  private client: SupabaseClient | null = null;
  private isConfigured = false;

  constructor() {
    if (
      supabaseUrl !== 'PLACEHOLDER_URL' && 
      supabaseUrl.trim() !== '' &&
      supabaseAnonKey !== 'PLACEHOLDER_KEY' &&
      supabaseAnonKey.trim() !== ''
    ) {
      try {
        this.client = createClient(supabaseUrl, supabaseAnonKey);
        this.isConfigured = true;
        console.log("Jus Breathe: Supabase Connected Successfully.");
      } catch (error) {
        console.warn("Jus Breathe: Supabase initialization failed, falling back to local database.", error);
      }
    } else {
      console.log("Jus Breathe: Cloud sync keys not configured, running in local-only mode.");
    }
  }

  async loadData(syncKey: string): Promise<UserData | null> {
    if (!this.isConfigured || !this.client) return null;

    try {
      const { data, error } = await this.client
        .from('users')
        .select('data')
        .eq('sync_key', syncKey)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Document not found - normal case for new sync keys
          return null;
        }
        throw error;
      }

      return data?.data as UserData;
    } catch (error) {
      console.error("Supabase loadData error:", error);
      return null;
    }
  }

  async saveData(syncKey: string, data: UserData): Promise<boolean> {
    if (!this.isConfigured || !this.client) return false;

    try {
      const { error } = await this.client
        .from('users')
        .upsert({
          sync_key: syncKey,
          data: data,
          last_synced: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Supabase saveData error:", error);
      return false;
    }
  }

  subscribeToUpdates(syncKey: string, onUpdate: (data: UserData) => void): () => void {
    if (!this.isConfigured || !this.client) return () => {};

    try {
      const channel = this.client
        .channel(`users_sync:${syncKey}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users', filter: `sync_key=eq.${syncKey}` },
          (payload) => {
            const newData = payload.new as { data: UserData };
            if (newData?.data) {
              onUpdate(newData.data);
            }
          }
        )
        .subscribe();

      return () => {
        this.client?.removeChannel(channel);
      };
    } catch (error) {
      console.error("Supabase subscription error:", error);
      return () => {};
    }
  }
}
export default SupabaseRepo;
