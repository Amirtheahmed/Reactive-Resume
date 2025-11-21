// apps/client/src/services/cover-letter/update.ts
import type { CoverLetterDto,UpdateCoverLetterDto } from "@reactive-resume/dto";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import debounce from "lodash.debounce";

import { axios } from "@/client/libs/axios";

export const updateCoverLetter = async ({ id, ...data }: { id: string } & UpdateCoverLetterDto) => {
  const response = await axios.patch<CoverLetterDto>(`/cover-letter/${id}`, data);
  return response.data;
};

export const useUpdateCoverLetter = () => {
  const queryClient = useQueryClient();

  const {
    error,
    isPending: loading,
    mutateAsync: updateCoverLetterFn,
  } = useMutation({
    mutationFn: updateCoverLetter,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["cover-letters"] });
      queryClient.setQueryData(["cover-letter", data.id], data);
    },
  });

  return { updateCoverLetter: updateCoverLetterFn, loading, error };
};

export const debouncedUpdateCoverLetter = debounce(updateCoverLetter, 500);
