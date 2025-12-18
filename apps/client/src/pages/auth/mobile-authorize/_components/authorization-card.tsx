// apps/client/src/pages/auth/mobile-authorize/_components/authorization-card.tsx
import { t, Trans } from "@lingui/macro";
import { DeviceMobileIcon, ShieldCheckIcon, WarningIcon } from "@phosphor-icons/react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@reactive-resume/ui";

import { PermissionsList } from "./permissions-list";

type AuthorizationCardProps = {
  deviceName?: string;
  redirectUri: string;
  isLoading: boolean;
  onAuthorize: () => void;
  onDeny: () => void;
};

export const AuthorizationCard = ({
  deviceName,
  redirectUri,
  isLoading,
  onAuthorize,
  onDeny,
}: AuthorizationCardProps) => {
  // Extract app name from redirect URI
  const getAppName = (uri: string) => {
    try {
      const url = new URL(uri);
      // For custom schemes like "myapp://", use the scheme
      if (!url.hostname) {
        return url.protocol.replace(":", "").replace("//", "");
      }
      return url.hostname;
    } catch {
      return t`Mobile App`;
    }
  };

  const appName = getAppName(redirectUri);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <DeviceMobileIcon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl">
          <Trans>Authorize Mobile App</Trans>
        </CardTitle>
        <CardDescription>
          <Trans>
            <span className="font-medium text-foreground">{appName}</span> wants to access your Reactive Resume account
          </Trans>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {deviceName && (
          <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-sm">
            <ShieldCheckIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">
              <Trans>Device: <span className="font-medium text-foreground">{deviceName}</span></Trans>
            </span>
          </div>
        )}

        <PermissionsList />

        <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-sm">
          <WarningIcon className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            <Trans>
              Make sure you trust this app. Once authorized, it will have access to your data until you revoke it.
            </Trans>
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button
          className="w-full"
          disabled={isLoading}
          onClick={onAuthorize}
        >
          {isLoading ? t`Authorizing...` : t`Authorize`}
        </Button>
        <Button
          className="w-full"
          disabled={isLoading}
          variant="ghost"
          onClick={onDeny}
        >
          {t`Deny`}
        </Button>
      </CardFooter>
    </Card>
  );
};

