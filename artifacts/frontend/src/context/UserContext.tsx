import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { apiFetch, ApiError } from "@/lib/api";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  isAdmin?: boolean;
}

interface UserCtx {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (name: string, avatar: string | null) => Promise<void>;
}

const UserContext = createContext<UserCtx>(null!);

type MeResponse = { user: UserProfile | null };
type AuthResponse = { user: UserProfile };

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MeResponse>("/auth/me")
      .then(({ user: u }) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: u } = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(u);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user: u } = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setUser(u);
  }, []);

  const signInWithGoogle = useCallback(async (credential: string) => {
    const { user: u } = await apiFetch<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (name: string, avatar: string | null) => {
    const { user: u } = await apiFetch<AuthResponse>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name, avatar }),
    });
    setUser(u);
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, signIn, register, signInWithGoogle, signOut, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

export { ApiError };
