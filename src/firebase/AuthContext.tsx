import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './config';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: (username?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
  error: null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Check if user document exists, if not create it
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let role = 'user';
          // Make these emails admin by default
          if (!userDoc.exists() && (
              currentUser.email === 'adminteknik.ptsmk@gmail.com' ||
              currentUser.email === 'adminteknik@ptsmk.com' ||
              currentUser.email === 'adminkeuangan@ptsmk.com'
          )) {
            role = 'admin';
          } else if (userDoc.exists()) {
            role = userDoc.data().role || 'admin';
          }

          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0],
              role: role,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
          
          setIsAdmin(role === 'admin' || currentUser.email === 'adminteknik.ptsmk@gmail.com' || currentUser.email === 'adminteknik@ptsmk.com' || currentUser.email === 'adminkeuangan@ptsmk.com');
        } catch (error) {
          console.error("Error checking user role:", error);
          setIsAdmin(currentUser.email === 'adminteknik.ptsmk@gmail.com' || currentUser.email === 'adminteknik@ptsmk.com' || currentUser.email === 'adminkeuangan@ptsmk.com');
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (username?: string, password?: string) => {
    setError(null);
    try {
      if (username && password) {
        // Map username to email
        const email = `${username.toLowerCase()}@ptsmk.com`;
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
          if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
             // Create on the fly if it's the specific hardcoded credentials
             if ((username.toLowerCase() === 'adminteknik' || username.toLowerCase() === 'adminkeuangan') && password === 'smkjayajaya') {
               try {
                 await createUserWithEmailAndPassword(auth, email, password);
               } catch (createErr) {
                 setError('Gagal membuat akun untuk pertama kali.');
               }
             } else {
               setError('Username atau password salah.');
             }
          } else {
             setError('Gagal login. Pastikan kredensial benar.');
          }
        }
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setError('Login gagal. Silakan coba lagi.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};
