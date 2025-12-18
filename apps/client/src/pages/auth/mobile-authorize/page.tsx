// apps/client/src/pages/auth/mobile-authorize/page.tsx
import { t } from "@lingui/macro";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { useToast } from "@/client/hooks/use-toast";
import { axios } from "@/client/libs/axios";

import { AuthorizationCard } from "./_components/authorization-card";

type AuthorizeResponse = {
  token: string;
  expiresAt: string;
};

export const MobileAuthorizePage = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract query params
  const state = searchParams.get("state");
  const redirectUri = searchParams.get("redirect_uri");
  const deviceId = searchParams.get("device_id");
  const deviceName = searchParams.get("device_name");

  // Validate required params
  useEffect(() => {
    if (!state || !redirectUri) {
      setError(t`Invalid authorization request. Missing required parameters.`);
    }
  }, [state, redirectUri]);

  const handleAuthorize = useCallback(async () => {
    if (!state || !redirectUri) return;

    setIsLoading(true);

    try {
      // Call the server to complete authorization
      const response = await axios.post<AuthorizeResponse>("/auth/mobile/authorize", {
        state,
        externalId: state, // The mobile backend will provide the actual Firebase UID
        deviceId,
        deviceName,
        provider: "firebase",
      });

      const { token } = response.data;

      // Build redirect URL with token
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set("token", token);
      callbackUrl.searchParams.set("state", state);

      // Redirect back to mobile app
      window.location.href = callbackUrl.toString();
    } catch (error_: unknown) {
      const axiosError = error_ as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message ?? t`Failed to authorize. Please try again.`;
      toast({
        variant: "error",
        title: t`Authorization Failed`,
        description: message,
      });
      setIsLoading(false);
    }
  }, [state, redirectUri, deviceId, deviceName, toast]);

  const handleDeny = useCallback(() => {
    if (!redirectUri) return;

    // Redirect back to mobile app with error
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set("error", "access_denied");
    if (state) callbackUrl.searchParams.set("state", state);

    window.location.href = callbackUrl.toString();
  }, [redirectUri, state]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-destructive">{t`Invalid Request`}</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <AuthorizationCard
        deviceName={deviceName ?? undefined}
        isLoading={isLoading}
        redirectUri={redirectUri ?? ""}
        onAuthorize={handleAuthorize}
        onDeny={handleDeny}
      />
    </div>
  );
};

