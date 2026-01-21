import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

const AuthContext = createContext();

// Allowed email addresses
const ALLOWED_EMAILS = [
  'eabruce@gmail.com',
  'jbfinger@gmail.com'
];

function isEmailAllowed(email) {
  return ALLOWED_EMAILS.includes(email?.toLowerCase());
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !isEmailAllowed(user.email)) {
        // Unauthorized user - sign them out
        await signOut(auth);
        setUser(null);
        setAuthError('Access denied. This app is restricted to authorized users only.');
      } else {
        setUser(user);
        setAuthError(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signInWithGoogle() {
    try {
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);

      if (!isEmailAllowed(result.user.email)) {
        await signOut(auth);
        throw new Error('Access denied. This app is restricted to authorized users only.');
      }

      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setAuthError(error.message);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  function clearAuthError() {
    setAuthError(null);
  }

  const value = {
    user,
    loading,
    authError,
    clearAuthError,
    signInWithGoogle,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
