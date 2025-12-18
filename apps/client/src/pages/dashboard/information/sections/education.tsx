// apps/client/src/pages/dashboard/information/sections/education.tsx
import { t } from "@lingui/macro";
import type { Education } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const EducationSection = () => {
  const { open } = useDialog<Education>("info-education");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.education);

  return (
    <section id="education" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Education`}</h2>
        <p className="text-muted-foreground">
          {t`Your educational background and qualifications.`}
        </p>
      </header>

      <SectionBase<Education>
        id="info-education"
        sectionKey="education"
        title={(item) => item.institution}
        description={(item) => item.area}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

