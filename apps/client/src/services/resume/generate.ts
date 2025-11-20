// apps/client/src/services/resume/generate.ts
import type { GenerateResumeDto, ResumeDto } from "@reactive-resume/dto";
import { useMutation } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";

import { RESUMES_KEY } from "@/client/constants/query-keys";
import { axios } from "@/client/libs/axios";
import { queryClient } from "@/client/libs/query-client";

export const generateResume = async (data: GenerateResumeDto) => {
  const response = await axios.post<ResumeDto, AxiosResponse<ResumeDto>, GenerateResumeDto>(
    "/resume/generate",
    data,
  );

  return response.data;
};

export const useGenerateResume = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: generateResumeFn,
  } = useMutation({
    mutationFn: generateResume,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: RESUMES_KEY });
      queryClient.setQueryData<ResumeDto>(["resume", { id: data.id }], data);
    },
  });

  return { generateResume: generateResumeFn, loading, error };
};
