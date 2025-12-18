// apps/client/src/pages/dashboard/information/sections/projects.tsx
import { t } from "@lingui/macro";
import type { Project } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const ProjectsSection = () => {
  const { open } = useDialog<Project>("info-projects");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.projects);

  return (
    <section id="projects" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Projects`}</h2>
        <p className="text-muted-foreground">
          {t`Personal or professional projects you have worked on.`}
        </p>
      </header>

      <SectionBase<Project>
        id="info-projects"
        sectionKey="projects"
        title={(item) => item.name}
        description={(item) => item.description}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

