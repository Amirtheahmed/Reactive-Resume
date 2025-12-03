import { t } from "@lingui/macro";
import { PaperclipIcon, PaperPlaneRightIcon, RobotIcon, UserIcon, XIcon } from "@phosphor-icons/react";
import { Button, ScrollArea, Textarea } from "@reactive-resume/ui";
import { cn } from "@reactive-resume/utils";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { getChat, useChat } from "@/client/services/chat/chat";
import { useUploadChatAttachment } from "@/client/services/storage";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = {
  chatId: string | null;
  onNewChat: (id: string) => void;
};

export const ChatInterface = ({ chatId, onNewChat }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { chat, loading } = useChat();
  const { uploadChatAttachment, loading: uploading } = useUploadChatAttachment();

  const { data: chatData } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => getChat(chatId ?? ""),
    enabled: !!chatId,
  });

  useEffect(() => {
    if (chatData) {
      setMessages(chatData.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })));
    } else if (!chatId) {
      setMessages([]);
    }
  }, [chatData, chatId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !attachment) || loading || uploading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input + (attachment ? `\n[${t`Attachment`}: ${attachment.name}]` : ""),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      let attachmentUrl: string | undefined;

      if (attachment) {
        const url = await uploadChatAttachment(attachment);
        attachmentUrl = url;
      }

      const response = await chat({
        chatId: chatId ?? undefined,
        message: userMessage.content,
        attachmentUrl,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!chatId && response.chatId) {
        onNewChat(response.chatId);
      }
    } catch {
      // Handle error (maybe add a system message)
    }
  };

  return (
    <div className="flex h-full flex-col gap-y-4">
      <ScrollArea ref={scrollRef} className="flex-1 rounded-md border bg-secondary/10 p-4">
        <div className="flex flex-col gap-y-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-y-2 opacity-50">
              <RobotIcon size={48} />
              <p className="text-center text-sm">{t`Ask me anything about your resume or the job description!`}</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "flex max-w-[80%] gap-x-3",
                  message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {message.role === "user" ? <UserIcon size={16} /> : <RobotIcon size={16} />}
                </div>

                <div
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mr-auto flex max-w-[80%] gap-x-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <RobotIcon size={16} />
              </div>
              <div className="flex items-center rounded-lg bg-secondary px-4 py-2 text-secondary-foreground">
                <div className="flex gap-x-1">
                  <div className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                  <div className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                  <div className="size-1.5 animate-bounce rounded-full bg-current" />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      <div className="flex flex-col gap-y-2 rounded-md border bg-background p-2 ring-offset-background focus-within:border-primary focus-within:ring-1 focus-within:ring-ring">
        {attachment && (
          <div className="flex items-center gap-x-2 rounded-md bg-secondary/20 px-3 py-2 text-xs">
            <PaperclipIcon size={14} />
            <span className="flex-1 truncate">{attachment.name}</span>
            <Button
              size="icon"
              variant="ghost"
              className="size-5 rounded-full hover:bg-secondary/40"
              onClick={() => {
                setAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <XIcon size={12} />
            </Button>
          </div>
        )}

        <form
          className="flex items-center gap-x-2"
          onSubmit={handleSubmit}
        >
          <input
            ref={fileInputRef}
            hidden
            type="file"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setAttachment(e.target.files[0]);
              }
            }}
          />

          <Button
            size="icon"
            type="button"
            variant="ghost"
            className="size-8 shrink-0 rounded-full text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <PaperclipIcon size={18} />
          </Button>

          <Textarea
            autoFocus
            value={input}
            placeholder={t`Type your message...`}
            className="min-h-[40px] flex-1 resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
            onChange={(e) => {
              setInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />

          <Button type="submit" size="icon" disabled={loading || uploading || (!input.trim() && !attachment)} className="size-8 shrink-0 rounded-full">
            <PaperPlaneRightIcon size={18} />
          </Button>
        </form>
      </div>
    </div>
  );
};
