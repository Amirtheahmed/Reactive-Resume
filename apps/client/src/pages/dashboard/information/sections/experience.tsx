// apps/client/src/pages/dashboard/information/sections/experience.tsx
import { t } from "@lingui/macro";
import type { Experience } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const ExperienceSection = () => {
  const { open } = useDialog<Experience>("info-experience");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.experience);

  return (
    <section id="experience" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Experience`}</h2>
        <p className="text-muted-foreground">
          {t`Your work experience and employment history.`}
        </p>
      </header>

      <SectionBase<Experience>
        id="info-experience"
        sectionKey="experience"
        title={(item) => item.company}
        description={(item) => item.position}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

