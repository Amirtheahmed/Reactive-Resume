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

export const App = () => {
  const { apiKey, setApiKey } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const [jobContext, setJobContext] = useState<JobContext | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { setInformation } = useInformationStore();

  useEffect(() => {
    // This ensures we wait for Zustand to rehydrate from chrome.storage
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (apiKey) {
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
  }, [apiKey, setApiKey, setInformation]);

  const handleReset = () => {
    setJobContext(null);
    setResult(null);
    setError(null);
  };

  const currentView = () => {
    if (!apiKey) return "connect";
    if (result) return "result";
    if (jobContext) return "context";
    return "main";
  };

  const view = currentView();

  if (!isHydrated) {
    // render a loading spinner here if you like
    return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Header onDisconnect={() => setApiKey(null)} showDisconnect={!!apiKey} />
      <Separator />

      <main className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {view === "connect" && <ConnectView />}
            {view === "main" && <MainView setJobContext={setJobContext} setError={setError} />}
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
