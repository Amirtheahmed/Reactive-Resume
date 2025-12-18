// apps/client/src/components/sections/section-dialog-base.tsx
import { t } from "@lingui/macro";
import { createId } from "@paralleldrive/cuid2";
import { CopySimpleIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { SectionItem, SectionWithItem } from "@reactive-resume/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  ScrollArea,
} from "@reactive-resume/ui";
import { produce } from "immer";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { DialogMode, DialogName, DialogPayload } from "@/client/stores/dialog";

/**
 * Props for the store-agnostic SectionDialogBase component.
 * This allows the same dialog logic to be used with different stores
 * (useResumeStore, useInformationStore, etc.)
 */
type Props<T extends SectionItem> = {
  /** The dialog ID used to identify this dialog in the dialog store */
  id: DialogName;
  /** The react-hook-form instance */
  form: UseFormReturn<T>;
  /** Default values for creating new items */
  defaultValues: T;
  /** Optional keyword to add when creating/updating (for skills section) */
  pendingKeyword?: string;
  /** The form fields to render inside the dialog */
  children: React.ReactNode;
  /** Whether the dialog is currently open */
  isOpen: boolean;
  /** Current mode of the dialog */
  mode: DialogMode | undefined;
  /** Current payload containing item data */
  payload: DialogPayload<T>;
  /** Function to close the dialog */
  onClose: () => void;
  /** Function to set value in the store (path-based) */
  setValue: (path: string, value: unknown) => void;
  /** The current section data */
  section: SectionWithItem<T> | null;
  /**
   * Custom delete description. Information Bank doesn't have undo functionality,
   * so we need different messaging.
   */
  deleteDescription?: string;
};

/**
 * A store-agnostic dialog component for creating, updating, duplicating, and deleting section items.
 * This base component can be used with any store that follows the setValue pattern.
 *
 * @example
 * // For Resume Builder (with useResumeStore)
 * <SectionDialogBase
 *   id="experience"
 *   form={form}
 *   defaultValues={defaultExperience}
 *   isOpen={isOpen}
 *   mode={mode}
 *   payload={payload}
 *   onClose={close}
 *   setValue={resumeSetValue}
 *   section={section}
 * >
 *   {children}
 * </SectionDialogBase>
 *
 * @example
 * // For Information Bank (with useInformationStore)
 * <SectionDialogBase
 *   id="info-experience"
 *   form={form}
 *   defaultValues={defaultExperience}
 *   isOpen={isOpen}
 *   mode={mode}
 *   payload={payload}
 *   onClose={close}
 *   setValue={informationSetValue}
 *   section={section}
 *   deleteDescription="This action cannot be undone."
 * >
 *   {children}
 * </SectionDialogBase>
 */
export const SectionDialogBase = <T extends SectionItem>({
  id,
  form,
  defaultValues,
  pendingKeyword,
  children,
  isOpen,
  mode,
  payload,
  onClose,
  setValue,
  section,
  deleteDescription,
}: Props<T>) => {
  // Strip "info-" prefix if present to get the actual section key
  const sectionKey = id.startsWith("info-") ? id.slice(5) : id;

  const isCreate = mode === "create";
  const isUpdate = mode === "update";
  const isDelete = mode === "delete";
  const isDuplicate = mode === "duplicate";

  useEffect(() => {
    if (isOpen) onReset();
  }, [isOpen, payload]);

  const onSubmit = (values: T) => {
    if (!section) return;

    if (isCreate || isDuplicate) {
      if (pendingKeyword && "keywords" in values) {
        values.keywords.push(pendingKeyword);
      }

      setValue(
        `sections.${sectionKey}.items`,
        produce(section.items, (draft: T[]): void => {
          draft.push({ ...values, id: createId() });
        }),
      );
    }

    if (isUpdate) {
      if (!payload.item?.id) return;

      if (pendingKeyword && "keywords" in values) {
        values.keywords.push(pendingKeyword);
      }

      setValue(
        `sections.${sectionKey}.items`,
        produce(section.items, (draft: T[]): void => {
          const index = draft.findIndex((item) => item.id === payload.item?.id);
          if (index === -1) return;
          draft[index] = values;
        }),
      );
    }

    if (isDelete) {
      if (!payload.item?.id) return;

      setValue(
        `sections.${sectionKey}.items`,
        produce(section.items, (draft: T[]): void => {
          const index = draft.findIndex((item) => item.id === payload.item?.id);
          if (index === -1) return;
          draft.splice(index, 1);
        }),
      );
    }

    onClose();
  };

  const onReset = () => {
    if (isCreate) form.reset({ ...defaultValues, id: createId() } as T);
    if (isUpdate) form.reset({ ...defaultValues, ...payload.item });
    if (isDuplicate) form.reset({ ...payload.item, id: createId() } as T);
    if (isDelete) form.reset({ ...defaultValues, ...payload.item });
  };

  if (isDelete) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="z-50">
          <Form {...form}>
            <form>
              <AlertDialogHeader>
                <AlertDialogTitle>{t`Are you sure you want to delete this item?`}</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteDescription ?? t`This action can be reverted by clicking on the undo button in the floating toolbar.`}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
                <AlertDialogAction variant="error" onClick={form.handleSubmit(onSubmit)}>
                  {t`Delete`}
                </AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="z-50">
        <Form {...form}>
          <ScrollArea>
            <form
              className="max-h-[60vh] space-y-6 lg:max-h-fit"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <DialogHeader>
                <DialogTitle>
                  <div className="flex items-center space-x-2.5">
                    {isCreate && <PlusIcon />}
                    {isUpdate && <PencilSimpleIcon />}
                    {isDuplicate && <CopySimpleIcon />}
                    <h2>
                      {isCreate && t`Create a new item`}
                      {isUpdate && t`Update an existing item`}
                      {isDuplicate && t`Duplicate an existing item`}
                    </h2>
                  </div>
                </DialogTitle>

                <VisuallyHidden>
                  <DialogDescription />
                </VisuallyHidden>
              </DialogHeader>

              {children}

              <DialogFooter>
                <Button type="submit">
                  {isCreate && t`Create`}
                  {isUpdate && t`Save Changes`}
                  {isDuplicate && t`Duplicate`}
                </Button>
              </DialogFooter>
            </form>
          </ScrollArea>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

