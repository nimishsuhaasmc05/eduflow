import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';
import { firebaseAuth } from '../config/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { logoutFirebase } from '../services/firebaseAuth';

export const getStoredToken = (): string => {
  return localStorage.getItem('eduflow_access_token') || localStorage.getItem('token') || '';
};

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isEmailVerified: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updated: Partial<User>) => void;
  setIsEmailVerified: (verified: boolean) => void;
  getStoredToken: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Firebase Auth Observer
    const unsubscribe = onAuthStateChanged(firebaseAuth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsEmailVerified(fbUser.emailVerified);
      } else {
        // Fallback for default demo accounts (e.g. student@eduflow.ai)
        setIsEmailVerified(true);
      }
    });

    const fetchMe = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (e) {
          console.warn("Failed to validate PostgreSQL session token:", e);
          authApi.logout();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchMe();

    return () => unsubscribe();
  }, []);

  const login = (_token: string, userData: User) => {
    setUser(userData);
    setLoading(false);
    setIsEmailVerified(true);
  };

  const logout = () => {
    authApi.logout();
    logoutFirebase().catch(() => {});
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Storage clear error on logout:", e);
    }
    setUser(null);
    setFirebaseUser(null);
    setIsEmailVerified(true);
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isEmailVerified,
        loading,
        login,
        logout,
        updateUser,
        setIsEmailVerified,
        getStoredToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
