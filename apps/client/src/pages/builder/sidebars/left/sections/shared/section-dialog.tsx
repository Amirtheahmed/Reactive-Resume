import { t } from "@lingui/macro";
import type { SectionItem, SectionWithItem } from "@reactive-resume/schema";
import get from "lodash.get";
import type { UseFormReturn } from "react-hook-form";

import { SectionDialogBase } from "@/client/components/sections";
import type { DialogName } from "@/client/stores/dialog";
import { useDialog } from "@/client/stores/dialog";
import { useResumeStore } from "@/client/stores/resume";

type Props<T extends SectionItem> = {
  id: DialogName;
  form: UseFormReturn<T>;
  defaultValues: T;
  pendingKeyword?: string;
  children: React.ReactNode;
};

/**
 * Resume Builder's SectionDialog component.
 * This is a thin wrapper around the shared SectionDialogBase component,
 * wired to use the Resume Builder's store (useResumeStore).
 */
export const SectionDialog = <T extends SectionItem>({
  id,
  form,
  defaultValues,
  pendingKeyword,
  children,
}: Props<T>) => {
  const { isOpen, mode, close, payload } = useDialog<T>(id);

  const setValue = useResumeStore((state) => state.setValue);
  const section = useResumeStore((state) => {
    return get(state.resume.data.sections, id);
  }) as SectionWithItem<T> | null;

  return (
    <SectionDialogBase<T>
      id={id}
      form={form}
      defaultValues={defaultValues}
      pendingKeyword={pendingKeyword}
      isOpen={isOpen}
      mode={mode}
      payload={payload}
      section={section}
      deleteDescription={t`This action can be reverted by clicking on the undo button in the floating toolbar.`}
      setValue={setValue}
      onClose={close}
    >
      {children}
    </SectionDialogBase>
  );
};
