// apps/client/src/pages/dashboard/cover-letters/_layouts/grid/_components/create-card.tsx
import { t } from "@lingui/macro";
import { PlusIcon } from "@phosphor-icons/react";
import { cn } from "@reactive-resume/utils";

import { useDialog } from "@/client/stores/dialog";

import { BaseCard } from "./base-card";

export const CreateCoverLetterCard = () => {
  const { open } = useDialog("cover-letter");

  return (
    <BaseCard
      onClick={() => {
        open("create");
      }}
    >
      <PlusIcon size={64} weight="thin" />

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end space-y-0.5 p-4 pt-12",
          "bg-gradient-to-t from-background/80 to-transparent",
        )}
      >
        <h4 className="font-medium">{t`Create a new cover letter`}</h4>
        <p className="text-xs opacity-75">{t`Start with a blank page`}</p>
      </div>
    </BaseCard>
  );
};
