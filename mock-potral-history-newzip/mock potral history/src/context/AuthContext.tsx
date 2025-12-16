import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../lib/api';

interface UserAccount {
  id: number;
  email: string;
  role: string;
  approved: boolean;
}

interface LoginResult {
  success: boolean;
  message: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: UserAccount | null;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  addStudent: (email: string, password: string, autoApprove?: boolean) => Promise<{ success: boolean; message: string }>;
  deleteStudent: (email: string) => Promise<void>;
  approveStudent: (email: string) => Promise<void>;
  rejectStudent: (email: string) => Promise<void>;
  getPendingStudents: () => Promise<UserAccount[]>;
  getApprovedStudents: () => Promise<UserAccount[]>;
  refreshUsers: () => Promise<void>;
  users: UserAccount[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
    refreshUsers();
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') return;

    const checkSession = async () => {
      const result = await api.verifySession(currentUser.id);
      if (!result.valid) {
        setSessionExpired(true);
        setIsAuthenticated(false);
        setCurrentUser(null);
        localStorage.removeItem('current_user');
      }
    };

    const interval = setInterval(checkSession, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const refreshUsers = async () => {
    const fetchedUsers = await api.getUsers();
    setUsers(fetchedUsers);
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setSessionExpired(false);
    const result = await api.login(email, password);
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setCurrentUser(result.user);
      localStorage.setItem('current_user', JSON.stringify(result.user));
      return { success: true, message: 'Login successful', isAdmin: result.isAdmin };
    }
    return { success: false, message: result.message };
  };

  const logout = async () => {
    if (currentUser) {
      await api.logout(currentUser.id);
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSessionExpired(false);
    localStorage.removeItem('current_user');
  };

  const addStudent = async (email: string, password: string, autoApprove: boolean = false) => {
    const result = await api.addUser(email, password, autoApprove);
    if (result.success) {
      await refreshUsers();
    }
    return result;
  };

  const deleteStudent = async (email: string) => {
    await api.deleteUser(email);
    await refreshUsers();
  };

  const approveStudent = async (email: string) => {
    await api.approveUser(email);
    await refreshUsers();
  };

  const rejectStudent = async (email: string) => {
    await api.rejectUser(email);
    await refreshUsers();
  };

  const getPendingStudents = async () => {
    return users.filter(u => u.role === 'student' && !u.approved);
  };

  const getApprovedStudents = async () => {
    return users.filter(u => u.role === 'student' && u.approved);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      currentUser,
      sessionExpired,
      login,
      logout,
      addStudent,
      deleteStudent,
      approveStudent,
      rejectStudent,
      getPendingStudents,
      getApprovedStudents,
      refreshUsers,
      users,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { UserAccount };
