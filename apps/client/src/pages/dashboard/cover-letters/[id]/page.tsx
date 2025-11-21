// apps/client/src/pages/dashboard/cover-letters/[id]/page.tsx
import { t } from "@lingui/macro";
import { CircleNotchIcon, CloudCheckIcon, FilePdfIcon } from "@phosphor-icons/react";
import type { CoverLetterDto } from "@reactive-resume/dto";
import { Button, Input, RichInput } from "@reactive-resume/ui";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import type { LoaderFunction } from "react-router";
import { redirect, useLoaderData } from "react-router";

import { queryClient } from "@/client/libs/query-client";
import { fetchCoverLetter } from "@/client/services/cover-letter";
import { usePrintCoverLetter } from "@/client/services/cover-letter/print";
import { useCoverLetterStore } from "@/client/stores/cover-letter";

export const CoverLetterEditorPage = () => {
  const coverLetter = useLoaderData() as CoverLetterDto;

  const { printCoverLetter, loading: printLoading } = usePrintCoverLetter();

  const onDownloadPdf = async () => {
    const { url } = await printCoverLetter({ id: coverLetter.id });
    const win = window.open(url, "_blank");
    if (win) win.focus();
  };

  const isSaving = useCoverLetterStore((state) => state.isSaving);
  const setValue = useCoverLetterStore((state) => state.setValue);
  const setCoverLetter = useCoverLetterStore((state) => state.setCoverLetter);
  const title = useCoverLetterStore((state) => state.coverLetter?.title ?? "");
  const content = useCoverLetterStore((state) => state.coverLetter?.content ?? "");

  useEffect(() => {
    setCoverLetter(coverLetter);
  }, [coverLetter]);

  return (
    <>
      <Helmet>
        <title>
          {title} - {t`Reactive Resume`}
        </title>
      </Helmet>

      <div className="max-w-2xl space-y-8 pb-24">
        <div className="flex items-start justify-between">
          <Input
            className="h-auto border-none bg-transparent p-0 text-4xl font-bold tracking-tight focus:ring-0"
            value={title}
            onChange={(e) => {
              setValue("title", e.target.value);
            }}
          />

          <div className="flex items-center gap-x-2">
            <Button size="icon" variant="ghost" disabled={printLoading} onClick={onDownloadPdf}>
              {printLoading ? <CircleNotchIcon className="animate-spin" /> : <FilePdfIcon />}
            </Button>

            <div className="text-muted-foreground">
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
        </div>

        <RichInput
          content={content}
          onChange={(value) => {
            setValue("content", value);
          }}
        />
      </div>
    </>
  );
};

export const CoverLetterLoader: LoaderFunction<CoverLetterDto> = async ({ params }) => {
  try {
    const id = params.id as string;

    return await queryClient.fetchQuery({
      queryKey: ["cover-letter", id],
      queryFn: () => fetchCoverLetter(id),
    });

  } catch {
    return redirect("/dashboard/cover-letters");
  }
};
