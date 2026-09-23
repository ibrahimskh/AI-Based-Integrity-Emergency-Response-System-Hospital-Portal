import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { dbGetAll } from '../data/db';

// Shaped so it can be swapped for firebase/auth's signInWithEmailAndPassword /
// onAuthStateChanged / signOut later without touching consuming components.

const AuthContext = createContext(null);
const SESSION_KEY = 'lifeline_demo_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* ignore corrupt session */ }
    }
    setInitializing(false);
  }, []);

  const login = useCallback(async (email, password, requiredRole) => {
    await new Promise((r) => setTimeout(r, 500)); // simulate network round-trip
    const users = await dbGetAll('users');
    const match = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!match || match.password !== password) {
      const err = new Error('Invalid email or password.');
      err.code = 'auth/invalid-credential';
      throw err;
    }
    if (match.status === 'disabled') {
      const err = new Error('This account has been disabled. Contact your system administrator.');
      err.code = 'auth/user-disabled';
      throw err;
    }
    if (requiredRole && match.role !== requiredRole) {
      const err = new Error(`This account does not have ${requiredRole} portal access.`);
      err.code = 'auth/wrong-portal';
      throw err;
    }

    const session = { id: match.id, name: match.name, email: match.email, role: match.role, userType: match.userType, hospitalId: match.hospitalId || null };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 200));
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
