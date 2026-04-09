import { createContext, useContext, useState, ReactNode } from 'react';
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
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => void;
  logout: () => void;
  switchRole: (role: InternalRole, companyId: string, companyName: string, departmentId: string, departmentName: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string) => {
    const mockUser: User = {
      id: 'user-001',
      name: 'John Doe',
      email: email,
      role: 'Super Admin',
      companyId: 'comp-001',
      companyName: 'Acme Corp',
      departmentId: 'dept-001',
      departmentName: 'IT',
      avatar: undefined
    };
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: InternalRole, companyId: string, companyName: string, departmentId: string, departmentName: string) => {
    if (user) {
      setUser({
        ...user,
        role,
        companyId,
        companyName,
        departmentId,
        departmentName
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
