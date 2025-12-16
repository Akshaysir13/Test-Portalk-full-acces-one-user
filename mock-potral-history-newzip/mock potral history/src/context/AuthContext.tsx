import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../lib/api';

const ADMIN_EMAIL = 'admin@jee.com';
const ADMIN_PASSWORD = 'admin123';

const initialAccounts: UserAccount[] = [
  { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin', approved: true },
  { email: 'test@gmail.com', password: 'test123', role: 'student', approved: true },
];

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
    console.log('🚀 AuthProvider mounted - initializing...');
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      console.log('📦 Found saved user in localStorage:', savedUser);
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);
    } else {
      console.log('📦 No saved user in localStorage');
    }
    refreshUsers();
  }, []);

  // Log when users state updates
  useEffect(() => {
    console.log('👥 Users state updated. Total users:', users.length);
    console.log('👥 All users:', users);
    if (users.length > 0) {
      console.log('👥 User emails:', users.map(u => u.email));
      console.log('👥 User roles:', users.map(u => ({ email: u.email, role: u.role, approved: u.approved })));
    }
  }, [users]);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') return;

    console.log('⏰ Setting up session check for user:', currentUser.email);

    const checkSession = async () => {
      console.log('🔍 Checking session for user:', currentUser.email);
      const result = await api.verifySession(currentUser.id);
      console.log('🔍 Session verification result:', result);
      if (!result.valid) {
        console.log('❌ Session expired for user:', currentUser.email);
        setSessionExpired(true);
        setIsAuthenticated(false);
        setCurrentUser(null);
        localStorage.removeItem('current_user');
      }
    };

    const interval = setInterval(checkSession, 5000);
    return () => {
      console.log('🛑 Clearing session check interval');
      clearInterval(interval);
    };
  }, [currentUser]);

  const refreshUsers = async () => {
    try {
      console.log('🔄 Refreshing users from API...');
      const fetchedUsers = await api.getUsers();
      console.log('📊 Fetched users from API:', fetchedUsers);
      console.log('📊 Number of users fetched:', fetchedUsers.length);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('❌ Error refreshing users:', error);
    }
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    console.log('🔐 Login attempt for:', email);
    setSessionExpired(false);
    
    try {
      const result = await api.login(email, password);
      console.log('🔐 Login API result:', result);
      
      if (result.success && result.user) {
        console.log('✅ Login successful for:', email);
        console.log('✅ User details:', result.user);
        setIsAuthenticated(true);
        setCurrentUser(result.user);
        localStorage.setItem('current_user', JSON.stringify(result.user));
        return { success: true, message: 'Login successful', isAdmin: result.isAdmin };
      }
      console.log('❌ Login failed:', result.message);
      return { success: false, message: result.message };
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, message: 'Login error occurred' };
    }
  };

  const logout = async () => {
    console.log('🚪 Logging out user:', currentUser?.email);
    if (currentUser) {
      await api.logout(currentUser.id);
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSessionExpired(false);
    localStorage.removeItem('current_user');
    console.log('✅ Logout complete');
  };

  const addStudent = async (email: string, password: string, autoApprove: boolean = false) => {
    console.log('➕ Adding student:', email, 'autoApprove:', autoApprove);
    try {
      const result = await api.addUser(email, password, autoApprove);
      console.log('➕ Add user result:', result);
      if (result.success) {
        console.log('✅ User added successfully, refreshing user list...');
        await refreshUsers();
      }
      return result;
    } catch (error) {
      console.error('❌ Error adding student:', error);
      return { success: false, message: 'Error adding student' };
    }
  };

  const deleteStudent = async (email: string) => {
    console.log('🗑️ Deleting student:', email);
    try {
      await api.deleteUser(email);
      console.log('✅ User deleted, refreshing user list...');
      await refreshUsers();
    } catch (error) {
      console.error('❌ Error deleting student:', error);
    }
  };

  const approveStudent = async (email: string) => {
    console.log('✅ Approving student:', email);
    try {
      await api.approveUser(email);
      console.log('✅ User approved, refreshing user list...');
      await refreshUsers();
    } catch (error) {
      console.error('❌ Error approving student:', error);
    }
  };

  const rejectStudent = async (email: string) => {
    console.log('❌ Rejecting student:', email);
    try {
      await api.rejectUser(email);
      console.log('✅ User rejected, refreshing user list...');
      await refreshUsers();
    } catch (error) {
      console.error('❌ Error rejecting student:', error);
    }
  };

  const getPendingStudents = async () => {
    const pending = users.filter(u => u.role === 'student' && !u.approved);
    console.log('⏳ Pending students:', pending);
    console.log('⏳ Pending count:', pending.length);
    return pending;
  };

  const getApprovedStudents = async () => {
    const approved = users.filter(u => u.role === 'student' && u.approved);
    console.log('✅ Approved students:', approved);
    console.log('✅ Approved count:', approved.length);
    return approved;
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
