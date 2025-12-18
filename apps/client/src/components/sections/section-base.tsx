// apps/client/src/components/sections/section-base.tsx
import type { DragEndEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { t } from "@lingui/macro";
import { PlusIcon } from "@phosphor-icons/react";
import type { SectionItem, SectionWithItem } from "@reactive-resume/schema";
import { Button } from "@reactive-resume/ui";
import { cn } from "@reactive-resume/utils";
import type { MotionProps } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import get from "lodash.get";

import type { DialogMode, DialogName, DialogPayload } from "@/client/stores/dialog";

import { SectionListItem } from "./section-list-item";

export const sectionVariants: MotionProps = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.25, ease: "easeInOut" },
};

/**
 * Props for the store-agnostic SectionBase component.
 */
type Props<T extends SectionItem> = {
  /** The section ID (e.g., "experience", "education", or "info-experience" for information bank) */
  id: string;
  /** Function to extract title from an item */
  title: (item: T) => string;
  /** Optional function to extract description from an item */
  description?: (item: T) => string | undefined;
  /** The section data containing items */
  section: SectionWithItem<T>;
  /** Function to set value in the store */
  setValue: (path: string, value: unknown) => void;
  /** Function to open a dialog */
  openDialog: (mode: DialogMode, payload?: DialogPayload<T>) => void;
  /** The section key used for setValue paths (without info- prefix) */
  sectionKey: string;
  /** Optional: Whether the section is collapsed (for builder sidebar) */
  collapsed?: boolean;
  /** Optional: Function to toggle collapse state */
  onToggleCollapse?: () => void;
  /** Optional: Custom header component */
  renderHeader?: () => React.ReactNode;
  /** Optional: Whether to show section options menu (for builder) */
  showOptions?: boolean;
  /** Optional: Custom class name for the section */
  className?: string;
};

/**
 * A store-agnostic section component that displays a list of items with drag-and-drop reordering.
 * This base component can be used with any store that follows the setValue pattern.
 *
 * @example
 * // For Information Bank
 * <SectionBase
 *   id="info-experience"
 *   sectionKey="experience"
 *   title={(item) => item.company}
 *   description={(item) => item.position}
 *   section={experienceSection}
 *   setValue={informationSetValue}
 *   openDialog={openInfoDialog}
 * />
 */
export const SectionBase = <T extends SectionItem>({
  id,
  title,
  description,
  section,
  setValue,
  openDialog,
  sectionKey,
  collapsed = false,
  onToggleCollapse: _onToggleCollapse,
  renderHeader,
  showOptions: _showOptions = false,
  className,
}: Props<T>) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!section) return null;

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = section.items.findIndex((item) => item.id === active.id);
      const newIndex = section.items.findIndex((item) => item.id === over.id);

      const sortedList = arrayMove(section.items as T[], oldIndex, newIndex);
      setValue(`sections.${sectionKey}.items`, sortedList);
    }
  };

  const onCreate = () => {
    openDialog("create", { id: id as DialogName });
  };

  const onUpdate = (item: T) => {
    openDialog("update", { id: id as DialogName, item });
  };

  const onDuplicate = (item: T) => {
    openDialog("duplicate", { id: id as DialogName, item });
  };

  const onDelete = (item: T) => {
    openDialog("delete", { id: id as DialogName, item });
  };

  const onToggleVisibility = (index: number) => {
    const visible = get(section, `items[${index}].visible`, true);
    setValue(`sections.${sectionKey}.items[${index}].visible`, !visible);
  };

  return (
    <motion.section
      id={id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("grid gap-y-6", className)}
    >
      {renderHeader?.()}

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div key={`${id}-content`} {...sectionVariants} className="overflow-hidden">
            <main className={cn("grid transition-opacity", !section.visible && "opacity-50")}>
              {section.items.length === 0 && (
                <Button
                  className="gap-x-2 border-dashed py-6 leading-relaxed hover:bg-secondary-accent"
                  variant="outline"
                  onClick={onCreate}
                >
                  <PlusIcon size={14} />
                  <span className="font-medium">
                    {t({
                      message: "Add a new item",
                      context: "For example, add a new work experience, or add a new profile.",
                    })}
                  </span>
                </Button>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToParentElement]}
                onDragEnd={onDragEnd}
              >
                <SortableContext items={section.items} strategy={verticalListSortingStrategy}>
                  <AnimatePresence>
                    {section.items.map((item, index) => (
                      <SectionListItem
                        key={item.id}
                        id={item.id}
                        visible={item.visible}
                        title={title(item as T)}
                        description={description?.(item as T)}
                        onUpdate={() => {
                          onUpdate(item as T);
                        }}
                        onDelete={() => {
                          onDelete(item as T);
                        }}
                        onDuplicate={() => {
                          onDuplicate(item as T);
                        }}
                        onToggleVisibility={() => {
                          onToggleVisibility(index);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>
            </main>

            {section.items.length > 0 && (
              <footer className="mt-4 flex items-center justify-end">
                <Button
                  className="ml-auto gap-x-2 text-xs lg:text-sm"
                  variant="outline"
                  onClick={onCreate}
                >
                  <PlusIcon />
                  <span>
                    {t({
                      message: "Add a new item",
                      context: "For example, add a new work experience, or add a new profile.",
                    })}
                  </span>
                </Button>
              </footer>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

