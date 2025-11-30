import { t } from "@lingui/macro";
import { ChatCircleDotsIcon } from "@phosphor-icons/react";
import { Separator, Textarea } from "@reactive-resume/ui";
import { useState } from "react";
import { Helmet } from "react-helmet-async";

import { ChatInterface } from "./_components/chat-interface";

export const ChatPage = () => {
  const [jobDescription, setJobDescription] = useState("");

  return (
    <>
      <Helmet>
        <title>
          {t`Chat`} - {t`Reactive Resume`}
        </title>
      </Helmet>

      <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-y-4 lg:h-[calc(100vh-theme(spacing.12))] lg:flex-row lg:gap-x-6">
        <div className="flex flex-col gap-y-4 lg:w-1/3">
          <div className="flex items-center gap-x-2">
            <ChatCircleDotsIcon size={24} />
            <h1 className="text-2xl font-bold">{t`Chat Assistant`}</h1>
          </div>

          <p className="text-sm text-muted-foreground">
            {t`Ask questions about your resume or how it fits a specific job description.`}
          </p>

          <Separator />

          <div className="flex flex-1 flex-col gap-y-2">
            <label htmlFor="job-description" className="text-sm font-medium">
              {t`Job Description (Optional)`}
            </label>
            <Textarea
              id="job-description"
              value={jobDescription}
              placeholder={t`Paste the job description here to get tailored answers...`}
              className="flex-1 resize-none"
              onChange={(e) => { setJobDescription(e.target.value); }}
            />
          </div>
        </div>

        <Separator orientation="vertical" className="hidden lg:block" />
        <Separator orientation="horizontal" className="lg:hidden" />

        <div className="flex-1 overflow-hidden">
          <ChatInterface jobDescription={jobDescription} />
        </div>
      </div>
    </>
  );
};
