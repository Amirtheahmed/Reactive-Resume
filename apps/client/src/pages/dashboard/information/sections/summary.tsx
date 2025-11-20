import { t } from "@lingui/macro";
import { RichInput } from "@reactive-resume/ui";

import { useInformationStore } from "@/client/stores/information";

export const SummarySection = () => {
  const setValue = useInformationStore((state) => state.setValue);
  const summary = useInformationStore((state) => state.information.sections.summary);

  return (
    <section id="summary" className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{t`Summary`}</h2>
        <p className="text-muted-foreground">
          {t`A brief overview of your professional background and goals. You can also use this for your Work Philosophy.`}
        </p>
      </header>

      <main>
        <RichInput
          content={summary.content}
          onChange={(content) => {
            setValue("sections.summary.content", content);
          }}
        />
      </main>
    </section>
  );
};
