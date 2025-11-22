import { zodResolver } from "@hookform/resolvers/zod";
import { t, Trans } from "@lingui/macro";
import { FloppyDiskIcon, TrashSimpleIcon } from "@phosphor-icons/react";
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
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  DEFAULT_AZURE_API_VERSION,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  GEMINI_DEFAULT_MODEL,
} from "@/client/constants/llm";
import { useOpenAiStore } from "@/client/stores/openai";

const formSchema = z.object({
  provider: z.enum(["openai", "azure", "ollama", "gemini"]).default("openai"),
  apiKey: z.string().default(""),
  baseURL: z.string().optional().default(""),
  model: z.string().default(DEFAULT_MODEL),
  maxTokens: z.number().default(DEFAULT_MAX_TOKENS),
  azureApiVersion: z.string().default(DEFAULT_AZURE_API_VERSION),
});

type FormValues = z.infer<typeof formSchema>;

export const OpenAISettings = () => {
  const {
    provider,
    setProvider,
    apiKey,
    setApiKey,
    baseURL,
    setBaseURL,
    model,
    setModel,
    maxTokens,
    setMaxTokens,
    azureApiVersion,
    setAzureApiVersion,
    setIsAzure,
  } = useOpenAiStore();

  const isEnabled = !!apiKey;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      provider: provider ?? "openai",
      apiKey: apiKey ?? "",
      baseURL: baseURL ?? "",
      model: model ?? DEFAULT_MODEL,
      maxTokens: maxTokens ?? DEFAULT_MAX_TOKENS,
      azureApiVersion: azureApiVersion ?? DEFAULT_AZURE_API_VERSION,
    },
  });

  const currentProvider = form.watch("provider");

  const onSubmit = (values: FormValues) => {
    setProvider(values.provider);
    setApiKey(values.apiKey);
    setModel(values.model);
    setMaxTokens(values.maxTokens);

    // Reset irrelevant fields based on provider
    if (values.provider === "azure") {
      setBaseURL(values.baseURL || null);
      setAzureApiVersion(values.azureApiVersion);
      setIsAzure(true);
    } else if (values.provider === "ollama") {
      setBaseURL(values.baseURL || null);
      setIsAzure(false);
    } else {
      setBaseURL(null);
      setIsAzure(false);
    }
  };

  const onRemove = () => {
    setProvider("openai");
    setApiKey(null);
    setBaseURL(null);
    setModel(DEFAULT_MODEL);
    setMaxTokens(DEFAULT_MAX_TOKENS);
    setIsAzure(false);
    setAzureApiVersion(DEFAULT_AZURE_API_VERSION);

    form.reset({
      provider: "openai",
      apiKey: "",
      baseURL: "",
      model: DEFAULT_MODEL,
      maxTokens: DEFAULT_MAX_TOKENS,
      azureApiVersion: DEFAULT_AZURE_API_VERSION,
    });
  };

  // Auto-switch models when provider changes (UX improvement)
  const handleProviderChange = (value: string) => {
    form.setValue("provider", value as FormValues["provider"]);
    if (value === "gemini") {
      form.setValue("model", GEMINI_DEFAULT_MODEL);
    } else if (value === "openai" || value === "azure") {
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

          {/* Provider Selection */}
          <FormField
            name="provider"
            control={form.control}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t`AI Provider`}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t`Select a provider`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
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
                  {currentProvider === "gemini" ? t`Gemini API Key` : t`API Key`}
                </FormLabel>
                <FormControl>
                  <Input type="password" placeholder="sk-..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Base URL (Only for Azure and Ollama) */}
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
                  <Input type="text" placeholder={currentProvider === "gemini" ? GEMINI_DEFAULT_MODEL : DEFAULT_MODEL} {...field} />
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

          {/* Azure Specific API Version */}
          {currentProvider === "azure" && (
            <FormField
              name="azureApiVersion"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Azure API Version`}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={DEFAULT_AZURE_API_VERSION}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex items-center space-x-2 self-end sm:col-start-2">
            <Button type="submit" disabled={!form.formState.isValid}>
              {isEnabled && <FloppyDiskIcon className="mr-2" />}
              {isEnabled ? t`Saved` : t`Save Locally`}
            </Button>

            {isEnabled && (
              <Button type="reset" variant="ghost" onClick={onRemove}>
                <TrashSimpleIcon className="mr-2" />
                {t`Forget`}
              </Button>
            )}
          </div>
        </form>
      </Form>

      <div className="prose prose-sm prose-zinc max-w-full dark:prose-invert">
        {currentProvider === "gemini" && (
          <p>
            <Trans>
              To use Google Gemini, you need to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">get an API Key from Google AI Studio</a>.
              This feature uses Google's OpenAI compatibility layer.
            </Trans>
          </p>
        )}
        {currentProvider === "openai" && (
          <p>
            <Trans>
              You have the option to <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.howtogeek.com/885918/how-to-get-an-openai-api-key/">obtain your own OpenAI API key</a>.
            </Trans>
          </p>
        )}
        <p>
          <Trans>
            Your API key is securely stored in the browser's local storage and is only utilized when
            making requests to the AI provider via their official SDKs or APIs.
          </Trans>
        </p>
      </div>

      <Alert variant="warning">
        <div className="prose prose-neutral max-w-full text-xs leading-relaxed text-primary dark:prose-invert">
          <Trans>
            <span className="font-medium">Note: </span>
            By utilizing AI features, you acknowledge that data (such as your resume content) will be sent to the selected third-party provider (OpenAI, Google, or your local Ollama instance).
            Reactive Resume bears no responsibility for the data processing practices of these third-party providers.
          </Trans>
        </div>
      </Alert>
    </div>
  );
};
