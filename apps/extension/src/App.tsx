import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { Header } from "./components/Header";
import { axios } from "./libs/axios";
import { useAuthStore } from "./store/auth";
import { ConnectView } from "./views/ConnectView";
import { ContextView } from "./views/ContextView";
import { MainView } from "./views/MainView";
import { ResultView } from "./views/ResultView";
import { Separator } from "@reactive-resume/ui";
import { useInformationStore } from "./store/information";
import { InformationDto } from "@reactive-resume/dto";
import { ReviewView } from "./views/ReviewView";
import { useJobContextStore, type JobContext } from "./store/jobContext";

export type GenerationResult = {
  id: string;
  title: string;
  pdfUrl: string;
  previewUrl?: string;
  editorUrl?: string;
};

export type GenerationType = "resume" | "cover-letter";

type Suggestion = {
  id: string;
  label?: string;
  value: string;
  strategy: "HEURISTIC" | "AI_MAPPED" | "AI_GENERATED";
};

type View = "connect" | "main" | "context" | "review" | "result";

export const App = () => {
  const { apiKey, setApiKey } = useAuthStore();
  const { information, setInformation } = useInformationStore();
  const { jobContext, setJobContext } = useJobContextStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Explicit View State Management
  const [currentView, setCurrentView] = useState<View>("connect");

  // Data states
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Autofill states
  const [autofillState, setAutofillState] = useState<"idle" | "loading" | "applying">("idle");
  const [autofillSuggestions, setAutofillSuggestions] = useState<Suggestion[]>([]);
  const [autofillCount, setAutofillCount] = useState<number | null>(null);

  useEffect(() => {
    const checkHydration = () => {
      const authHydrated = useAuthStore.persist.hasHydrated();
      const jobContextHydrated = useJobContextStore.persist.hasHydrated();

      if (authHydrated && jobContextHydrated) {
        setIsHydrated(true);
      }
    };

    checkHydration();

    const unsubAuth = useAuthStore.persist.onFinishHydration(checkHydration);
    const unsubJob = useJobContextStore.persist.onFinishHydration(checkHydration);

    return () => {
      unsubAuth();
      unsubJob();
    };
  }, []);

  // Initial Navigation Logic
  useEffect(() => {
    if (!isHydrated) return;
    if (apiKey) {
      if (currentView === "connect") setCurrentView("main");
    } else {
      setCurrentView("connect");
    }
  }, [apiKey, isHydrated]);

  useEffect(() => {
    if (apiKey && isHydrated) {
      axios.defaults.headers.common["X-API-Key"] = apiKey;
      axios
        .get<InformationDto>("/extension/me")
        .then((res) => {
          setInformation(res.data);
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            setApiKey(null);
            setInformation(null);
          }
        });
    }
  }, [apiKey, isHydrated, setApiKey, setInformation]);

  const handleReset = () => {
    setResult(null);
    setError(null);
    setAutofillState("idle");
    setAutofillSuggestions([]);
    setAutofillCount(null);
    setCurrentView("main");
  };

  const handleAutofill = async () => {
    if (!information?.data) return;

    if (!jobContext) {
      setError("Please analyze a job posting first.");
      return;
    }

    setAutofillState("loading");
    setError(null);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      setError("Cannot access the current tab.");
      setAutofillState("idle");
      return;
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "PREPARE_AUTOFILL",
        data: information.data,
      });

      if (!response || response.error) {
        throw new Error(response?.error || "Failed to communicate with the page. Please refresh and try again.");
      }

      const { fields, heuristicSuggestions, remainingFields, url } = response;

      let aiSuggestions: any[] = [];
      if (remainingFields.length > 0) {
        const aiResponse = await axios.post("/extension/autofill-map", {
          url: url,
          fields: remainingFields,
          jobDescription: jobContext.description,
        });
        aiSuggestions = aiResponse.data;
      }

      const combined = [
        ...heuristicSuggestions.map((s: any) => ({ ...s, strategy: "HEURISTIC" })),
        ...aiSuggestions,
      ].map(suggestion => ({
        ...suggestion,
        label: fields.find((f: any) => f.id === suggestion.id)?.label,
      }));

      if (combined.length === 0) {
        setError("Could not find any fields to autofill on this page.");
        setAutofillState("idle");
        return;
      }

      setAutofillSuggestions(combined);
      setCurrentView("review");
      setAutofillState("idle");
    } catch (e) {
      setError((e as Error).message);
      setAutofillState("idle");
    }
  };

  const handleApplyAutofill = async (map: { id: string; value: string }[]) => {
    setAutofillState("applying");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "APPLY_AUTOFILL", map });
      if (response.success) {
        setAutofillCount(response.count);
        // Instead of a dedicated success view, we go back to main and show a success badge in MainView
        setCurrentView("main");
      } else {
        throw new Error(response.error || "Failed to apply autofill.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAutofillState("idle");
    }
  };

  const handleDisconnect = () => {
    setApiKey(null);
    setInformation(null);
    setJobContext(null);
    setCurrentView("connect");
  };

  if (!isHydrated) {
    return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header onDisconnect={handleDisconnect} showDisconnect={!!apiKey} />
      <Separator />

      <main className="flex-1 overflow-y-auto p-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-md border border-error/50 bg-error/10 p-3 text-xs text-error"
          >
            {error}
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {currentView === "connect" && <ConnectView />}
            {currentView === "main" && (
              <MainView
                jobContext={jobContext}
                setJobContext={setJobContext}
                onAutofill={handleAutofill}
                onGenerate={() => setCurrentView("context")}
                setError={setError}
                autofillState={autofillState}
                autofillCount={autofillCount}
              />
            )}
            {currentView === "review" && (
              <ReviewView
                suggestions={autofillSuggestions}
                onApply={handleApplyAutofill}
                onBack={() => setCurrentView("main")}
                loading={autofillState === "applying"}
              />
            )}
            {currentView === "context" && jobContext && (
              <ContextView
                jobContext={jobContext}
                setJobContext={setJobContext}
                setResult={(res) => {
                  setResult(res);
                  setCurrentView("result");
                }}
                setError={setError}
                onBack={() => setCurrentView("main")}
              />
            )}
            {currentView === "result" && result && <ResultView result={result} onReset={handleReset} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
