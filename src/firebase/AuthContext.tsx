import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: 'admin_teknik' | 'admin_keuangan' | 'admin';
}

interface AuthContextType {
  user: AppUser | User | null;
  isAdmin: boolean;
  role: 'admin_teknik' | 'admin_keuangan' | 'admin';
  loading: boolean;
  login: (username?: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  error: string | null;
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  role: 'admin_teknik',
  loading: false,
  login: async () => false,
  logout: async () => {},
  error: null,
  setError: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from localStorage immediately so there is zero flash on refresh
  const [user, setUser] = useState<AppUser | User | null>(() => {
    try {
      const saved = localStorage.getItem('smk_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore JSON parse error
    }
    return null;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('smk_auth_user');
      if (saved) return true;
    } catch {}
    return false;
  });

  const [role, setRole] = useState<'admin_teknik' | 'admin_keuangan' | 'admin'>(() => {
    try {
      const saved = localStorage.getItem('smk_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) return parsed.role;
        if (parsed.email?.includes('keuangan')) return 'admin_keuangan';
      }
    } catch {}
    return 'admin_teknik';
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen to Firebase Auth state if available
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAdmin(true);
        const email = currentUser.email?.toLowerCase() || '';
        const userRole = email.includes('keuangan') ? 'admin_keuangan' : 'admin_teknik';
        setRole(userRole);
        
        try {
          const authData: AppUser = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || (userRole === 'admin_keuangan' ? 'Admin Keuangan' : 'Admin Teknik'),
            role: userRole
          };
          localStorage.setItem('smk_auth_user', JSON.stringify(authData));
        } catch {
          // ignore
        }

        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || (userRole === 'admin_keuangan' ? 'Admin Keuangan' : 'Admin Teknik'),
              role: userRole,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        } catch {
          // ignore doc error in restricted domains
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (username?: string, password?: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    const userClean = (username || '').trim().toLowerCase();
    const passClean = (password || '').trim();

    // Check valid credentials for PT. SMK
    const isAdminTeknik = (userClean === 'adminteknik' || userClean === 'admin') && 
      (passClean === 'smkjayajaya' || passClean === 'smk12345' || passClean === 'admin123');
    
    const isAdminKeuangan = userClean === 'adminkeuangan' && 
      (passClean === 'smkjayajaya' || passClean === 'keuangan123');

    if (isAdminTeknik || isAdminKeuangan) {
      const activeRole: 'admin_teknik' | 'admin_keuangan' = isAdminKeuangan ? 'admin_keuangan' : 'admin_teknik';
      const email = isAdminKeuangan ? 'adminkeuangan@ptsmk.com' : 'adminteknik@ptsmk.com';
      const displayName = isAdminKeuangan ? 'Admin Keuangan (PT. SMK)' : 'Admin Teknik (PT. SMK)';
      const uid = isAdminKeuangan ? 'usr_adminkeuangan_002' : 'usr_adminteknik_001';

      const localUser: AppUser = {
        uid,
        email,
        displayName,
        role: activeRole
      };

      // Set state and persist locally immediately
      setUser(localUser);
      setIsAdmin(true);
      setRole(activeRole);
      try {
        localStorage.setItem('smk_auth_user', JSON.stringify(localUser));
      } catch {}

      // Attempt background Firebase Auth synchronization silently without blocking the user
      const firebaseEmail = email;
      const firebasePass = 'smkjayajaya';
      signInWithEmailAndPassword(auth, firebaseEmail, firebasePass)
        .catch(async (e: any) => {
          if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, firebaseEmail, firebasePass);
            } catch {
              // Ignore background Firebase errors (e.g. unwhitelisted domain)
            }
          }
        });

      setLoading(false);
      return true;
    }

    // Invalid credentials
    setLoading(false);
    setError('Username atau password salah. Pastikan username "adminteknik" atau "adminkeuangan" dan password "smkjayajaya".');
    return false;
  };

  const logout = async () => {
    try {
      localStorage.removeItem('smk_auth_user');
      setUser(null);
      setIsAdmin(false);
      await signOut(auth);
    } catch {
      setUser(null);
      setIsAdmin(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, role, loading, login, logout, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

