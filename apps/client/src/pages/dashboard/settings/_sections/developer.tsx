import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/macro";
import { CopySimpleIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { createApiKeySchema } from "@reactive-resume/dto";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from "@reactive-resume/ui";
import dayjs from "dayjs";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { useToast } from "@/client/hooks/use-toast";
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "@/client/services/api-key";

type FormValues = z.infer<typeof createApiKeySchema>;

export const DeveloperSettings = () => {
  const { toast } = useToast();
  const { apiKeys, loading } = useApiKeys();
  const { createApiKey, loading: createLoading } = useCreateApiKey();
  const { deleteApiKey, loading: deleteLoading } = useDeleteApiKey();

  const [isOpen, setIsOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (data: FormValues) => {
    const result = await createApiKey(data);
    setNewKey(result.secretKey);
    form.reset();
  };

  const onDelete = async (id: string) => {
    await deleteApiKey(id);
    toast({ variant: "success", title: t`API Key deleted successfully.` });
  };

  const onCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ variant: "success", title: t`Copied to clipboard` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold leading-relaxed tracking-tight">{t`Developer`}</h3>
        <p className="leading-relaxed opacity-75">
          {t`Manage API keys to access Reactive Resume programmatically or connect the Browser Extension.`}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t`Name`}</TableHead>
              <TableHead>{t`Created`}</TableHead>
              <TableHead>{t`Last Used`}</TableHead>
              <TableHead className="text-right">{t`Actions`}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center opacity-50">
                  {t`Loading...`}
                </TableCell>
              </TableRow>
            )}
            {!loading && apiKeys?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center opacity-50">
                  {t`No API keys found.`}
                </TableCell>
              </TableRow>
            )}
            {apiKeys?.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
                <TableCell>{dayjs(key.createdAt).format("MMM D, YYYY")}</TableCell>
                <TableCell>
                  {key.lastUsed ? dayjs(key.lastUsed).fromNow() : t`Never`}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-error"
                    disabled={deleteLoading}
                    onClick={() => onDelete(key.id)}
                  >
                    <TrashSimpleIcon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setNewKey(null);
      }}>
        <DialogTrigger asChild>
          <Button>
            <PlusIcon className="mr-2" />
            {t`Create New Key`}
          </Button>
        </DialogTrigger>
        <DialogContent>
          {newKey ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{t`API Key Created`}</DialogTitle>
                <DialogDescription>
                  {t`Please copy your new API key now. You won't be able to see it again!`}
                </DialogDescription>
              </DialogHeader>

              <Alert variant="success" className="break-all font-mono">
                <AlertTitle className="flex items-center justify-between">
                  {t`Secret Key`}
                  <Tooltip content={t`Copy`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => onCopy(newKey)}
                    >
                      <CopySimpleIcon />
                    </Button>
                  </Tooltip>
                </AlertTitle>
                <AlertDescription className="mt-2 text-xs sm:text-sm">
                  {newKey}
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button onClick={() => { setIsOpen(false); }}>{t`Done`}</Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <DialogHeader>
                  <DialogTitle>{t`Create API Key`}</DialogTitle>
                  <DialogDescription>
                    {t`Enter a name for your new API key to identify it later.`}
                  </DialogDescription>
                </DialogHeader>

                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t`Name`}</FormLabel>
                      <FormControl>
                        <Input placeholder="Browser Extension" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={createLoading}>
                    {t`Create`}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
