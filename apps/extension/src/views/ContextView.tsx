import { ArticleIcon, ArrowLeftIcon, MagicWandIcon, ReadCvLogoIcon } from "@phosphor-icons/react";
import {
  Button,
  Input,
  Label,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from "@reactive-resume/ui";
import { useState } from "react";

import { axios } from "../libs/axios";
import type { GenerationResult, GenerationType } from "../App";
import type { JobContext } from "../store/jobContext";

type Props = {
  jobContext: JobContext;
  setJobContext: (context: JobContext) => void;
  setResult: (result: GenerationResult) => void;
  setError: (error: string | null) => void;
  onBack: () => void;
};

export const ContextView = ({ jobContext, setJobContext, setResult, setError, onBack }: Props) => {
  const [generationType, setGenerationType] = useState<GenerationType>("resume");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const endpoint =
        generationType === "resume" ? "/extension/generate" : "/extension/generate-cover-letter";
      const payload = {
        jobTitle: jobContext.title,
        companyName: jobContext.company,
        jobDescription: jobContext.description,
        ...(generationType === "resume" && { template: "rhyhorn" }),
      };
      const res = await axios.post(endpoint, payload);
      setResult(res.data);
    } catch (error) {
      const message = (error as any).response?.data?.message || "Failed to generate.";
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 h-auto px-2 py-1" onClick={onBack}>
        <ArrowLeftIcon className="mr-2" /> Back
      </Button>

      <ToggleGroup
        type="single"
        value={generationType}
        onValueChange={(value: GenerationType) => value && setGenerationType(value)}
        className="grid w-full grid-cols-2"
      >
        <ToggleGroupItem value="resume" className="flex items-center justify-center gap-x-2 text-xs grow w-full">
          <ReadCvLogoIcon />
          <span>Resume</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="cover-letter"
          className="flex items-center justify-center gap-x-2 text-xs grow w-full"
        >
          <ArticleIcon />
          <span>Cover Letter</span>
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="space-y-1.5">
        <Label htmlFor="job-title">Job Title</Label>
        <Input
          id="job-title"
          value={jobContext.title}
          onChange={(e) => setJobContext({ ...jobContext, title: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="company-name">Company</Label>
        <Input
          id="company-name"
          value={jobContext.company}
          onChange={(e) => setJobContext({ ...jobContext, company: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="job-description">Description</Label>
        <Textarea
          id="job-description"
          value={jobContext.description}
          onChange={(e) => setJobContext({ ...jobContext, description: e.target.value })}
          className="min-h-[150px] text-xs"
        />
      </div>

      <Button className="w-full" onClick={handleGenerate} disabled={generating}>
        {generating ? "Generating..." : <><MagicWandIcon className="mr-2" /> Generate</>}
      </Button>
    </div>
  );
};
