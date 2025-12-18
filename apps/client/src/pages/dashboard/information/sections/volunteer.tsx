// apps/client/src/pages/dashboard/information/sections/volunteer.tsx
import { t } from "@lingui/macro";
import type { Volunteer } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const VolunteerSection = () => {
  const { open } = useDialog<Volunteer>("info-volunteer");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.volunteer);

  return (
    <section id="volunteer" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Volunteering`}</h2>
        <p className="text-muted-foreground">
          {t`Your volunteer work and community involvement.`}
        </p>
      </header>

      <SectionBase<Volunteer>
        id="info-volunteer"
        sectionKey="volunteer"
        title={(item) => item.organization}
        description={(item) => item.position}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

