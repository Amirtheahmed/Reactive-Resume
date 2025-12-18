// apps/client/src/pages/dashboard/information/dialogs/interests.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { XIcon } from "@phosphor-icons/react";
import { defaultInterest, interestSchema } from "@reactive-resume/schema";
import {
  Badge,
  BadgeInput,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@reactive-resume/ui";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { SectionDialogBase } from "@/client/components/sections";
import { useDialog } from "@/client/stores/dialog";
import { useInformationStore } from "@/client/stores/information";

const formSchema = interestSchema;
type FormValues = z.infer<typeof formSchema>;

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
};

export const InterestsInfoDialog = () => {
  const { isOpen, mode, payload, close } = useDialog<FormValues>("info-interests");

  const setValue = useInformationStore((state) => state.setValue);
  const section = useInformationStore((state) => state.information.data.sections.interests);

  const form = useForm<FormValues>({
    defaultValues: defaultInterest,
    resolver: zodResolver(formSchema),
  });

  const [pendingKeyword, setPendingKeyword] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDrop = (
    e: React.DragEvent,
    dropIndex: number,
    field: { value: string[]; onChange: (value: string[]) => void },
  ) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newKeywords = [...field.value];
    const [draggedItem] = newKeywords.splice(draggedIndex, 1);
    newKeywords.splice(dropIndex, 0, draggedItem);

    field.onChange(newKeywords);
    setDraggedIndex(null);
  };

  return (
    <SectionDialogBase<FormValues>
      id="info-interests"
      form={form}
      defaultValues={defaultInterest}
      pendingKeyword={pendingKeyword}
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
            <FormItem className="sm:col-span-2">
              <FormLabel>{t`Name`}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="keywords"
          control={form.control}
          render={({ field }) => (
            <div className="space-y-3 sm:col-span-2">
              <FormItem>
                <FormLabel>{t`Keywords`}</FormLabel>
                <FormControl>
                  <BadgeInput {...field} setPendingKeyword={setPendingKeyword} />
                </FormControl>
                <FormDescription>
                  {t`You can add multiple keywords by separating them with a comma or pressing enter.`}
                </FormDescription>
                <FormMessage />
              </FormItem>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
                <AnimatePresence>
                  {field.value.map((item, index) => (
                    <motion.div
                      key={item}
                      layout
                      draggable
                      className="cursor-move"
                      initial={{ opacity: 0, y: -50 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.1 } }}
                      exit={{ opacity: 0, x: -50 }}
                      onDragOver={handleDragOver}
                      onDragStart={() => {
                        setDraggedIndex(index);
                      }}
                      onDrop={(e) => {
                        handleDrop(e, index, field);
                      }}
                    >
                      <Badge
                        className="cursor-pointer"
                        onClick={() => {
                          field.onChange(field.value.filter((_, i) => i !== index));
                        }}
                      >
                        {item}
                        <XIcon size={12} weight="bold" className="ml-1" />
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        />
      </div>
    </SectionDialogBase>
  );
};

