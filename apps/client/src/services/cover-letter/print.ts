// Create apps/client/src/services/cover-letter/print.ts
import { t } from "@lingui/macro";
import type { UrlDto } from "@reactive-resume/dto";
import { useMutation } from "@tanstack/react-query";

import { toast } from "@/client/hooks/use-toast";
import { axios } from "@/client/libs/axios";

export const printCoverLetter = async (data: { id: string }) => {
  const response = await axios.get<UrlDto>(`/cover-letter/print/${data.id}`);
  return response.data;
};

export const usePrintCoverLetter = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: printCoverLetterFn,
  } = useMutation({
    mutationFn: printCoverLetter,
    onError: (error) => {
      toast({
        variant: "error",
        title: t`Oops, the server returned an error.`,
        description: error.message,
      });
    },
  });

  return { printCoverLetter: printCoverLetterFn, loading, error };
};
