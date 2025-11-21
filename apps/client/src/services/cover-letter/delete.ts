// apps/client/src/services/cover-letter/delete.ts
import type { CoverLetterDto } from "@reactive-resume/dto";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { axios } from "@/client/libs/axios";

export const deleteCoverLetter = async (id: string) => {
  const response = await axios.delete<CoverLetterDto>(`/cover-letter/${id}`);
  return response.data;
};

export const useDeleteCoverLetter = () => {
  const queryClient = useQueryClient();

  const {
    error,
    isPending: loading,
    mutateAsync: deleteCoverLetterFn,
  } = useMutation({
    mutationFn: deleteCoverLetter,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["cover-letters"] });
      queryClient.removeQueries({ queryKey: ["cover-letter", data.id] });
    },
  });

  return { deleteCoverLetter: deleteCoverLetterFn, loading, error };
};
