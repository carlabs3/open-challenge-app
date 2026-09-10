"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { getMe } from "@/lib/api";

/**
 * État de session partagé par toute l'app. Remplace la variable `me` globale de
 * la maquette. Hydraté au chargement depuis GET /api/me (cookie httpOnly).
 *
 * `data` = { me, idea, requests, notifications } | null (déconnecté).
 * `refresh()` recharge après chaque action qui change l'état.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const d = await getMe();
      setData(d);
      return d;
    } catch {
      setData(null); // 401 = visiteur
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const me = data?.me ?? null;
  const value = { data, me, loading, refresh, setData };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>.");
  return ctx;
}
