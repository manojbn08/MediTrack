import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('meditrack_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('meditrack_token') || null);
  const [loading, setLoading] = useState(false);

  const saveAuth = (authData) => {
    setToken(authData.token);
    setUser(authData);
    localStorage.setItem('meditrack_token', authData.token);
    localStorage.setItem('meditrack_user', JSON.stringify(authData));
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      saveAuth(res.data);
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      saveAuth(res.data);
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (roleKey) => {
    const creds = {
      customer: { email: 'customer@meditrack.com', password: 'Password@123' },
      pharmacist: { email: 'pharmacist@meditrack.com', password: 'Password@123' },
      delivery: { email: 'delivery@meditrack.com', password: 'Password@123' },
      admin: { email: 'admin@meditrack.com', password: 'Password@123' },
    };
    const c = creds[roleKey.toLowerCase()];
    if (c) {
      return login(c.email, c.password);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('meditrack_token');
    localStorage.removeItem('meditrack_user');
  };

  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    const normalized = roleName.startsWith('ROLE_') ? roleName : `ROLE_${roleName.toUpperCase()}`;
    return user.roles.includes(normalized);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, quickLogin, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
