import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import * as teamApi from "@/lib/api/teamApi";
import { AuthApiError } from "@/types/auth";

function showError(err: unknown, fallback = "Something went wrong") {
  if (err instanceof AuthApiError) {
    toast.error(err.message);
    return;
  }
  if (err instanceof Error) {
    toast.error(err.message || fallback);
    return;
  }
  toast.error(fallback);
}

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => search.get("token") ?? "", [search]);

  async function accept() {
    if (!token) {
      toast.error("Missing invite token");
      return;
    }
    setSubmitting(true);
    try {
      await teamApi.acceptInvite({ token });
      toast.success("Invitation accepted");
      navigate("/settings/team", { replace: true });
    } catch (err) {
      showError(err, "Could not accept invite");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    void accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle>Accept invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {token ? "We’re adding you to the merchant team. This may take a moment." : "This invitation link is invalid."}
          </p>
          <div className="flex items-center gap-2">
            {submitting && <Spinner className="size-4 text-muted-foreground" />}
            <Button
              variant="outline"
              onClick={() => void accept()}
              disabled={submitting || !token}
            >
              Try again
            </Button>
            <Button
              onClick={() => navigate("/dashboard", { replace: true, state: { from: location.pathname + location.search } })}
              disabled={submitting}
            >
              Go to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

