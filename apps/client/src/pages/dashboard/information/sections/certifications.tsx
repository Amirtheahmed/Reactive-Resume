// apps/client/src/pages/dashboard/information/sections/certifications.tsx
import { t } from "@lingui/macro";
import type { Certification } from "@reactive-resume/schema";

import { SectionBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

export const CertificationsSection = () => {
  const { open } = useDialog<Certification>("info-certifications");
  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.certifications);

  return (
    <section id="certifications" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Certifications`}</h2>
        <p className="text-muted-foreground">
          {t`Your professional certifications and credentials.`}
        </p>
      </header>

      <SectionBase<Certification>
        id="info-certifications"
        sectionKey="certifications"
        title={(item) => item.name}
        description={(item) => item.issuer}
        section={section}
        setValue={setValue}
        openDialog={open}
      />
    </section>
  );
};

