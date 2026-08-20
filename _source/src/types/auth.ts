import { User, Session } from '@supabase/supabase-js';
import { Workspace } from './database';

export interface AuthState {
  user: User | null;
  session: Session | null;
  currentWorkspace: Workspace | null;
  isLoading: boolean;
}
