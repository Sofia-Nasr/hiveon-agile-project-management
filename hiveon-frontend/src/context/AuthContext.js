import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

function decodeJwt(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;

    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getClaim(decoded, shortKey, dotNetKey) {
  if (!decoded) return null;
  return decoded?.[shortKey] ?? decoded?.[dotNetKey] ?? null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // ===============================
  // CORE TOKEN APPLY FUNCTION
  // ===============================
  function applyToken(jwt, { workspaceFromOAuth = null } = {}) {
    const decoded = decodeJwt(jwt);
    if (!decoded?.exp) return false;

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return false;

    const role =
      getClaim(
        decoded,
        "role",
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
      ) || "Developer";

    const username =
      getClaim(
        decoded,
        "name",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      ) || "";

    const email =
      getClaim(
        decoded,
        "email",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
      ) || "";

    const userId =
      getClaim(
        decoded,
        "nameid",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ) || "";

    // ✅ FIX: priority workspace source
    const ws =
      workspaceFromOAuth ||
      decoded.workspaceId ||
      decoded["workspaceId"] ||
      localStorage.getItem("workspaceId") ||
      null;

    setToken(jwt);
    setWorkspaceId(ws);

    if (ws) localStorage.setItem("workspaceId", ws);
    else localStorage.removeItem("workspaceId");

    setUser({
      id: userId,
      username,
      email,
      role,
      workspaceId: ws,
    });

    return true;
  }

  // ===============================
  // INIT FROM LOCALSTORAGE
  // ===============================
  useEffect(() => {
    const saved = localStorage.getItem("token");

    if (saved) {
      const valid = applyToken(saved);
      if (!valid) {
        localStorage.removeItem("token");
        localStorage.removeItem("workspaceId");
      }
    }

    setInitializing(false);
  }, []);

  // ===============================
  // LOGIN (supports OAuth + normal login)
  // ===============================
  const login = (input) => {
    const jwt = typeof input === "string" ? input : input?.token;
    if (!jwt) return;

    localStorage.setItem("token", jwt);

    const workspaceFromOAuth = input?.activeWorkspaceId || null;

    const ok = applyToken(jwt, {
      workspaceFromOAuth:
        workspaceFromOAuth && workspaceFromOAuth !== "null"
          ? workspaceFromOAuth
          : null,
    });

    if (!ok) logout();
  };

  // ===============================
  // WORKSPACE SWITCH
  // ===============================
  const selectWorkspace = (jwt) => {
    localStorage.setItem("token", jwt);
    applyToken(jwt);
  };

  // ===============================
  // LOGOUT
  // ===============================
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("workspaceId");
    setToken(null);
    setUser(null);
    setWorkspaceId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        workspaceId,
        login,
        logout,
        selectWorkspace,
        initializing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);