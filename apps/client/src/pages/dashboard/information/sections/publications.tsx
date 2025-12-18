// apps/client/src/pages/dashboard/information/sections/publications.tsx
import { t } from "@lingui/macro";
import type { Publication } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const PublicationsSection = () => {
  const { open } = useDialog<Publication>("info-publications");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.publications);

  return (
    <section id="publications" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Publications`}</h2>
        <p className="text-muted-foreground">
          {t`Articles, papers, or books you have published.`}
        </p>
      </header>

      <SectionBase<Publication>
        id="info-publications"
        sectionKey="publications"
        title={(item) => item.name}
        description={(item) => item.publisher}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

