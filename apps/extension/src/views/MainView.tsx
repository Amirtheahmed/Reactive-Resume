import { ArticleIcon, BriefcaseIcon, LightningIcon } from "@phosphor-icons/react";
import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@reactive-resume/ui";
import { useState } from "react";

import { useInformationStore } from "../store/information";
import type { JobContext } from "../App";

type Props = {
  setJobContext: (context: JobContext) => void;
  onAutofill: () => void;
  setError: (error: string | null) => void;
  autofillState: "idle" | "loading" | "reviewing" | "applying" | "success";
  autofillCount: number | null;
};

export const MainView = ({ setJobContext, onAutofill, setError, autofillState, autofillCount }: Props) => {
  const [analyzing, setAnalyzing] = useState(false);
  const { information } = useInformationStore();
  const [, setAutofillCount] = useState<number | null>(autofillCount);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "ANALYZE_JOB" });
        if (response?.error) throw new Error(response.error);
        setJobContext({
          title: response.title,
          company: response.siteName,
          description: response.content,
          url: response.url,
        });
      } catch (e) {
        setError("Failed to analyze page. Is this a valid job posting?");
      }
    }
    setAnalyzing(false);
  };

  return (
    <div className="space-y-4">
      <Card
        className="cursor-pointer transition-colors hover:bg-secondary/30"
        onClick={onAutofill}
      >
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <LightningIcon size={24} className="text-warning" />
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Autofill Page
              {autofillState === "loading" && <Badge variant="secondary">Working...</Badge>}
              {autofillState === "success" && autofillCount !== null && (
                <Badge variant="success">Filled {autofillCount} fields</Badge>
              )}
            </CardTitle>
            <CardDescription>Fill forms with your Information Bank.</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card
        className="cursor-pointer transition-colors hover:bg-secondary/30"
        onClick={handleAnalyze}
      >
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <BriefcaseIcon size={24} className="text-primary" />
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Analyze Job Posting
              {analyzing && <Badge variant="secondary">Analyzing...</Badge>}
            </CardTitle>
            <CardDescription>Generate a tailored resume or cover letter.</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};
