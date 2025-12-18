// apps/client/src/pages/auth/mobile-authorize/_components/permissions-list.tsx
import { t } from "@lingui/macro";
import { CheckIcon } from "@phosphor-icons/react";

const permissions = [
  { key: "profile", label: () => t`Access your profile information` },
  { key: "information", label: () => t`Read and update your Information Bank` },
  { key: "resumes", label: () => t`Create and manage resumes` },
  { key: "coverLetters", label: () => t`Create and manage cover letters` },
  { key: "export", label: () => t`Export your data for autofill` },
];

export const PermissionsList = () => {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        {t`This app will be able to:`}
      </p>
      <ul className="space-y-2">
        {permissions.map((permission) => (
          <li key={permission.key} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckIcon className="h-4 w-4 text-success" weight="bold" />
            <span>{permission.label()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

