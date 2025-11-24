import type { OpenAIConfigDto, UpdateUserDto, UserDto } from "@reactive-resume/dto";
import { useMutation } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";

import { axios } from "@/client/libs/axios";
import { queryClient } from "@/client/libs/query-client";

export const updateUser = async (data: UpdateUserDto) => {
  const response = await axios.patch<UserDto, AxiosResponse<UserDto>, UpdateUserDto>(
    "/user/me",
    data,
  );

  return response.data;
};

export const useUpdateUser = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: updateUserFn,
  } = useMutation({
    mutationFn: updateUser,
    onSuccess: (data) => {
      queryClient.setQueryData(["user"], data);
    },
  });

  return { updateUser: updateUserFn, loading, error };
};

export const updateAiSettings = async (data: OpenAIConfigDto) => {
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  const response = await axios.patch<void>("/user/me/ai-settings", data);
  return response.data;
};

export const useUpdateAiSettings = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: updateAiSettingsFn,
  } = useMutation({
    mutationFn: updateAiSettings,
    onSuccess: async () => {
      // Invalidate the user query to refetch the user with updated secrets
      await queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  return { updateAiSettings: updateAiSettingsFn, loading, error };
};
