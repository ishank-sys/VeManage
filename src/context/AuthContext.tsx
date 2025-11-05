import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compareSync } from "bcryptjs";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export type AppUser = {
  id: number;
  name: string;
  email: string;
  userType: string; // e.g., "Employee" | "Client"
  clientId?: number | null;
};

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isEmployee: boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("auth:user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase
      .from("User")
      .select("id,name,email,password,userType,clientId")
      .ilike("email", email)
      .maybeSingle();

    if (error || !data) throw new Error("Invalid email or password.");

    const hash: string = (data as any).password || "";
    const ok = hash && compareSync(password, hash);
    if (!ok) throw new Error("Invalid email or password.");

    const signed: AppUser = {
      id: Number((data as any).id),
      name: (data as any).name,
      email: (data as any).email,
      userType: (data as any).userType,
      clientId: (data as any).clientId ?? null,
    };
    localStorage.setItem("auth:user", JSON.stringify(signed));
    setUser(signed);
  };

  const logout = () => {
    localStorage.removeItem("auth:user");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isEmployee: (user?.userType || "").toLowerCase() === "employee",
      isClient: (user?.userType || "").toLowerCase() === "client",
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <Outlet />;
}

export function RequireRole({ allowed }: { allowed: string[] }) {
  const { user } = useAuth();
  const norm = (user?.userType || "").toLowerCase();
  const ok = allowed.map((a) => a.toLowerCase()).includes(norm);
  return ok ? <Outlet /> : <Navigate to="/" replace />;
}
