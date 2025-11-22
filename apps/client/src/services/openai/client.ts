import { t } from "@lingui/macro";
import { OpenAI } from "openai";

import { GEMINI_BASE_URL } from "@/client/constants/llm";
import { useOpenAiStore } from "@/client/stores/openai";

export const openai = () => {
  const { apiKey, baseURL, isAzure, azureApiVersion, model, provider } = useOpenAiStore.getState();

  if (!apiKey) {
    throw new Error(
      t`Your API Key has not been set yet. Please go to your account settings to enable AI Integration.`,
    );
  }

  // Handle Azure
  if (provider === "azure" || isAzure) {
    if (!baseURL || !model || !azureApiVersion) {
      throw new Error(
        t`Azure OpenAI Base URL, deployment name (model), and API version are required when using Azure OpenAI.`,
      );
    }

    const azureBaseURL = baseURL.replace(/\/$/, "");

    return new OpenAI({
      apiKey,
      baseURL: `${azureBaseURL}/openai/deployments/${model}`,
      defaultQuery: { "api-version": azureApiVersion },
      dangerouslyAllowBrowser: true,
    });
  }

  // Handle Gemini
  if (provider === "gemini") {
    return new OpenAI({
      apiKey,
      baseURL: GEMINI_BASE_URL,
      dangerouslyAllowBrowser: true,
    });
  }

  // Handle OpenAI / Ollama
  return new OpenAI({
    apiKey,
    baseURL: baseURL ?? undefined,
    dangerouslyAllowBrowser: true,
  });
};
