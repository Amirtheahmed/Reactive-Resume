import { t } from "@lingui/macro";
import { CircleNotchIcon, CloudCheckIcon, PlusIcon } from "@phosphor-icons/react";
import { Button, Separator, Skeleton } from "@reactive-resume/ui";
import { AnimatePresence, motion } from "framer-motion";
import { Helmet } from "react-helmet-async";

import { useInformation } from "@/client/services/information";
import { useInformationStore } from "@/client/stores/information";

import { BasicsSection } from "./sections/basics";
import { CustomSection } from "./sections/custom-section";
import { SummarySection } from "./sections/summary";

export const InformationPage = () => {
  const { loading } = useInformation();
  const isSaving = useInformationStore((state) => state.isSaving);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const customSections = useInformationStore((state) => state.information.data.custom ?? []);
  const addCustomSection = useInformationStore((state) => state.addCustomSection);

  if (loading) {
    return (
      <div className="max-w-2xl space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {t`Information Bank`} - {t`Reactive Resume`}
        </title>
      </Helmet>

      <div className="max-w-2xl space-y-8 pb-24">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <h1 className="text-4xl font-bold tracking-tight">{t`Information Bank`}</h1>
            <p className="text-base text-muted-foreground">
              {t`Store your professional information here to be used across your resumes.`}
            </p>
          </div>

          <div className="flex items-center gap-x-2 text-muted-foreground">
            <AnimatePresence mode="wait">
              {isSaving ? (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-x-1.5 text-xs"
                >
                  <CircleNotchIcon className="animate-spin" />
                  <span>{t`Saving...`}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-x-1.5 text-xs text-success"
                >
                  <CloudCheckIcon size={14} />
                  <span>{t`Saved`}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <BasicsSection />
        <Separator />
        <SummarySection />
        <Separator />

        <div className="space-y-4">
          {customSections.map((section, index) => (
            <CustomSection key={section.id} id={section.id} index={index} />
          ))}
        </div>

        <Button variant="outline" className="w-full gap-x-2" onClick={addCustomSection}>
          <PlusIcon />
          {t`Add Custom Section`}
        </Button>
      </div>
    </>
  );
};
