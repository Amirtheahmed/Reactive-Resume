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
    setResume(defaultResumeData);
  }, []);

  // Guard against undefined content before store hydration
  const content = coverLetter?.content || "";

  return (
    <Page pageNumber={1}>
      <div className="p-custom">
        <div
          className="wysiwyg"
          dangerouslySetInnerHTML={{ __html: sanitize(content) }}
        />
      </div>
    </Page>
  );
};
