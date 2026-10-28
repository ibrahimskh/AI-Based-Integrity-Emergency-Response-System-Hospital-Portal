import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { defaultHospitalId, findUserProfile } from '../data/db';

const AuthContext = createContext(null);
const SESSION_KEY = 'lifeline_session';

function inferPortalRole(profile) {
  if (profile?.role === 'hospital' || profile?.role === 'admin') return profile.role;
  if (profile?.role === 'patient' || profile?.role === 'driver' || profile?.role === 'donor') return profile.role;
  // Firebase Auth accounts without a portal role are treated as operators.
  if (!profile) return 'admin';
  return profile.role || 'admin';
}

async function buildSession(firebaseUser) {
  const profile = await findUserProfile({ uid: firebaseUser.uid, email: firebaseUser.email });
  const role = inferPortalRole(profile);
  let hospitalId = profile?.hospitalId || null;

  if (role === 'hospital' && !hospitalId) {
    hospitalId = await defaultHospitalId();
    if (hospitalId) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: firebaseUser.email,
          name: profile?.name || firebaseUser.displayName || 'Hospital Staff',
          role: 'hospital',
          status: 'active',
          hospital_id: hospitalId,
        }, { merge: true });
      } catch {
        /* session still works even if the write is denied */
      }
    }
  }

  return {
    id: profile?.id || firebaseUser.uid,
    uid: firebaseUser.uid,
    name: profile?.name || firebaseUser.displayName || firebaseUser.email,
    email: firebaseUser.email,
    role,
    userType: profile?.userType || (role === 'admin' ? 'System Admin' : role === 'hospital' ? 'Hospital Staff' : 'User'),
    hospitalId,
    phone: profile?.phone || '',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          localStorage.removeItem(SESSION_KEY);
          setUser(null);
          return;
        }
        const session = await buildSession(firebaseUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        setUser(session);
      } catch (err) {
        console.error('Failed to load user profile', err);
        setUser(null);
      } finally {
        setInitializing(false);
      }
    });
    return unsub;
  }, []);

  const login = useCallback(async (email, password, requiredRole) => {
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const mapped = new Error(err.code === 'auth/user-disabled'
        ? 'This account has been disabled. Contact your system administrator.'
        : 'Invalid email or password.');
      mapped.code = err.code || 'auth/invalid-credential';
      throw mapped;
    }

    const session = await buildSession(cred.user);
    if (session.role === 'disabled') {
      await signOut(auth);
      const err = new Error('This account has been disabled. Contact your system administrator.');
      err.code = 'auth/user-disabled';
      throw err;
    }
    if (requiredRole && session.role !== requiredRole) {
      await signOut(auth);
      const err = new Error(`This account does not have ${requiredRole} portal access.`);
      err.code = 'auth/wrong-portal';
      throw err;
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword, nextPassword) => {
    const current = auth.currentUser;
    if (!current?.email) throw new Error('You need to be signed in to change your password.');
    const credential = EmailAuthProvider.credential(current.email, currentPassword);
    await reauthenticateWithCredential(current, credential);
    await fbUpdatePassword(current, nextPassword);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Not signed in.');
    await setDoc(doc(db, 'users', current.uid), patch, { merge: true });
    setUser((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, login, logout, changePassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
