// apps/client/src/services/cover-letter/cover-letters.ts
import type { CoverLetterDto } from "@reactive-resume/dto";
import { useQuery } from "@tanstack/react-query";

import { axios } from "@/client/libs/axios";

export const fetchCoverLetters = async () => {
  const response = await axios.get<CoverLetterDto[]>("/cover-letter");
  return response.data;
};

export const useCoverLetters = () => {
  const {
    error,
    isPending: loading,
    data: coverLetters,
  } = useQuery({
    queryKey: ["cover-letters"],
    queryFn: fetchCoverLetters,
  });

  return { coverLetters, loading, error };
};
