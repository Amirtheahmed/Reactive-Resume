// apps/extension/src/App.tsx

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
import { useJobContextStore } from "./store/jobContext";

export type JobContext = {
  title: string;
  company: string;
  description: string;
  url: string;
};

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

export const App = () => {
  const { apiKey, setApiKey } = useAuthStore();
  const { information, setInformation } = useInformationStore();
  const { jobContext, setJobContext } = useJobContextStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // View states
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Autofill states
  type AutofillState = "idle" | "loading" | "reviewing" | "applying" | "success";
  const [autofillState, setAutofillState] = useState<AutofillState>("idle");
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
    setJobContext(null);
  };

  const handleAutofill = async () => {
    if (!information?.data) return;
    setAutofillState("loading");
    setError(null);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Fix: Removed check for !tab.url, relying on tab.id only
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

      // Fix: Destructure url from response
      const { fields, heuristicSuggestions, remainingFields, url } = response;

      let aiSuggestions: any[] = [];
      if (remainingFields.length > 0) {
        const aiResponse = await axios.post("/extension/autofill-map", {
          url: url, // Fix: Pass the URL from content script
          fields: remainingFields,
          jobDescription: jobContext?.description,
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
      setAutofillState("reviewing");
    } catch (e) {
      setError((e as Error).message);
      setAutofillState("idle");
    }
  };

  // ... (rest of the component remains same)
  const handleApplyAutofill = async (map: { id: string; value: string }[]) => {
    setAutofillState("applying");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "APPLY_AUTOFILL", map });
      if (response.success) {
        setAutofillCount(response.count);
        setAutofillState("success");
        setTimeout(handleReset, 4000);
      } else {
        throw new Error(response.error || "Failed to apply autofill.");
      }
    } catch (e) {
      setError((e as Error).message);
      setAutofillState("reviewing");
    }
  };

  const currentView = () => {
    if (!apiKey) return "connect";
    if (autofillState === "reviewing" || autofillState === "applying" || autofillState === "success") return "review";
    if (result) return "result";
    if (jobContext) return "context";
    return "main";
  };

  const view = currentView();

  if (!isHydrated) {
    return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header onDisconnect={() => { setApiKey(null); setInformation(null); setJobContext(null); }} showDisconnect={!!apiKey} />
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
            key={view}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {view === "connect" && <ConnectView />}
            {view === "main" && (
              <MainView
                setJobContext={setJobContext}
                onAutofill={handleAutofill}
                setError={setError}
                autofillState={autofillState}
                autofillCount={autofillCount}
              />
            )}
            {view === "review" && (
              <ReviewView
                suggestions={autofillSuggestions}
                onApply={handleApplyAutofill}
                onBack={handleReset}
                loading={autofillState === "applying"}
              />
            )}
            {view === "context" && jobContext && (
              <ContextView
                jobContext={jobContext}
                setJobContext={setJobContext}
                setResult={setResult}
                setError={setError}
                onBack={handleReset}
              />
            )}
            {view === "result" && result && <ResultView result={result} onReset={handleReset} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
