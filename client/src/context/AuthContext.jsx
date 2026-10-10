import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('sentinel_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('sentinel_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
          localStorage.setItem('sentinel_user', JSON.stringify(userData));
        } catch (error) {
          console.warn('Session expired or invalid token:', error);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (username, password) => {
    const res = await authService.login(username, password);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('sentinel_token', res.token);
    localStorage.setItem('sentinel_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = async () => {
    try {
      if (token) {
        await authService.logout();
      }
    } catch (err) {
      console.warn('Logout API warning:', err);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('sentinel_token');
      localStorage.removeItem('sentinel_user');
    }
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
