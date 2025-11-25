import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  ArticleIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  GearIcon,
  KeyIcon,
  LightningIcon,
  MagicWandIcon,
  PlugIcon,
  ReadCvLogoIcon,
} from "@phosphor-icons/react";
import type { InformationDto, OpenAIConfigDto } from "@reactive-resume/dto";
import {
  Badge,
  Button,
  Input,
  Label,
  Separator,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from "@reactive-resume/ui";
import { useEffect, useState } from "react";

import { axios } from "./libs/axios";
import { useAuthStore } from "./store/auth";

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
  editorUrl?: string; // Optional, for cover letters
};

type GenerationType = "resume" | "cover-letter";

type View = "connect" | "main" | "settings";

const ConnectView = () => {
  const { setApiKey } = useAuthStore();
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (!inputValue.trim()) return;
    setLoading(true);
    setError("");

    try {
      // Test the key before saving
      await axios.get("/extension/me", { headers: { "X-API-Key": inputValue.trim() } });
      setApiKey(inputValue.trim());
    } catch (err) {
      setError("Invalid API Key. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background p-4 text-foreground">
      <div className="mb-6 space-y-2">
        <h1 className="flex items-center gap-2 font-bold text-xl">
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
            <KeyIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="api-key"
              placeholder="rx_..."
              className="pl-9"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              type="password"
            />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
        </div>

        <Button onClick={handleConnect} className="w-full" disabled={!inputValue || loading}>
          {loading ? "Connecting..." : "Connect Account"}
        </Button>
      </div>

      <Separator className="my-6" />

      <div className="text-xs text-muted-foreground">
        <p>Don't have a key?</p>
        <a
          href="http://localhost:5173/dashboard/settings"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:no-underline"
        >
          Generate one in Settings &rarr; Developer
        </a>
      </div>
    </div>
  );
};

export const App = () => {
  const { apiKey, setApiKey } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [view, setView] = useState<"connect" | "main">("main");

  const [userData, setUserData] = useState<InformationDto | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [jobContext, setJobContext] = useState<JobContext | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillCount, setAutofillCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<GenerationType>("resume");

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (apiKey) {
      axios.defaults.headers.common["X-API-Key"] = apiKey;
      axios
        .get<InformationDto>("/extension/me")
        .then((res) => setUserData(res.data))
        .catch((err) => {
          if (err.response?.status === 401) setApiKey(null);
        });
    }
  }, [apiKey, setApiKey]);

  const handleDisconnect = () => {
    setApiKey(null);
    setJobContext(null);
    setResult(null);
    setUserData(null);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setJobContext(null);
    setResult(null);

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
        setError("Failed to analyze page. Try refreshing the tab.");
        console.error("Analysis failed:", e);
      }
    }
    setAnalyzing(false);
  };

  const handleAutofill = async () => {
    if (!userData) return;
    setAutofilling(true);
    setAutofillCount(null);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "AUTOFILL", data: userData });
        if (response?.success) setAutofillCount(response.count);
      } catch (e) {
        console.error("Autofill error", e);
      }
    }
    setAutofilling(false);
  };

  const handleGenerate = async () => {
    if (!jobContext || !apiKey) return;
    setGenerating(true);
    setError(null);

    try {
      if (generationType === "resume") {
        const res = await axios.post("/extension/generate", {
          jobTitle: jobContext.title,
          companyName: jobContext.company,
          jobDescription: jobContext.description,
          template: "rhyhorn",
        });
        setResult(res.data);
      } else {
        const res = await axios.post("/extension/generate-cover-letter", {
          jobTitle: jobContext.title,
          companyName: jobContext.company,
          jobDescription: jobContext.description,
        });
        setResult(res.data);
      }
    } catch (error) {
      const message = (error as any).response?.data?.message || "Failed to generate.";
      setError(message);
      console.error("Generation failed", error);
    } finally {
      setGenerating(false);
    }
  };

  if (!isHydrated) return null;
  if (!apiKey) return <ConnectView />;

  return (
    <div className="flex h-screen flex-col overflow-y-auto bg-background text-foreground">
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <CheckCircleIcon size={20} className="text-success" weight="fill" />
          <h1 className="text-sm font-bold">Reactive Resume Copilot</h1>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleDisconnect} title="Disconnect">
            <ArrowSquareOutIcon />
          </Button>
        </div>
      </div>
      <Separator />

      <div className="flex-1 p-4">
        {error && (
          <div className="mb-4 rounded-md border border-error/50 bg-error/10 p-3 text-xs text-error">
            {error}
          </div>
        )}

        <div className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </h2>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={handleAutofill}
            disabled={autofilling}
          >
            <span className="flex items-center gap-2">
              <LightningIcon className="text-warning" /> Autofill This Page
            </span>
            {autofillCount !== null && (
              <Badge variant="success" className="ml-2 h-5 px-1.5 text-[10px]">
                Filled {autofillCount}
              </Badge>
            )}
          </Button>
        </div>

        {!jobContext && !result && (
          <div className="space-y-4 rounded-lg border border-dashed py-8 text-center">
            <BriefcaseIcon size={48} className="mx-auto text-muted-foreground/50" />
            <div>
              <h2 className="font-medium">Context-Aware Resume</h2>
              <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                Navigate to a job posting and click analyze to generate a tailored resume.
              </p>
            </div>
            <Button onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? "Analyzing..." : "Analyze Job Page"}
            </Button>
          </div>
        )}

        {jobContext && !result && (
          <div className="space-y-4">
            <Input
              value={jobContext.title}
              onChange={(e) => setJobContext({ ...jobContext, title: e.target.value })}
            />
            <Input
              value={jobContext.company}
              onChange={(e) => setJobContext({ ...jobContext, company: e.target.value })}
            />
            <Textarea
              value={jobContext.description}
              onChange={(e) => setJobContext({ ...jobContext, description: e.target.value })}
              className="min-h-[150px] text-xs"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setJobContext(null)}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleGenerate} disabled={generating}>
                {generating ? "Generating..." : <><MagicWandIcon className="mr-2" /> Generate</>}
              </Button>
            </div>
          </div>
        )}

        {jobContext && !result && (
          <div className="space-y-4">
            {/* [!code ++] */}
            <ToggleGroup
              type="single"
              value={generationType}
              onValueChange={(value: GenerationType) => {
                if (value) setGenerationType(value);
              }}
              className="w-full"
            >
              <ToggleGroupItem value="resume" className="flex-1 gap-2">
                <ReadCvLogoIcon /> Resume
              </ToggleGroupItem>
              <ToggleGroupItem value="cover-letter" className="flex-1 gap-2">
                <ArticleIcon /> Cover Letter
              </ToggleGroupItem>
            </ToggleGroup>

            <Input
              value={jobContext.title}
              onChange={(e) => setJobContext({ ...jobContext, title: e.target.value })}
            />
            <Input
              value={jobContext.company}
              onChange={(e) => setJobContext({ ...jobContext, company: e.target.value })}
            />
            <Textarea
              value={jobContext.description}
              onChange={(e) => setJobContext({ ...jobContext, description: e.target.value })}
              className="min-h-[150px] text-xs"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setJobContext(null)}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleGenerate} disabled={generating}>
                {generating ? "Generating..." : <><MagicWandIcon className="mr-2" /> Generate</>}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col items-center space-y-4 p-6">
                <div className="relative aspect-[1/1.4] w-full overflow-hidden rounded-md bg-secondary shadow-inner">
                  {/* [!code ++] */}
                  {result.previewUrl ? (
                    <img
                      src={result.previewUrl}
                      alt="Resume Preview"
                      className="size-full object-cover opacity-90"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center p-4">
                      <ArticleIcon size={64} className="text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="font-semibold">{result.title}</h3>
                  <Badge variant="success" className="mt-2">
                    Generated Successfully
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Button onClick={() => window.open(result.pdfUrl, "_blank")}>
                <DownloadSimpleIcon className="mr-2" /> Download PDF
              </Button>
              {result.editorUrl && (
                <Button
                  variant="secondary"
                  onClick={() => window.open(`http://localhost:5173${result.editorUrl}`, "_blank")}
                >
                  <ArrowSquareOutIcon className="mr-2" /> Open in Editor
                </Button>
              )}
              <Button variant="outline" onClick={() => { setJobContext(null); setResult(null); }}>
                Start Over
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
