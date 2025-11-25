import { cn } from "@reactive-resume/utils";
import { forwardRef } from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex w-full rounded border border-border bg-transparent px-3 py-2 text-sm ring-offset-transparent transition-colors placeholder:opacity-80 hover:bg-secondary/20 focus:border-primary focus:bg-secondary/20 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[120px]", // A reasonable default height
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
