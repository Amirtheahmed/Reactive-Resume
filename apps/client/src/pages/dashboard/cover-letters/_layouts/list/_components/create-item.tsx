// apps/client/src/pages/dashboard/cover-letters/_layouts/list/_components/create-item.tsx
import { t } from "@lingui/macro";
import { PlusIcon } from "@phosphor-icons/react";
import type { CoverLetterDto } from "@reactive-resume/dto";

import { useDialog } from "@/client/stores/dialog";

import { BaseListItem } from "./base-item";

export const CreateCoverLetterListItem = () => {
  const { open } = useDialog<CoverLetterDto>("cover-letter");

  return (
    <BaseListItem
      start={<PlusIcon size={18} />}
      title={t`Create a new cover letter`}
      description={t`Start with a blank page`}
      onClick={() => {
        open("create");
      }}
    />
  );
};
