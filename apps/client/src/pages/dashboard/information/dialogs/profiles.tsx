// apps/client/src/pages/dashboard/information/dialogs/profiles.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { t, Trans } from "@lingui/macro";
import { defaultProfile, profileSchema } from "@reactive-resume/schema";
import {
  Avatar,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@reactive-resume/ui";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { BrandIcon } from "@/client/components/brand-icon";
import { SectionDialogBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

import { URLInput } from "./shared/url-input";

const formSchema = profileSchema;
type FormValues = z.infer<typeof formSchema>;

export const ProfilesInfoDialog = () => {
  const { isOpen, mode, payload, close } = useDialog<FormValues>("info-profiles");

  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.profiles);

  const form = useForm<FormValues>({
    defaultValues: defaultProfile,
    resolver: zodResolver(formSchema),
  });

  return (
    <SectionDialogBase<FormValues>
      id="info-profiles"
      form={form}
      defaultValues={defaultProfile}
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
          name="network"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t`Network`}</FormLabel>
              <FormControl>
                {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
                <Input {...field} placeholder="GitHub" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="username"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t`Username`}</FormLabel>
              <FormControl>
                <Input {...field} placeholder="john.doe" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="url"
          control={form.control}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{t`Website`}</FormLabel>
              <FormControl>
                <URLInput {...field} placeholder="https://github.com/johndoe" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="icon"
          control={form.control}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel htmlFor="iconSlug">{t`Icon`}</FormLabel>
              <FormControl>
                <div className="flex items-center gap-x-2">
                  <Avatar className="size-8 bg-white p-1.5">
                    <BrandIcon slug={field.value} />
                  </Avatar>
                  <Input {...field} placeholder="github" onChange={field.onChange} />
                </div>
              </FormControl>
              <FormMessage />
              <FormDescription className="ml-10">
                <Trans>
                  Powered by{" "}
                  <a
                    href="https://simpleicons.org/"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="font-medium"
                  >
                    Simple Icons
                  </a>
                </Trans>
              </FormDescription>
            </FormItem>
          )}
        />
      </div>
    </SectionDialogBase>
  );
};

