// apps/client/src/pages/dashboard/information/sections/languages.tsx
import { t } from "@lingui/macro";
import type { Language } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const LanguagesSection = () => {
  const { open } = useDialog<Language>("info-languages");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.languages);

  return (
    <section id="languages" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Languages`}</h2>
        <p className="text-muted-foreground">
          {t`Languages you speak and your proficiency level.`}
        </p>
      </header>

      <SectionBase<Language>
        id="info-languages"
        sectionKey="languages"
        title={(item) => item.name}
        description={(item) => item.description}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

