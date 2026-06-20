import { createContext, useContext, useState } from 'react';

const AuthCtx = createContext(null);

function decodeToken(t) {
  try { return JSON.parse(atob(t.split('.')[1])); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user,  setUser]  = useState(() => {
    const t = localStorage.getItem('token');
    return t ? decodeToken(t) : null;
  });

  function login(tok, usr) {
    localStorage.setItem('token', tok);
    setToken(tok);
    setUser(usr);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
