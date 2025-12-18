// apps/client/src/pages/dashboard/cover-letters/_layouts/grid/_components/cover-letter-card.tsx
import { t } from "@lingui/macro";
import {
  CopySimpleIcon,
  PencilSimpleIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import type { CoverLetterDto } from "@reactive-resume/dto";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@reactive-resume/ui";
import { cn } from "@reactive-resume/utils";
import dayjs from "dayjs";
import { useNavigate } from "react-router";

import { useDialog } from "@/client/stores/dialog";

import { BaseCard } from "./base-card";

type Props = {
  coverLetter: CoverLetterDto;
};

export const CoverLetterCard = ({ coverLetter }: Props) => {
  const navigate = useNavigate();
  const { open } = useDialog<CoverLetterDto>("cover-letter");

  const lastUpdated = dayjs().to(coverLetter.updatedAt);

  const onOpen = async () => {
    await navigate(`/dashboard/cover-letters/${coverLetter.id}`);
  };

  const onUpdate = () => {
    open("update", { id: "cover-letter", item: coverLetter });
  };

  const onDuplicate = () => {
    open("duplicate", { id: "cover-letter", item: coverLetter });
  };

  const onDelete = () => {
    open("delete", { id: "cover-letter", item: coverLetter });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-left">
        <BaseCard className="cursor-context-menu space-y-0">
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end space-y-0.5 p-4 pt-12",
              "bg-gradient-to-t from-background/80 to-transparent",
            )}
          >
            <h4 className="line-clamp-2 font-medium">{coverLetter.title}</h4>
            <p className="line-clamp-1 text-xs opacity-75">{t`Last updated ${lastUpdated}`}</p>
          </div>

          <img
            src="/assets/cover-letter.png"
            alt={"Cover Letter"}
            className="rounded-sm opacity-80"
          />
        </BaseCard>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem onClick={onOpen}>
          <PencilSimpleIcon size={14} className="mr-2" />
          {t`Edit`}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onUpdate}>
          <PencilSimpleIcon size={14} className="mr-2" />
          {t`Rename`}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <CopySimpleIcon size={14} className="mr-2" />
          {t`Duplicate`}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-error" onClick={onDelete}>
          <TrashSimpleIcon size={14} className="mr-2" />
          {t`Delete`}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
