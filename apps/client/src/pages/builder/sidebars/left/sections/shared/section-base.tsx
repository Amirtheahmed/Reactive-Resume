import { t } from "@lingui/macro";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { SectionItem, SectionKey, SectionWithItem } from "@reactive-resume/schema";
import { Button } from "@reactive-resume/ui";
import { cn } from "@reactive-resume/utils";
import get from "lodash.get";

import { SectionBase as SharedSectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useResumeStore } from "@/client/stores/resume";

import { getSectionIcon } from "./section-icon";
import { SectionOptions } from "./section-options";

// Re-export section variants for backward compatibility
export { sectionVariants } from "@/client/components/sections";

type Props<T extends SectionItem> = {
  id: SectionKey;
  title: (item: T) => string;
  description?: (item: T) => string | undefined;
};

/**
 * Resume Builder's SectionBase component.
 * This is a thin wrapper around the shared SectionBase component,
 * wired to use the Resume Builder's store (useResumeStore).
 *
 * It adds the Resume Builder-specific header with:
 * - Collapse/expand button
 * - Section icon
 * - Section name
 * - Section options menu
 */
export const SectionBase = <T extends SectionItem>({ id, title, description }: Props<T>) => {
  const { open } = useDialog(id);

  const collapsed = useResumeStore((state) => state.collapsedSections[id] ?? false);
  const toggleCollapseSection = useResumeStore((state) => state.toggleCollapseSection);

  const setValue = useResumeStore((state) => state.setValue);
  const section = useResumeStore(
    (state) => get(state.resume.data.sections, id) as SectionWithItem<T>,
  );

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!section) return null;

  const renderHeader = () => (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-x-2">
        <Button
          size="icon"
          variant="ghost"
          aria-label={collapsed ? t`Expand section` : t`Collapse section`}
          onClick={() => {
            toggleCollapseSection(id);
          }}
        >
          <CaretRightIcon
            size={18}
            className={cn("transition-transform", !collapsed && "rotate-90")}
          />
        </Button>

        {getSectionIcon(id, { size: 18 })}

        <h2 className="ml-2 line-clamp-1 text-2xl font-bold lg:text-3xl">{section.name}</h2>
      </div>

      <div className="flex items-center gap-x-2">
        <SectionOptions id={id} />
      </div>
    </header>
  );

  return (
    <SharedSectionBase<T>
      id={id}
      sectionKey={id}
      title={title}
      description={description}
      section={section}
      setValue={setValue}
      openDialog={open}
      collapsed={collapsed}
      renderHeader={renderHeader}
    />
  );
};
