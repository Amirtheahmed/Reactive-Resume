// apps/client/src/pages/dashboard/settings/_sections/openai.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { t, Trans } from "@lingui/macro";
import { TrashSimpleIcon } from "@phosphor-icons/react";
import {
  Alert,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@reactive-resume/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  DEFAULT_AZURE_API_VERSION,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  GEMINI_DEFAULT_MODEL,
} from "@/client/constants/llm";
import { useToast } from "@/client/hooks/use-toast";
import { useAiSettings, useUpdateAiSettings } from "@/client/services/user/ai-settings";
import { useOpenAiStore } from "@/client/stores/openai";

const formSchema = z.object({
  provider: z.enum(["openai", "azure", "ollama", "gemini", "vertexai"]).default("openai"),
  apiKey: z.string().optional().default(""), // Optional: only for updates
  baseURL: z.string().optional().default(""),
  model: z.string().default(DEFAULT_MODEL),
  maxTokens: z.number().default(DEFAULT_MAX_TOKENS),
  azureApiVersion: z.string().default(DEFAULT_AZURE_API_VERSION),
});

type FormValues = z.infer<typeof formSchema>;

const OpenAISettings = () => {
  const { toast } = useToast();
  const { data: aiSettings, isLoading } = useAiSettings();
  const { updateAiSettings, loading: isSaving } = useUpdateAiSettings();

  const {
    setProvider,
    setApiKey,
    setBaseURL,
    setModel,
    setMaxTokens,
    setAzureApiVersion,
    setIsAzure,
  } = useOpenAiStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: "openai",
      apiKey: "",
      baseURL: "",
      model: DEFAULT_MODEL,
      maxTokens: DEFAULT_MAX_TOKENS,
      azureApiVersion: DEFAULT_AZURE_API_VERSION,
    },
  });

  useEffect(() => {
    if (aiSettings) {
      const newValues = {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        provider: aiSettings.provider ?? "openai",
        apiKey: "", // API key is never sent to the client
        baseURL: aiSettings.baseURL ?? "",
        model: aiSettings.model ?? DEFAULT_MODEL,
        maxTokens: aiSettings.maxTokens ?? DEFAULT_MAX_TOKENS,
        azureApiVersion: aiSettings.azureApiVersion ?? DEFAULT_AZURE_API_VERSION,
      };

      // Reset the form with the fetched values
      form.reset(newValues);

      // Synchronize the fetched settings with the Zustand store
      setProvider(newValues.provider);
      setBaseURL(newValues.baseURL);
      setModel(newValues.model);
      setMaxTokens(newValues.maxTokens);
      setAzureApiVersion(newValues.azureApiVersion);
      setIsAzure(newValues.provider === "azure");

      // Update the key status in the store without exposing the key
      if (aiSettings.isApiKeySet) {
        setApiKey("key_is_set_on_server");
      } else {
        setApiKey(null);
      }
    }
  }, [aiSettings, form, setProvider, setApiKey, setBaseURL, setModel, setMaxTokens, setAzureApiVersion, setIsAzure]);

  const currentProvider = form.watch("provider");
  const isEnabled = aiSettings?.isApiKeySet ?? false;

  const onSubmit = async (values: FormValues) => {
    await updateAiSettings({
      provider: values.provider,
      apiKey: values.apiKey,
      baseURL: values.baseURL,
      model: values.model,
      maxTokens: values.maxTokens,
      azureApiVersion: values.azureApiVersion,
      isAzure: values.provider === "azure",
    });

    // FIX: After a successful save, also update the Zustand store
    setProvider(values.provider);
    setBaseURL(values.baseURL);
    setModel(values.model);
    setMaxTokens(values.maxTokens);
    setAzureApiVersion(values.azureApiVersion);
    setIsAzure(values.provider === "azure");
    if (values.apiKey) {
      setApiKey(values.apiKey);
    }

    toast({ variant: "success", title: t`AI settings have been saved to your account.` });
  };

  const onRemove = async () => {
    const emptySettings: FormValues = {
      provider: "openai",
      apiKey: "",
      baseURL: "",
      model: DEFAULT_MODEL,
      maxTokens: DEFAULT_MAX_TOKENS,
      azureApiVersion: DEFAULT_AZURE_API_VERSION,
    };

    await updateAiSettings({ ...emptySettings, apiKey: "", isAzure: false }); // Explicitly clear the key on the server

    // FIX: Clear the Zustand store as well
    setProvider("openai");
    setApiKey(null);
    setBaseURL(null);
    setModel(DEFAULT_MODEL);
    setMaxTokens(DEFAULT_MAX_TOKENS);
    setAzureApiVersion(DEFAULT_AZURE_API_VERSION);
    setIsAzure(false);

    form.reset(emptySettings);
    toast({ variant: "success", title: t`AI settings have been removed from your account.` });
  };

  const handleProviderChange = (value: string) => {
    const provider = value as FormValues["provider"];
    form.setValue("provider", provider);
    if (provider === "gemini") {
      form.setValue("model", GEMINI_DEFAULT_MODEL);
    } else if (provider === "openai" || provider === "azure") {
      form.setValue("model", DEFAULT_MODEL);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold leading-relaxed tracking-tight">{t`AI Integration`}</h3>
        <p className="leading-relaxed opacity-75">
          {t`Configure your AI provider to help generate content, fix grammar, and improve writing.`}
        </p>
      </div>

      <Form {...form}>
        <form className="grid gap-6 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            name="provider"
            control={form.control}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t`AI Provider`}</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    disabled={isLoading}
                    onValueChange={handleProviderChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t`Select a provider`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="vertexai">Google Gemini Vertex</SelectItem>
                      <SelectItem value="azure">Azure OpenAI</SelectItem>
                      <SelectItem value="ollama">Ollama (Local)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="apiKey"
            control={form.control}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>
                  {currentProvider === "gemini" || currentProvider === "vertexai" ? t`Gemini API Key` : t`API Key`}
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="off"
                    placeholder={isEnabled ? t`•••••••••••••••••••• (saved)` : "sk-..."}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {(currentProvider === "azure" || currentProvider === "ollama") && (
            <FormField
              name="baseURL"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {currentProvider === "azure" ? t`Azure OpenAI Resource URL` : t`Base URL`}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={
                        currentProvider === "azure"
                          ? "https://your-resource.openai.azure.com"
                          : "http://localhost:11434/v1"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            name="model"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{currentProvider === "azure" ? t`Deployment Name` : t`Model`}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={
                      currentProvider === "gemini" ? GEMINI_DEFAULT_MODEL : DEFAULT_MODEL
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="maxTokens"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t`Max Tokens`}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={`${DEFAULT_MAX_TOKENS}`}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.valueAsNumber);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {currentProvider === "azure" && (
            <FormField
              name="azureApiVersion"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Azure API Version`}</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder={DEFAULT_AZURE_API_VERSION} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex items-center space-x-2 self-end sm:col-start-2">
            <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
              {isSaving ? t`Saving...` : t`Save Changes`}
            </Button>

            {isEnabled && (
              <Button type="button" variant="ghost" onClick={onRemove}>
                <TrashSimpleIcon className="mr-2" />
                {t`Remove`}
              </Button>
            )}
          </div>
        </form>
      </Form>

      <div className="prose prose-sm prose-zinc max-w-full dark:prose-invert">
        {currentProvider === "gemini" && (
          <p>
            <Trans>
              To use Google Gemini, you need to{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
              >
                get an API Key from Google AI Studio
              </a>
              . This feature uses Google's OpenAI compatibility layer.
            </Trans>
          </p>
        )}
        {currentProvider === "vertexai" && (
          <p>
            <Trans>
              To use Google Gemini Vertex, you need to{" "}
              <a
                href="https://cloud.google.com/vertex-ai/docs/generative-ai/enable-generative-ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                enable Vertex AI and obtain an API key
              </a>
              . This feature uses Google's Vertex AI API.
            </Trans>
          </p>
        )}
        {currentProvider === "openai" && (
          <p>
            <Trans>
              You have the option to{" "}
              <a
                target="_blank"
                rel="noopener noreferrer nofollow"
                href="https://www.howtogeek.com/885918/how-to-get-an-openai-api-key/"
              >
                obtain your own OpenAI API key
              </a>
              .
            </Trans>
          </p>
        )}
        <p>
          <Trans>
            Your API key is securely stored in the database and is only utilized when making
            requests to the AI provider via their official SDKs or APIs from the server.
          </Trans>
        </p>
      </div>

      <Alert variant="warning">
        <div className="prose prose-neutral max-w-full text-xs leading-relaxed text-primary dark:prose-invert">
          <Trans>
            <span className="font-medium">Note: </span>
            By utilizing AI features, you acknowledge that data (such as your resume content) will
            be sent to the selected third-party provider (OpenAI, Google, or your local Ollama
            instance). Reactive Resume bears no responsibility for the data processing practices of
            these third-party providers.
          </Trans>
        </div>
      </Alert>
    </div>
  );
};
export default OpenAISettings;
