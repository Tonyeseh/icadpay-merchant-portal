import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getStoredAccessToken } from "@/lib/auth/accessToken";
import { refresh } from "@/lib/auth/merchantAuthApi";
import { Spinner } from "@/components/ui/spinner";
import { useAppStore } from "@/store/useAppStore";

export function RequireAuth() {
  const user = useAppStore((s) => s.user);
  const applyAuthResponse = useAppStore((s) => s.applyAuthResponse);
  const clearSession = useAppStore((s) => s.clearSession);
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getStoredAccessToken();
      if (!token) {
        setReady(true);
        return;
      }
      if (useAppStore.getState().user) {
        setReady(true);
        return;
      }
      try {
        const session = await refresh(token);
        if (!cancelled) applyAuthResponse(session);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyAuthResponse, clearSession]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
