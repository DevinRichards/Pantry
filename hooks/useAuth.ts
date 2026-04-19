import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/services/firebase';
import {
  normalizeEmail,
  validateDisplayName,
  validatePassword,
} from '@/services/security';

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false, error: null });
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      // onAuthStateChanged will set loading: false on success
    } catch (err: unknown) {
      const message = 'Login failed. Check your email and password and try again.';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw err;
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      validatePassword(password);
      const sanitizedName = validateDisplayName(displayName);
      const cred = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
      await updateProfile(cred.user, { displayName: sanitizedName });
      // onAuthStateChanged will set loading: false on success
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Registration failed. Please review your details and try again.';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw err;
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await signOut(auth);
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
  };
}
