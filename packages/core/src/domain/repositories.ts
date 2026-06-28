import { UserData } from './entities';

export interface IUserDataRepository {
  loadData(syncKey: string): Promise<UserData | null>;
  saveData(syncKey: string, data: UserData): Promise<boolean>;
  subscribeToUpdates(syncKey: string, onUpdate: (data: UserData) => void): () => void;
}
