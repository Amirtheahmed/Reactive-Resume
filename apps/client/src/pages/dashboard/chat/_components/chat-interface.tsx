import { t } from "@lingui/macro";
import { PaperPlaneRightIcon, RobotIcon, UserIcon } from "@phosphor-icons/react";
import { Button, Input, ScrollArea } from "@reactive-resume/ui";
import { cn } from "@reactive-resume/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useChat } from "@/client/services/chat/chat";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Props = {
  jobDescription?: string;
};

export const ChatInterface = ({ jobDescription }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const { chat, loading } = useChat();

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
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await chat({ message: userMessage.content, jobDescription });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      // Handle error (maybe add a system message)
    }
  };

  return (
    <div className="flex h-full flex-col gap-y-4">
      <ScrollArea className="flex-1 rounded-md border bg-secondary/10 p-4">
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

      <form className="flex gap-x-2" onSubmit={handleSubmit}>
        <Input
          autoFocus
          value={input}
          placeholder={t`Type your message...`}
          className="flex-1"
          onChange={(e) => { setInput(e.target.value); }}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <PaperPlaneRightIcon />
        </Button>
      </form>
    </div>
  );
};
