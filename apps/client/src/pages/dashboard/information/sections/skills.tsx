// apps/client/src/pages/dashboard/information/sections/skills.tsx
import { t } from "@lingui/macro";
import type { Skill } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const SkillsSection = () => {
  const { open } = useDialog<Skill>("info-skills");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.skills);

  return (
    <section id="skills" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Skills`}</h2>
        <p className="text-muted-foreground">
          {t`Your technical and professional skills.`}
        </p>
      </header>

      <SectionBase<Skill>
        id="info-skills"
        sectionKey="skills"
        title={(item) => item.name}
        description={(item) => {
          if (item.description) return item.description;
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

