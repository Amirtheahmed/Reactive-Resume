// apps/client/src/pages/dashboard/information/sections/awards.tsx
import { t } from "@lingui/macro";
import type { Award } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const AwardsSection = () => {
  const { open } = useDialog<Award>("info-awards");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.awards);

  return (
    <section id="awards" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Awards`}</h2>
        <p className="text-muted-foreground">
          {t`Awards and honors you have received.`}
        </p>
      </header>

      <SectionBase<Award>
        id="info-awards"
        sectionKey="awards"
        title={(item) => item.title}
        description={(item) => item.awarder}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

