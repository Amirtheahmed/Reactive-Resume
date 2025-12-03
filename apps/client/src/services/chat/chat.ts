import type { ChatDto, ChatRequestDto, ChatResponseDto } from "@reactive-resume/dto";
import { useMutation } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";

import { axios } from "@/client/libs/axios";

export const getChats = async () => {
  const response = await axios.get<ChatDto[]>("/chat");
  return response.data;
};

export const getChat = async (id: string) => {
  const response = await axios.get<ChatDto>(`/chat/${id}`);
  return response.data;
};

export const deleteChat = async (id: string) => {
  const response = await axios.delete(`/chat/${id}`);
  return response.data;
};

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
