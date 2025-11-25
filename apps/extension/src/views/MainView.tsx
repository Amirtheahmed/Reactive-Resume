import { ArticleIcon, BriefcaseIcon, LightningIcon } from "@phosphor-icons/react";
import { Badge, Card, CardDescription, CardHeader, CardTitle } from "@reactive-resume/ui";
import { useState } from "react";

import { useInformationStore } from "../store/information";
import type { JobContext } from "../App";

type Props = {
  setJobContext: (context: JobContext) => void;
  setError: (error: string | null) => void;
};

export const MainView = ({ setJobContext, setError }: Props) => {
  const { information } = useInformationStore();
  const [analyzing, setAnalyzing] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillCount, setAutofillCount] = useState<number | null>(null);

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

  const handleAutofill = async () => {
    if (!information) return;
    setAutofilling(true);
    setAutofillCount(null);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: "AUTOFILL",
          data: information,
        });
        if (response?.success) setAutofillCount(response.count);
      } catch (e) {
        setError("Autofill failed. Try refreshing the page.");
      }
    }
    setAutofilling(false);
  };

  return (
    <div className="space-y-4">
      <Card
        className="cursor-pointer transition-colors hover:bg-secondary/30"
        onClick={handleAutofill}
      >
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <LightningIcon size={24} className="text-warning" />
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Autofill Page
              {autofilling && <Badge variant="secondary">Working...</Badge>}
              {autofillCount !== null && (
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
