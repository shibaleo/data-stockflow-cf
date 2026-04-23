import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { api } from "@/lib/api-client";
import { LoginPage } from "./login-page";

export interface MeData {
  id: number;
  clerk_user_id: string;
  name: string;
  email: string;
  role_key: number;
  role_name: string;
  is_active: boolean;
}

const MeContext = createContext<MeData | null>(null);

export function useMe(): MeData {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe must be used within AuthGate");
  return me;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;

        // Set the token for subsequent API calls
        const res = await fetch("/api/v1/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(res.status === 401 ? "Unauthorized" : "Failed to load user");
        }

        const json = await res.json();
        if (!cancelled) setMe(json.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <LoginPage />;
  }

  // API未接続時はダミーデータでUI確認可能にする
  const fallback: MeData = {
    id: 0, clerk_user_id: "", name: "Dev User", email: "dev@example.com",
    role_key: 1, role_name: "admin", is_active: true,
  };

  if (error || !me) {
    return <MeContext.Provider value={me ?? fallback}>{children}</MeContext.Provider>;
  }

  return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
}
