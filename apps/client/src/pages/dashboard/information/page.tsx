// apps/client/src/pages/dashboard/information/page.tsx

import { t } from "@lingui/macro";
import { PlusIcon } from "@phosphor-icons/react";
import { Button, Separator } from "@reactive-resume/ui";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { findInformation } from "@/client/services/information";
import { useInformationStore } from "@/client/stores/information";

import { BasicsSection } from "./sections/basics";
import { CustomSection } from "./sections/custom-section";
import { SummarySection } from "./sections/summary";

export const InformationPage = () => {
  const { setInformation } = useInformationStore();
  // Fix: Default to empty array if custom is undefined
  const customSections = useInformationStore((state) => state.information.data.custom ?? []);
  const addCustomSection = useInformationStore((state) => state.addCustomSection);

  useEffect(() => {
    void findInformation().then((data) => {
      setInformation(data);
    });
  }, [setInformation]);

  return (
    <>
      <Helmet>
        <title>
          {t`Information Bank`} - {t`Reactive Resume`}
        </title>
      </Helmet>

      <div className="max-w-2xl space-y-8 pb-24">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t`Information Bank`}</h1>
          <p className="text-base text-muted-foreground">
            {t`Store your professional information here to be used across your resumes.`}
          </p>
        </div>

        <BasicsSection />
        <Separator />
        <SummarySection />
        <Separator />

        {customSections.map((section, index) => (
          <CustomSection key={section.id} id={section.id} index={index} />
        ))}

        <Button variant="outline" className="w-full gap-x-2" onClick={addCustomSection}>
          <PlusIcon />
          {t`Add Custom Section`}
        </Button>
      </div>
    </>
  );
};
