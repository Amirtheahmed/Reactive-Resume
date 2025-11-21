// apps/client/src/pages/dashboard/cover-letters/_dialogs/generate.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { MagicWandIcon } from "@phosphor-icons/react";
import { generateCoverLetterSchema } from "@reactive-resume/dto";
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

import { useGenerateCoverLetter } from "@/client/services/cover-letter";
import { useDialog } from "@/client/stores/dialog";

type FormValues = z.infer<typeof generateCoverLetterSchema>;

export const GenerateCoverLetterDialog = () => {
  const navigate = useNavigate();
  const { isOpen, close } = useDialog("generate-cover-letter");
  const { generateCoverLetter, loading } = useGenerateCoverLetter();

  const form = useForm<FormValues>({
    resolver: zodResolver(generateCoverLetterSchema),
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
    const coverLetter = await generateCoverLetter(data);
    close();
    await navigate(`/dashboard/cover-letters/${coverLetter.id}`);
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
                  <h2>{t`Generate Cover Letter with AI`}</h2>
                </div>
              </DialogTitle>
              <DialogDescription>
                {t`Paste a job description below. We'll use your Information Bank to tailor a new cover letter specifically for this role.`}
              </DialogDescription>
            </DialogHeader>

            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Cover Letter Title`}</FormLabel>
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
