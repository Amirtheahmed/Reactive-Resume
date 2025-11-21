// apps/client/src/pages/dashboard/cover-letters/_layouts/list/_components/cover-letter-item.tsx
import { t } from "@lingui/macro";
import {
  CopySimpleIcon,
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import type { CoverLetterDto } from "@reactive-resume/dto";
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@reactive-resume/ui";
import dayjs from "dayjs";
import { useNavigate } from "react-router";

import { useDialog } from "@/client/stores/dialog";

import { BaseListItem } from "./base-item";

type Props = {
  coverLetter: CoverLetterDto;
};

export const CoverLetterListItem = ({ coverLetter }: Props) => {
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

  const dropdownMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="aspect-square">
        <Button size="icon" variant="ghost">
          <DotsThreeVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <PencilSimpleIcon size={14} className="mr-2" />
          {t`Edit`}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onUpdate();
          }}
        >
          <PencilSimpleIcon size={14} className="mr-2" />
          {t`Rename`}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate();
          }}
        >
          <CopySimpleIcon size={14} className="mr-2" />
          {t`Duplicate`}
        </DropdownMenuItem>
        <ContextMenuSeparator />
        <DropdownMenuItem
          className="text-error"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <TrashSimpleIcon size={14} className="mr-2" />
          {t`Delete`}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger className="even:bg-secondary/20">
        <BaseListItem
          className="group"
          title={coverLetter.title}
          description={t`Last updated ${lastUpdated}`}
          end={dropdownMenu}
          onClick={onOpen}
        />
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={onOpen}>
          <PencilSimpleIcon size={14} className="mr-2" />
          {t`Edit`}
        </ContextMenuItem>
        <ContextMenuItem onClick={onUpdate}>
          <PencilSimpleIcon size={14} className="mr-2" />
          {t`Rename`}
        </ContextMenuItem>
        <ContextMenuItem onClick={onDuplicate}>
          <CopySimpleIcon size={14} className="mr-2" />
          {t`Duplicate`}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-error" onClick={onDelete}>
          <TrashSimpleIcon size={14} className="mr-2" />
          {t`Delete`}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
