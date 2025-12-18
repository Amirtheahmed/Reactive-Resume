// apps/client/src/pages/dashboard/information/dialogs/languages.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { defaultLanguage, languageSchema } from "@reactive-resume/schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Slider,
} from "@reactive-resume/ui";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { SectionDialogBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

const formSchema = languageSchema;
type FormValues = z.infer<typeof formSchema>;

export const LanguagesInfoDialog = () => {
  const { isOpen, mode, payload, close } = useDialog<FormValues>("info-languages");

  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.languages);

  const form = useForm<FormValues>({
    defaultValues: defaultLanguage,
    resolver: zodResolver(formSchema),
  });

  return (
    <SectionDialogBase<FormValues>
      id="info-languages"
      form={form}
      defaultValues={defaultLanguage}
      isOpen={isOpen}
      mode={mode}
      payload={payload}
      section={section}
      deleteDescription={t`This action cannot be undone.`}
      setValue={setValue}
      onClose={close}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t`Name`}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="description"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t`Description`}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t`Native Speaker`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="level"
          control={form.control}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{t`Level`}</FormLabel>
              <FormControl className="py-2">
                <div className="flex items-center gap-x-4">
                  <Slider
                    {...field}
                    min={0}
                    max={5}
                    value={[field.value]}
                    orientation="horizontal"
                    onValueChange={(value) => {
                      field.onChange(value[0]);
                    }}
                  />

                  {field.value > 0 ? (
                    <span className="text-base font-bold">{field.value}</span>
                  ) : (
                    <span className="text-base font-bold">{t`Hidden`}</span>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SectionDialogBase>
  );
};

