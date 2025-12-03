import { t } from "@lingui/macro";
import { ChatCircleDotsIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button, ScrollArea, Separator, Tooltip } from "@reactive-resume/ui";
import { cn } from "@reactive-resume/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Helmet } from "react-helmet-async";

import { deleteChat, getChats } from "@/client/services/chat/chat";

import { ChatInterface } from "./_components/chat-interface";

export const ChatPage = () => {
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const { data: chats } = useQuery({
    queryKey: ["chats"],
    queryFn: getChats,
  });

  const { mutateAsync: deleteChatFn } = useMutation({
    mutationFn: deleteChat,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
      if (activeChatId) setActiveChatId(null);
    },
  });

  return (
    <>
      <Helmet>
        <title>
          {t`Chat`} - {t`Reactive Resume`}
        </title>
      </Helmet>

      <div className="flex h-[calc(100vh-theme(spacing.24))] flex-col gap-y-4 lg:h-[calc(100vh-theme(spacing.12))] lg:flex-row lg:gap-x-6">
        <div className="flex flex-col gap-y-4 lg:w-1/4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              <ChatCircleDotsIcon size={24} />
              <h1 className="text-2xl font-bold">{t`Chat Assistant`}</h1>
            </div>
            <Tooltip content={t`New Chat`}>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setActiveChatId(null); }}
              >
                <PlusIcon />
              </Button>
            </Tooltip>
          </div>

          <Separator />

          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-y-2 pr-4">
              {chats?.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/50",
                    activeChatId === chat.id && "bg-secondary",
                  )}
                >
                  <button
                    className="flex-1 truncate text-left"
                    onClick={() => { setActiveChatId(chat.id); }}
                  >
                    {chat.title}
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteChatFn(chat.id);
                    }}
                  >
                    <TrashIcon size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Separator orientation="vertical" className="hidden lg:block" />
        <Separator orientation="horizontal" className="lg:hidden" />

        <div className="flex-1 overflow-hidden">
          <ChatInterface chatId={activeChatId} onNewChat={(id: string) => {
            setActiveChatId(id);
            void queryClient.invalidateQueries({ queryKey: ["chats"] });
          }} />
        </div>
      </div>
    </>
  );
};
