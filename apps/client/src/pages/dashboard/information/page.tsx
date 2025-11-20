import { t } from "@lingui/macro";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { findInformation } from "@/client/services/information";
import { useInformationStore } from "@/client/stores/information";

import { BasicsSection } from "./sections/basics";
import { SummarySection } from "./sections/summary";

export const InformationPage = () => {
  const { setInformation } = useInformationStore();

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

      <div className="max-w-2xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t`Information Bank`}</h1>
          <p className="text-base text-muted-foreground">
            {t`Store your professional information here to be used across your resumes.`}
          </p>
        </div>

        <BasicsSection />
        <SummarySection />
      </div>
    </>
  );
};
