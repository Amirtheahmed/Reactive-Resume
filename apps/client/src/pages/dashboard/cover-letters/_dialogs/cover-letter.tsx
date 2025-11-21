// apps/client/src/pages/dashboard/cover-letters/_dialogs/cover-letter.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { CaretDownIcon, FlaskIcon, MagicWandIcon, PlusIcon } from "@phosphor-icons/react";
import type { CoverLetterDto } from "@reactive-resume/dto";
import { createCoverLetterSchema } from "@reactive-resume/dto";
import { idSchema } from "@reactive-resume/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Tooltip,
} from "@reactive-resume/ui";
import { cn, generateRandomName } from "@reactive-resume/utils";
import slugify from "@sindresorhus/slugify";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  useCreateCoverLetter,
  useDeleteCoverLetter,
  useUpdateCoverLetter,
} from "@/client/services/cover-letter";
import { useDialog } from "@/client/stores/dialog";

const formSchema = createCoverLetterSchema.extend({ id: idSchema.optional(), slug: z.string() });

type FormValues = z.infer<typeof formSchema>;

// eslint-disable-next-line lingui/no-unlocalized-strings
const sampleContent = `<p>Dear Hiring Manager,</p><p><br></p><p>I am writing to express my interest in the [Job Title] position I saw advertised on [Platform]. With my background in [Your Field] and extensive experience in [Key Skill 1] and [Key Skill 2], I am confident that I would be a valuable asset to your team at [Company Name].</p><p><br></p><p>In my previous role at [Previous Company], I was responsible for [briefly describe a key responsibility]. One of my proudest achievements was [mention a specific accomplishment], which resulted in [quantifiable result]. This experience has equipped me with the skills necessary to excel in this role.</p><p><br></p><p>I have been following [Company Name]'s work for some time and am particularly impressed with [mention something specific about the company]. I am excited by the opportunity to contribute to a company that values [Company Value 1] and [Company Value 2].</p><p><br></p><p>Thank you for considering my application. I have attached my resume for your review and look forward to discussing how my skills and experience can benefit your team.</p><p><br></p><p>Sincerely,</p><p>[Your Name]</p>`;

export const CoverLetterDialog = () => {
  const { isOpen, mode, payload, close } = useDialog<CoverLetterDto>("cover-letter");

  const isCreate = mode === "create";
  const isUpdate = mode === "update";
  const isDelete = mode === "delete";
  const isDuplicate = mode === "duplicate";

  const { createCoverLetter, loading: createLoading } = useCreateCoverLetter();
  const { updateCoverLetter, loading: updateLoading } = useUpdateCoverLetter();
  const { deleteCoverLetter, loading: deleteLoading } = useDeleteCoverLetter();

  const loading = createLoading || updateLoading || deleteLoading;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", slug: "" },
  });

  useEffect(() => {
    if (isOpen) onReset();
  }, [isOpen, payload]);

  useEffect(() => {
    const slug = slugify(form.watch("title"));
    form.setValue("slug", slug);
  }, [form.watch("title")]);

  const onSubmit = async (values: FormValues) => {
    if (isCreate) {
      await createCoverLetter({ slug: values.slug, title: values.title, content: "" });
    }

    if (isUpdate) {
      if (!payload.item?.id) return;
      await updateCoverLetter({ id: payload.item.id, title: values.title, slug: values.slug });
    }

    if (isDuplicate) {
      if (!payload.item?.id) return;
      await createCoverLetter({
        title: values.title,
        slug: values.slug,
        content: payload.item.content,
      });
    }

    if (isDelete) {
      if (!payload.item?.id) return;
      await deleteCoverLetter(payload.item.id);
    }

    close();
  };

  const onReset = () => {
    if (isCreate) form.reset({ title: "", slug: "" });
    if (isUpdate)
      form.reset({
        id: payload.item?.id,
        title: payload.item?.title,
        slug: payload.item?.slug,
      });
    if (isDuplicate)
      form.reset({ title: `${payload.item?.title} (Copy)`, slug: `${payload.item?.slug}-copy` });
    if (isDelete)
      form.reset({
        id: payload.item?.id,
        title: payload.item?.title,
        slug: payload.item?.slug,
      });
  };

  const onGenerateRandomName = () => {
    const name = generateRandomName();
    form.setValue("title", name);
    form.setValue("slug", slugify(name));
  };

  const onCreateSample = async () => {
    const randomName = generateRandomName();
    await createCoverLetter({
      title: randomName,
      slug: slugify(randomName),
      content: sampleContent,
    });
    close();
  };

  if (isDelete) {
    return (
      <AlertDialog open={isOpen} onOpenChange={close}>
        <AlertDialogContent>
          <Form {...form}>
            <form>
              <AlertDialogHeader>
                <AlertDialogTitle>{t`Are you sure you want to delete this cover letter?`}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t`This action cannot be undone. This will permanently delete your cover letter.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
                <AlertDialogAction variant="error" onClick={form.handleSubmit(onSubmit)}>
                  {t`Delete`}
                </AlertDialogAction>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center space-x-2.5">
                  <PlusIcon />
                  <h2>
                    {isCreate && t`Create a new cover letter`}
                    {isUpdate && t`Update an existing cover letter`}
                    {isDuplicate && t`Duplicate an existing cover letter`}
                  </h2>
                </div>
              </DialogTitle>
            </DialogHeader>

            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Title`}</FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-between gap-x-2">
                      <Input {...field} className="flex-1" />
                      {(isCreate || isDuplicate) && (
                        <Tooltip content={t`Generate a random title`}>
                          <Button
                            size="icon"
                            type="button"
                            variant="outline"
                            onClick={onGenerateRandomName}
                          >
                            <MagicWandIcon />
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="slug"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t`Slug`}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <div className="flex items-center">
                <Button
                  type="submit"
                  disabled={loading}
                  className={cn(isCreate && "rounded-r-none")}
                >
                  {isCreate && t`Create`}
                  {isUpdate && t`Save Changes`}
                  {isDuplicate && t`Duplicate`}
                </Button>

                {isCreate && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="icon" className="rounded-l-none border-l">
                        <CaretDownIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="center">
                      <DropdownMenuItem onClick={onCreateSample}>
                        <FlaskIcon className="mr-2" />
                        {t`Create with Sample Content`}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
