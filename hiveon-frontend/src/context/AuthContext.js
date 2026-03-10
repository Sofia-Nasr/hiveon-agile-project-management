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

function getClaim(decoded, shortKey, dotNetUriKey) {
  if (!decoded) return null;
  return decoded[shortKey] ?? decoded[dotNetUriKey] ?? null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // 🔧 ONLY CHANGE: allowWorkspace flag
  function applyToken(jwt, { allowWorkspace = false } = {}) {
    const decoded = decodeJwt(jwt);
    if (!decoded?.exp) return false;

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return false;

    const role = getClaim(
      decoded,
      "role",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    );

    const username = getClaim(
      decoded,
      "name",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
    );

    const email = getClaim(
      decoded,
      "email",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    );

    const userId = getClaim(
      decoded,
      "nameid",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    );

    const ws = allowWorkspace
      ? decoded.workspaceId ?? decoded["workspaceId"] ?? null
      : null;

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

useEffect(() => {
const saved = localStorage.getItem("token");

if (saved) {
  const valid = applyToken(saved, { allowWorkspace: false });

  if (!valid) {
    localStorage.removeItem("token");
    localStorage.removeItem("workspaceId");
  }
}
  setInitializing(false);
}, []);
 const login = (input) => {
  const jwt = typeof input === "string" ? input : input?.token;
  if (!jwt || typeof jwt !== "string") return;

  localStorage.setItem("token", jwt);
if (!applyToken(jwt, { allowWorkspace: false })) logout();
};
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  const tokenFromGoogle = params.get("token");
  const requiresWorkspace = params.get("requiresWorkspace");
  const activeWorkspaceId = params.get("activeWorkspaceId");
if (tokenFromGoogle) {
  login(tokenFromGoogle);

  // clean URL
  window.history.replaceState({}, document.title, "/");

  // ALWAYS go to workspace selection
  window.location.href = "/workspace-setup";
}
}, []);

  // WORKSPACE SWITCH / JOIN
  const selectWorkspace = (jwt) => {
    localStorage.setItem("token", jwt);
    applyToken(jwt, { allowWorkspace: true });
  };

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
