import { t } from "@lingui/macro";
import { CircleNotchIcon, CloudCheckIcon, PlusIcon, WarningIcon } from "@phosphor-icons/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Separator,
  Skeleton,
} from "@reactive-resume/ui";
import { AnimatePresence, motion } from "framer-motion";
import { Helmet } from "react-helmet-async";

import { useInformation } from "@/client/services/information";
import { useInformationStore } from "@/client/stores/information";

import { AwardsSection } from "./sections/awards";
import { BasicsSection } from "./sections/basics";
import { CertificationsSection } from "./sections/certifications";
import { CustomSection } from "./sections/custom-section";
import { EducationSection } from "./sections/education";
import { ExperienceSection } from "./sections/experience";
import { InterestsSection } from "./sections/interests";
import { LanguagesSection } from "./sections/languages";
import { ProfilesSection } from "./sections/profiles";
import { ProjectsSection } from "./sections/projects";
import { PublicationsSection } from "./sections/publications";
import { ReferencesSection } from "./sections/references";
import { SkillsSection } from "./sections/skills";
import { SummarySection } from "./sections/summary";
import { VolunteerSection } from "./sections/volunteer";

export const InformationPage = () => {
  const { loading } = useInformation();
  const isSaving = useInformationStore((state) => state.isSaving);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const customSections = useInformationStore((state) => state.information.data.custom ?? []);
  // eslint-disable-next-line @typescript-eslint/no-deprecated
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

        {/* Basics */}
        <BasicsSection />
        <Separator />

        {/* Summary */}
        <SummarySection />
        <Separator />

        {/* Profiles */}
        <ProfilesSection />
        <Separator />

        {/* Experience */}
        <ExperienceSection />
        <Separator />

        {/* Education */}
        <EducationSection />
        <Separator />

        {/* Skills */}
        <SkillsSection />
        <Separator />

        {/* Languages */}
        <LanguagesSection />
        <Separator />

        {/* Certifications */}
        <CertificationsSection />
        <Separator />

        {/* Awards */}
        <AwardsSection />
        <Separator />

        {/* Projects */}
        <ProjectsSection />
        <Separator />

        {/* Publications */}
        <PublicationsSection />
        <Separator />

        {/* Volunteering */}
        <VolunteerSection />
        <Separator />

        {/* Interests */}
        <InterestsSection />
        <Separator />

        {/* References */}
        <ReferencesSection />

        {/* Legacy Custom Sections */}
        {customSections.length > 0 && (
          <>
            <Separator />
            <Accordion collapsible type="single" className="w-full">
              <AccordionItem value="legacy-custom" className="border-none">
                <AccordionTrigger className="py-0 hover:no-underline">
                  <div className="flex items-center gap-x-2">
                    <WarningIcon className="text-warning" />
                    <span className="text-lg font-semibold">{t`Legacy Custom Sections`}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <Alert variant="warning" className="mb-4">
                    <WarningIcon className="size-4" />
                    <AlertTitle>{t`Deprecated`}</AlertTitle>
                    <AlertDescription>
                      {t`Custom sections are deprecated. Please use the structured sections above for better AI generation and autofill support.`}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {customSections.map((section, index) => (
                      <CustomSection key={section.id} id={section.id} index={index} />
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="mt-4 w-full gap-x-2"
                    onClick={addCustomSection}
                  >
                    <PlusIcon />
                    {t`Add Custom Section`}
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </div>
    </>
  );
};
