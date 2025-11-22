import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_AZURE_API_VERSION, DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "../constants/llm";

type Provider = "openai" | "azure" | "ollama" | "gemini";

type OpenAIStore = {
  baseURL: string | null;
  setBaseURL: (baseURL: string | null) => void;
  apiKey: string | null;
  setApiKey: (apiKey: string | null) => void;
  model: string | null;
  setModel: (model: string | null) => void;
  maxTokens: number | null;
  setMaxTokens: (maxTokens: number | null) => void;

  // Provider Selection
  provider: Provider;
  setProvider: (provider: Provider) => void;

  // Legacy/Specific fields
  isAzure: boolean; // Kept for legacy sync
  setIsAzure: (isAzure: boolean) => void;
  azureApiVersion: string | null;
  setAzureApiVersion: (apiVersion: string | null) => void;
};

export const useOpenAiStore = create<OpenAIStore>()(
  persist(
    (set) => ({
      baseURL: null,
      setBaseURL: (baseURL: string | null) => {
        set({ baseURL });
      },
      apiKey: null,
      setApiKey: (apiKey: string | null) => {
        set({ apiKey });
      },
      model: DEFAULT_MODEL,
      setModel: (model: string | null) => {
        set({ model });
      },
      maxTokens: DEFAULT_MAX_TOKENS,
      setMaxTokens: (maxTokens: number | null) => {
        set({ maxTokens });
      },

      provider: "openai",
      setProvider: (provider: Provider) => {
        set({ provider });
        // Sync legacy flag for backward compat if needed elsewhere
        if (provider === "azure") set({ isAzure: true });
        else set({ isAzure: false });
      },

      isAzure: false,
      setIsAzure: (isAzure: boolean) => {
        set({ isAzure });
        if (isAzure) set({ provider: "azure" });
      },
      azureApiVersion: DEFAULT_AZURE_API_VERSION,
      setAzureApiVersion: (azureApiVersion: string | null) => {
        set({ azureApiVersion });
      },
    }),
    { name: "openai" },
  ),
);
