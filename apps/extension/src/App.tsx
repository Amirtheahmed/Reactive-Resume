import { useState, useEffect } from "react";
import { useAuthStore } from "./store/auth";
import { Button, Input, Label, Separator, Textarea, Badge } from "@reactive-resume/ui";
import { KeyIcon, PlugIcon, CheckCircleIcon, MagicWandIcon, ArrowSquareOutIcon, DownloadSimpleIcon, BriefcaseIcon } from "@phosphor-icons/react";

// Temporary axios instance until we set up shared libs properly for extension
import _axios from "axios";

type JobContext = {
  title: string;
  company: string;
  description: string;
  url: string;
};

type GenerationResult = {
  id: string;
  title: string;
  pdfUrl: string;
  previewUrl: string;
};

export const App = () => {
  const { apiKey, setApiKey } = useAuthStore();
  const [inputValue, setInputValue] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  // Job Context State
  const [analyzing, setAnalyzing] = useState(false);
  const [jobContext, setJobContext] = useState<JobContext | null>(null);

  // Generation State
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleSaveKey = () => {
    if (inputValue.trim()) {
      setApiKey(inputValue.trim());
    }
  };

  const handleDisconnect = () => {
    setApiKey(null);
    setInputValue("");
    setJobContext(null);
    setResult(null);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setJobContext(null);
    setResult(null);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "ANALYZE_JOB" });

        if (response && !response.error) {
          setJobContext({
            title: response.title,
            company: response.siteName,
            description: response.content,
            url: response.url
          });
        } else {
          console.error("Analysis failed:", response?.error);
        }
      } catch (e) {
        console.error("Could not communicate with content script", e);
      }
    }
    setAnalyzing(false);
  };

  const handleGenerate = async () => {
    if (!jobContext || !apiKey) return;
    setGenerating(true);

    try {
      // Direct axios call to server
      const res = await _axios.post(
        "http://localhost:3000/api/extension/generate",
        {
          jobTitle: jobContext.title,
          companyName: jobContext.company,
          jobDescription: jobContext.description,
          template: "rhyhorn"
        },
        {
          headers: {
            "X-API-Key": apiKey
          }
        }
      );

      setResult(res.data);
    } catch (error) {
      console.error("Generation failed", error);
    } finally {
      setGenerating(false);
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, "_blank");
  };

  if (!isHydrated) return null;

  if (!apiKey) {
    return (
      <div className="flex h-screen flex-col p-4 bg-background text-foreground">
        <div className="space-y-2 mb-6">
          <h1 className="font-bold text-xl flex items-center gap-2">
            <PlugIcon /> Connect
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your API Key from Reactive Resume to enable the extension.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <KeyIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="api-key"
                placeholder="rx_..."
                className="pl-9"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                type="password"
              />
            </div>
          </div>

          <Button onClick={handleSaveKey} className="w-full" disabled={!inputValue}>
            Connect Account
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="text-xs text-muted-foreground">
          <p>Don't have a key?</p>
          <a
            href="http://localhost:5173/dashboard/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary hover:no-underline"
          >
            Generate one in Settings &rarr; Developer
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col p-4 bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CheckCircleIcon size={20} className="text-success" weight="fill" />
          <h1 className="font-bold text-sm">Reactive Resume Copilot</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDisconnect} title="Disconnect">
          <ArrowSquareOutIcon />
        </Button>
      </div>

      {/* Main Actions */}
      {!jobContext && !result && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <BriefcaseIcon size={48} className="text-muted-foreground/50" />
          <div>
            <h2 className="font-medium">Job Context</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Navigate to a job posting and click analyze to extract details.
            </p>
          </div>
          <Button onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? "Analyzing..." : "Analyze Job Page"}
          </Button>
        </div>
      )}

      {/* Job Context Form */}
      {jobContext && !result && (
        <div className="space-y-4 mb-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-2">
            <Label>Job Title</Label>
            <Input
              value={jobContext.title}
              onChange={(e) => setJobContext({...jobContext, title: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input
              value={jobContext.company}
              onChange={(e) => setJobContext({...jobContext, company: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={jobContext.description}
              onChange={(e) => setJobContext({...jobContext, description: e.target.value})}
              className="min-h-[150px] text-xs"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setJobContext(null)}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : (
                <><MagicWandIcon className="mr-2" /> Generate Resume</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 flex flex-col items-center space-y-4">
              <div className="relative w-full aspect-[1/1.4] bg-secondary rounded-md overflow-hidden shadow-inner">
                <img src={result.previewUrl} alt="Resume Preview" className="object-cover w-full h-full opacity-90" />
              </div>

              <div className="text-center">
                <h3 className="font-semibold">{result.title}</h3>
                <Badge variant="success" className="mt-2">Generated Successfully</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Button onClick={() => openInNewTab(result.pdfUrl)}>
              <DownloadSimpleIcon className="mr-2" /> Download PDF
            </Button>
            <Button variant="outline" onClick={() => setJobContext(null) || setResult(null)}>
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
