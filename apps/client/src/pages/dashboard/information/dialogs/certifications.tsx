// apps/client/src/pages/dashboard/information/dialogs/certifications.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { certificationSchema, defaultCertification } from "@reactive-resume/schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  RichInput,
} from "@reactive-resume/ui";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { SectionDialogBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

import { URLInput } from "./shared/url-input";

const formSchema = certificationSchema;
type FormValues = z.infer<typeof formSchema>;

export const CertificationsInfoDialog = () => {
  const { isOpen, mode, payload, close } = useDialog<FormValues>("info-certifications");

  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.certifications);

  const form = useForm<FormValues>({
    defaultValues: defaultCertification,
    resolver: zodResolver(formSchema),
  });

  return (
    <SectionDialogBase<FormValues>
      id="info-certifications"
      form={form}
      defaultValues={defaultCertification}
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
              <FormLabel>{t({ message: "Name", context: "Name of the Certification" })}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="issuer"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t`Issuer`}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="date"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t`Date`}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t`March 2023`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="url"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t`Website`}</FormLabel>
              <FormControl>
                <URLInput {...field} placeholder="https://udemy.com/certificate/UC-..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="summary"
          control={form.control}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{t`Summary`}</FormLabel>
              <FormControl>
                <RichInput
                  {...field}
                  content={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </SectionDialogBase>
  );
};

