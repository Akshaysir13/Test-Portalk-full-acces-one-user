import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============= MANUALLY ADD USERS HERE =============
const INITIAL_USERS = [
  { id: 1, email: 'admin@jee.com', password: 'admin123', role: 'admin', approved: true },
  { id: 2, email: 'test@gmail.com', password: 'test123', role: 'student', approved: true },
  // ADD YOUR NEW USERS HERE:
  { id: 3, email: 'newstudent@gmail.com', password: 'pass123', role: 'student', approved: true },
  { id: 4, email: 'pending@gmail.com', password: 'pass456', role: 'student', approved: false },
];
// ===================================================

interface UserAccount {
  id: number;
  email: string;
  password?: string; // Optional for security
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

// Local storage keys
const USERS_STORAGE_KEY = 'app_users';
const CURRENT_USER_KEY = 'current_user';
const SESSIONS_KEY = 'user_sessions';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Initialize users from localStorage or use INITIAL_USERS
  useEffect(() => {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      // First time - save initial users to localStorage
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      setUsers(INITIAL_USERS);
    }

    // Check for saved session
    const savedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
  }, []);

  // Session check for students
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') return;

    const checkSession = () => {
      const sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
      const validSession = sessions.find(
        (s: any) => s.userId === currentUser.id && s.isActive
      );

      if (!validSession) {
        setSessionExpired(true);
        setIsAuthenticated(false);
        setCurrentUser(null);
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    };

    const interval = setInterval(checkSession, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const refreshUsers = async () => {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
  };

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setSessionExpired(false);
    
    const storedUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const user = storedUsers.find((u: any) => u.email === email && u.password === password);

    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }

    if (!user.approved) {
      return { success: false, message: 'Your account is pending approval' };
    }

    // Create session
    const sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
    const existingSessionIndex = sessions.findIndex((s: any) => s.userId === user.id);
    
    if (existingSessionIndex >= 0) {
      sessions[existingSessionIndex].isActive = true;
    } else {
      sessions.push({ userId: user.id, isActive: true });
    }
    
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

    // Don't store password in current user
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;

    setIsAuthenticated(true);
    setCurrentUser(userWithoutPassword);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));

    return { 
      success: true, 
      message: 'Login successful', 
      isAdmin: user.role === 'admin' 
    };
  };

  const logout = async () => {
    if (currentUser) {
      const sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
      const updatedSessions = sessions.map((s: any) => 
        s.userId === currentUser.id ? { ...s, isActive: false } : s
      );
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedSessions));
    }

    setIsAuthenticated(false);
    setCurrentUser(null);
    setSessionExpired(false);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const addStudent = async (email: string, password: string, autoApprove: boolean = false) => {
    const storedUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');

    if (storedUsers.find((u: any) => u.email === email)) {
      return { success: false, message: 'User with this email already exists' };
    }

    const newUser = {
      id: Math.max(...storedUsers.map((u: any) => u.id), 0) + 1,
      email,
      password,
      role: 'student',
      approved: autoApprove
    };

    storedUsers.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(storedUsers));
    setUsers(storedUsers);

    return { success: true, message: 'Student added successfully' };
  };

  const deleteStudent = async (email: string) => {
    const storedUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const updatedUsers = storedUsers.filter((u: any) => u.email !== email);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
  };

  const approveStudent = async (email: string) => {
    const storedUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const user = storedUsers.find((u: any) => u.email === email);
    
    if (user) {
      user.approved = true;
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(storedUsers));
      setUsers(storedUsers);
    }
  };

  const rejectStudent = async (email: string) => {
    const storedUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
    const updatedUsers = storedUsers.filter((u: any) => u.email !== email);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
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
