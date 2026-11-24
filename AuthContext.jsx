import { createContext, useContext, useEffect, useState } from "react";
import { api, authRequest, tokens } from "./api.js";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on page load
  useEffect(() => {
    if (!tokens.get()) return setLoading(false);
    api("/api/me")
      .then((d) => setUser(d.user))
      .catch(() => tokens.clear())
      .finally(() => setLoading(false));
  }, []);

  const finish = ({ user, accessToken, refreshToken }) => {
    tokens.set({ accessToken, refreshToken });
    setUser(user);
  };

  const value = {
    user,
    loading,
    login: async (email, password) => finish(await authRequest("/api/auth/login", { email, password })),
    register: async (name, email, password) => finish(await authRequest("/api/auth/register", { name, email, password })),
    logout: async () => {
      const t = tokens.get();
      if (t) await authRequest("/api/auth/logout", { refreshToken: t.refreshToken }).catch(() => {});
      tokens.clear();
      setUser(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
