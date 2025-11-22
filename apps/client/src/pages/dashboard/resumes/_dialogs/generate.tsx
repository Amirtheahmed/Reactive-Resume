import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { MagicWandIcon } from "@phosphor-icons/react";
import { generateResumeSchema } from "@reactive-resume/dto";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  RichInput,
} from "@reactive-resume/ui";
import slugify from "@sindresorhus/slugify";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import type { z } from "zod";

import { useGenerateResume } from "@/client/services/resume/generate";
import { useDialog } from "@/client/stores/dialog";
import { useOpenAiStore } from "@/client/stores/openai";

// Omit openAiConfig from the form validation as it is pulled from the store
const formSchema = generateResumeSchema.omit({ openAiConfig: true });

type FormValues = z.infer<typeof formSchema>;

export const GenerateDialog = () => {
  const navigate = useNavigate();
  const { isOpen, close } = useDialog("generate");
  const { generateResume, loading } = useGenerateResume();
  const { apiKey, baseURL, model, maxTokens, isAzure, azureApiVersion } = useOpenAiStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", slug: "", jobDescription: "" },
  });

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "title") {
        form.setValue("slug", slugify(value.title ?? ""));
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [form.watch]);

  const onSubmit = async (data: FormValues) => {
    const resume = await generateResume({
      ...data,
      openAiConfig: {
        apiKey: apiKey ?? undefined,
        baseURL: baseURL ?? undefined,
        model: model ?? undefined,
        maxTokens: maxTokens ?? undefined,
        isAzure,
        azureApiVersion: azureApiVersion ?? undefined,
      },
    });
    close();
    await navigate(`/builder/${resume.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center space-x-2.5">
                  <MagicWandIcon />
                  <h2>{t`Generate Customized Resume`}</h2>
                </div>
              </DialogTitle>
              <DialogDescription>
                {t`Paste a job description below. We'll use your Information Bank to tailor a new resume specifically for this role.`}
              </DialogDescription>
            </DialogHeader>

            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Resume Title`}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="jobDescription"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Job Description`}</FormLabel>
                  <FormControl>
                    <RichInput className="min-h-48" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? t`Generating...` : t`Generate`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
