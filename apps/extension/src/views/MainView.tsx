import { ArticleIcon, BriefcaseIcon, LightningIcon, MagicWandIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle } from "@reactive-resume/ui";
import { cn } from "@reactive-resume/utils";
import { useState } from "react";

import { useInformationStore } from "../store/information";
import type { JobContext } from "../store/jobContext";

type Props = {
  jobContext: JobContext | null;
  setJobContext: (context: JobContext | null) => void;
  onAutofill: () => void;
  onGenerate: () => void;
  setError: (error: string | null) => void;
  autofillState: "idle" | "loading" | "applying";
  autofillCount: number | null;
  hasAutofillSuggestions: boolean;
  hasResult: boolean;
  onReturnToReview: () => void;
  onReturnToResult: () => void;
};

export const MainView = ({
                           jobContext,
                           setJobContext,
                           onAutofill,
                           onGenerate,
                           setError,
                           autofillState,
                           autofillCount,
                           hasAutofillSuggestions,
                           hasResult,
                           onReturnToReview,
                           onReturnToResult,
                         }: Props) => {
  const [analyzing, setAnalyzing] = useState(false);

  // We use this state just to show the badge temporarily
  // In App.tsx we don't reset count immediately, so it persists on the view

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
      {/* Active Context Indicator */}
      <div className="rounded-md border border-secondary-accent bg-secondary/10 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Active Context
            </span>
            {jobContext ? (
              <div className="text-sm font-medium leading-tight">
                {jobContext.title}
                <span className="block text-xs text-muted-foreground opacity-80">
                  @ {jobContext.company}
                </span>
              </div>
            ) : (
              <div className="text-sm italic text-muted-foreground">
                No job description analyzed.
              </div>
            )}
          </div>
          {jobContext && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-error"
              onClick={() => setJobContext(null)}
              title="Clear Context"
            >
              <TrashSimpleIcon size={14} />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {hasAutofillSuggestions && (
          <Button variant="outline" className="w-full justify-start" onClick={onReturnToReview}>
            <LightningIcon className="mr-2 text-warning" />
            Return to Autofill Review
          </Button>
        )}

        {hasResult && (
          <Button variant="outline" className="w-full justify-start" onClick={onReturnToResult}>
            <MagicWandIcon className="mr-2 text-info" />
            Return to Generation Result
          </Button>
        )}

        <Card
          className={cn(
            "transition-colors",
            jobContext
              ? "cursor-pointer hover:bg-secondary/30"
              : "cursor-not-allowed opacity-50 grayscale",
          )}
          onClick={() => {
            if (jobContext) onAutofill();
            else setError("You must analyze a Job Description first.");
          }}
        >
          <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <LightningIcon size={24} className="text-warning" />
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-sm">
                Autofill Page
                {autofillState === "loading" && <Badge variant="secondary">Working...</Badge>}
                {autofillCount !== null && (
                  <Badge variant="success">Filled {autofillCount}</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">Fill forms using context.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className={cn(
            "transition-colors",
            jobContext
              ? "cursor-pointer hover:bg-secondary/30"
              : "cursor-not-allowed opacity-50 grayscale",
          )}
          onClick={() => {
            if (jobContext) onGenerate();
            else setError("You must analyze a Job Description first.");
          }}
        >
          <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <MagicWandIcon size={24} className="text-info" />
            <div className="flex-1">
              <CardTitle className="text-sm">Generate Content</CardTitle>
              <CardDescription className="text-xs">Create tailored Resume/CV.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-secondary/30"
          onClick={handleAnalyze}
        >
          <CardHeader className="flex-row items-center gap-4 space-y-0 p-4">
            <BriefcaseIcon size={24} className="text-primary" />
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-sm">
                Analyze Job Posting
                {analyzing && <Badge variant="secondary">Analyzing...</Badge>}
              </CardTitle>
              <CardDescription className="text-xs">Update active context.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};
