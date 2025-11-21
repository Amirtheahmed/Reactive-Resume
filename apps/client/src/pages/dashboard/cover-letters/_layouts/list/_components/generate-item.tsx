// apps/client/src/pages/dashboard/cover-letters/_layouts/list/_components/generate-item.tsx
import { t } from "@lingui/macro";
import { MagicWandIcon } from "@phosphor-icons/react";

import { useDialog } from "@/client/stores/dialog";

import { BaseListItem } from "./base-item";

export const GenerateCoverLetterListItem = () => {
  const { open } = useDialog("generate-cover-letter");

  return (
    <BaseListItem
      start={<MagicWandIcon size={18} />}
      title={t`Generate with AI`}
      description={t`Tailor a cover letter from a job description`}
      onClick={() => {
        open("create");
      }}
    />
  );
};
