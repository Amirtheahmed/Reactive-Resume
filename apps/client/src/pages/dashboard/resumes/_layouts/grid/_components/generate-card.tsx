// apps/client/src/pages/dashboard/resumes/_layouts/grid/_components/generate-card.tsx
import { t } from "@lingui/macro";
import { MagicWandIcon } from "@phosphor-icons/react";
import { KeyboardShortcut } from "@reactive-resume/ui";
import { cn } from "@reactive-resume/utils";

import { useDialog } from "@/client/stores/dialog";

import { BaseCard } from "./base-card";

export const GenerateResumeCard = () => {
  const { open } = useDialog("generate");

  return (
    <BaseCard
      onClick={() => {
        open("create");
      }}
    >
      <MagicWandIcon size={64} weight="thin" />

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end space-y-0.5 p-4 pt-12",
          "bg-gradient-to-t from-background/80 to-transparent",
        )}
      >
        <h4 className="font-medium">
          {t`Generate with AI`}
          <KeyboardShortcut className="ml-2">^G</KeyboardShortcut>
        </h4>

        <p className="text-xs opacity-75">{t`Tailor a resume from a job description`}</p>
      </div>
    </BaseCard>
  );
};
