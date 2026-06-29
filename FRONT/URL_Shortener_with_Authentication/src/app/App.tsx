import { useEffect, useState } from "react";
import type { Page, User } from "./lib/types";
import { apiLogout, apiMe } from "./lib/api";
import AuthPage from "./components/auth/AuthPage";
import Dashboard from "./components/dashboard/Dashboard";

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const me = await apiMe();
      if (!me) return;
      setUser(me);
      setPage("dashboard");
    };
    checkAuth();
  }, []);

  const handleAuth = (u: User) => {
    setUser(u);
    setPage("dashboard");
  };

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    setPage("login");
  };

  if (page === "login" || page === "signup") {
    return (
      <AuthPage
        mode={page}
        onAuth={handleAuth}
        onSwitch={() => setPage(page === "login" ? "signup" : "login")}
      />
    );
  }

  if (page === "dashboard" && user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return null;
}