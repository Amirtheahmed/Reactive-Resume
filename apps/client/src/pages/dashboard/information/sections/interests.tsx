// apps/client/src/pages/dashboard/information/sections/interests.tsx
import { t } from "@lingui/macro";
import type { Interest } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const InterestsSection = () => {
  const { open } = useDialog<Interest>("info-interests");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.interests);

  return (
    <section id="interests" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Interests`}</h2>
        <p className="text-muted-foreground">
          {t`Your hobbies and personal interests.`}
        </p>
      </header>

      <SectionBase<Interest>
        id="info-interests"
        sectionKey="interests"
        title={(item) => item.name}
        description={(item) => {
          if (item.keywords.length > 0) return `${item.keywords.length} keywords`;
          return;
        }}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

