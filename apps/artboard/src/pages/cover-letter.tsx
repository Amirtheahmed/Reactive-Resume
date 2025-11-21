import { defaultResumeData } from "@reactive-resume/schema";
import { sanitize } from "@reactive-resume/utils";
import { useEffect } from "react";

import { Page } from "../components/page";
import { useArtboardStore } from "../store/artboard";
import { useCoverLetterStore } from "../store/cover-letter";

export const CoverLetterPage = () => {
  const setResume = useArtboardStore((state) => state.setResume);
  const coverLetter = useCoverLetterStore((state) => state.coverLetter);

  // HACK: Use default resume data for styling the page, as cover letters don't have their own metadata.
  useEffect(() => {
    // Clone the default data to avoid mutating the shared object
    const coverLetterData = JSON.parse(JSON.stringify(defaultResumeData));

    // Increase margin for cover letters to improve readability (50px ~= 13mm)
    // The default 18px is too narrow for a document layout.
    coverLetterData.metadata.page.margin = 50;

    setResume(coverLetterData);
  }, [setResume]);

  // Guard against undefined content before store hydration
  const content = coverLetter?.content ?? "";

  return (
    <Page pageNumber={1}>
      <div className="p-custom">
        <div
          dangerouslySetInnerHTML={{ __html: sanitize(content) }}
          className="wysiwyg"
        />
      </div>
    </Page>
  );
};
