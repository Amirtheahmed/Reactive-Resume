import type { ChatRequestDto, ChatResponseDto } from "@reactive-resume/dto";
import { useMutation } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";

import { axios } from "@/client/libs/axios";

export const chat = async (data: ChatRequestDto) => {
  const response = await axios.post<
    ChatResponseDto,
    AxiosResponse<ChatResponseDto>,
    ChatRequestDto
  >("/chat", data);

  return response.data;
};

export const useChat = () => {
  const {
    error,
    isPending: loading,
    mutateAsync: chatFn,
  } = useMutation({
    mutationFn: chat,
  });

  return { chat: chatFn, loading, error };
};
