// apps/client/src/services/cover-letter/create.ts
import type { CoverLetterDto,CreateCoverLetterDto } from "@reactive-resume/dto";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { axios } from "@/client/libs/axios";

export const createCoverLetter = async (data: CreateCoverLetterDto) => {
  const response = await axios.post<CoverLetterDto>("/cover-letter", data);
  return response.data;
};

export const useCreateCoverLetter = () => {
  const queryClient = useQueryClient();

  const {
    error,
    isPending: loading,
    mutateAsync: createCoverLetterFn,
  } = useMutation({
    mutationFn: createCoverLetter,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["cover-letters"] });
      queryClient.setQueryData(["cover-letter", data.id], data);
    },
  });

  return { createCoverLetter: createCoverLetterFn, loading, error };
};
