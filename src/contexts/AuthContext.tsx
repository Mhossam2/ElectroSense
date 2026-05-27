// ============================================================================
// AuthContext — manages login state and JWT token for the whole app.
//
// The JWT is stored in localStorage so it survives page refreshes.
// AuthContext exposes: user, token, login(), register(), logout().
// ============================================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "lcr_auth_token";
const USER_KEY  = "lcr_auth_user";

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken]     = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser]       = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Keep localStorage in sync whenever token/user change.
  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else        localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else       localStorage.removeItem(USER_KEY);
  }, [user]);

  // ── login ────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Login failed");
      }
      const data = await res.json() as { token: string; user: AuthUser };
      setToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  // ── register ─────────────────────────────────────────────────────────────

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Registration failed");
      }
      const data = await res.json() as { token: string; user: AuthUser };
      setToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  // ── logout ───────────────────────────────────────────────────────────────

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used inside <AuthProvider>");
  return ctx;
}
