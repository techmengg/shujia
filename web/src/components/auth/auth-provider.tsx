"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
  serverAuth: boolean;
}

export function AuthProvider({ children, serverAuth }: AuthProviderProps) {
  // Start with server state and TRUST IT
  const [isAuthenticated, setIsAuthenticated] = useState(serverAuth);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check cookie on client
    const cookies = document.cookie.split('; ');
    const hasSession = cookies.some(cookie => cookie.startsWith('mynkdb_session='));
    
    console.log('[AuthProvider] Server says:', serverAuth);
    console.log('[AuthProvider] Client cookie check:', hasSession);
    console.log('[AuthProvider] All cookies:', document.cookie);
    
    // Only trust client if there's a REAL mismatch
    // If server says logged in, trust it (server is authoritative)
    if (serverAuth) {
      // Server says logged in, keep it that way
      setIsAuthenticated(true);
    } else {
      // Server says logged out, double check cookie
      setIsAuthenticated(hasSession);
    }
  }, [serverAuth]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

