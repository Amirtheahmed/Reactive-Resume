// apps/client/src/pages/dashboard/information/sections/custom-section.tsx

import { t } from "@lingui/macro";
import { TrashSimpleIcon } from "@phosphor-icons/react";
import { Button, Input, RichInput } from "@reactive-resume/ui";

import { useInformationStore } from "@/client/stores/information";

type Props = {
  index: number;
  id: string;
};

/**
 * @deprecated This component is for legacy custom sections only.
 * New sections should use the structured section components (ExperienceSection, EducationSection, etc.)
 * that provide proper schema validation and better AI/autofill support.
 */
export const CustomSection = ({ index, id }: Props) => {
  const setValue = useInformationStore((state) => state.setValue);
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const removeCustomSection = useInformationStore((state) => state.removeCustomSection);
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const section = useInformationStore((state) => state.information.data.custom.find((s) => s.id === id));

  if (!section) return null;

  return (
    <section className="space-y-4 rounded-lg border p-4 transition-colors hover:bg-secondary/10">
      <header className="flex items-center justify-between gap-x-4">
        <Input
          value={section.name}
          className="h-auto border-none bg-transparent p-0 text-xl font-bold focus:ring-0"
          placeholder={t`Section Title`}
          onChange={(e) => { setValue(`custom[${index}].name`, e.target.value); }}
        />

        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 text-error"
          onClick={() => { removeCustomSection(id); }}
        >
          <TrashSimpleIcon />
        </Button>
      </header>

      <main>
        <RichInput
          content={section.content}
          onChange={(content) => { setValue(`custom[${index}].content`, content); }}
        />
      </main>
    </section>
  );
};
