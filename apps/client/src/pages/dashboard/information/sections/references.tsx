// apps/client/src/pages/dashboard/information/sections/references.tsx
import { t } from "@lingui/macro";
import type { Reference } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const ReferencesSection = () => {
  const { open } = useDialog<Reference>("info-references");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.references);

  return (
    <section id="references" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`References`}</h2>
        <p className="text-muted-foreground">
          {t`Professional references who can vouch for your work.`}
        </p>
      </header>

      <SectionBase<Reference>
        id="info-references"
        sectionKey="references"
        title={(item) => item.name}
        description={(item) => item.description}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

