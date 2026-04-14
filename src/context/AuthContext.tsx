import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { InternalRole } from '../utils/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: InternalRole;
  companyId: string;
  companyName: string;
  departmentId: string;
  departmentName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  switchRole: (role: InternalRole, companyId: string, companyName: string, departmentId: string, departmentName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maps dems_roles.role_code → InternalRole used throughout the app
const ROLE_CODE_MAP: Record<string, InternalRole> = {
  super_admin: 'Super Admin',
  company_admin: 'Company Admin',
  department_admin: 'Department Admin',
  user: 'User',
  viewer: 'Viewer',
  auditor: 'Auditor',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load the dems_users profile after a Supabase auth session is established
  async function loadProfile(): Promise<void> {
    const { data, error } = await supabase.rpc('get_or_create_dems_user');

    if (error || !data || data.length === 0) {
      console.error('Failed to load user profile:', error);
      setUser(null);
      return;
    }

    const profile = data[0];
    setUser({
      id: profile.user_id,
      name: profile.full_name,
      email: profile.email,
      role: ROLE_CODE_MAP[profile.role_code] ?? 'User',
      companyId: profile.company_id ?? '',
      companyName: '',        // populated once company management is wired up
      departmentId: profile.department_id ?? '',
      departmentName: '',
    });
  }

  // Restore session on mount and listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadProfile().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadProfile();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    await loadProfile();
    return null;
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Role switcher kept for demo / development purposes
  const switchRole = (
    role: InternalRole,
    companyId: string,
    companyName: string,
    departmentId: string,
    departmentName: string
  ) => {
    if (user) {
      setUser({ ...user, role, companyId, companyName, departmentId, departmentName });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
