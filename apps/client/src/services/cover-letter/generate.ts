// apps/client/src/services/cover-letter/generate.ts
import type { CoverLetterDto,GenerateCoverLetterDto } from "@reactive-resume/dto";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { axios } from "@/client/libs/axios";

export const generateCoverLetter = async (data: GenerateCoverLetterDto) => {
  const response = await axios.post<CoverLetterDto>("/cover-letter/generate", data);
  return response.data;
};

export const useGenerateCoverLetter = () => {
  const queryClient = useQueryClient();

  const {
    error,
    isPending: loading,
    mutateAsync: generateCoverLetterFn,
  } = useMutation({
    mutationFn: generateCoverLetter,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["cover-letters"] });
      queryClient.setQueryData(["cover-letter", data.id], data);
    },
  });

  return { generateCoverLetter: generateCoverLetterFn, loading, error };
};
