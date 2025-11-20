// apps/client/src/pages/dashboard/resumes/_layouts/list/_components/generate-item.tsx
import { t } from "@lingui/macro";
import { MagicWandIcon } from "@phosphor-icons/react";
import { KeyboardShortcut } from "@reactive-resume/ui";

import { useDialog } from "@/client/stores/dialog";

import { BaseListItem } from "./base-item";

export const GenerateResumeListItem = () => {
  const { open } = useDialog("generate");

  return (
    <BaseListItem
      start={<MagicWandIcon size={18} />}
      title={
        <>
          <span>{t`Generate with AI`}</span>
          <KeyboardShortcut className="ml-2">^G</KeyboardShortcut>
        </>
      }
      description={t`Tailor a resume from a job description`}
      onClick={() => {
        open("create");
      }}
    />
  );
};
