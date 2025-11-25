// apps/extension/src/views/ReviewView.tsx
import { ArrowLeftIcon, SparkleIcon, UserIcon } from "@phosphor-icons/react";
import { Button, Checkbox, Label, ScrollArea, Separator } from "@reactive-resume/ui";
import { useState } from "react";

type Suggestion = {
  id: string;
  label?: string;
  value: string;
  strategy: "HEURISTIC" | "AI_MAPPED" | "AI_GENERATED";
};

type Props = {
  suggestions: Suggestion[];
  onApply: (map: { id: string; value: string }[]) => void;
  onBack: () => void;
  loading: boolean;
};

export const ReviewView = ({ suggestions, onApply, onBack, loading }: Props) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => suggestions.map((s) => s.id));

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleApply = () => {
    const map = suggestions
      .filter((s) => selectedIds.includes(s.id))
      .map(({ id, value }) => ({ id, value }));
    onApply(map);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-x-2">
        <Button variant="ghost" size="icon" className="-ml-2 h-8 w-8" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
        <div>
          <h2 className="text-lg font-bold">Review Autofill</h2>
          <p className="text-xs text-muted-foreground">
            Deselect any fields you don't want to fill.
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-start space-x-3 rounded-md bg-secondary/30 p-3"
            >
              <Checkbox
                id={suggestion.id}
                checked={selectedIds.includes(suggestion.id)}
                onCheckedChange={() => handleToggle(suggestion.id)}
                className="mt-1"
              />
              <div className="grid flex-1 gap-1.5 leading-none">
                <Label htmlFor={suggestion.id} className="font-semibold">
                  {suggestion.label || "Untitled Field"}
                </Label>
                <p className="text-xs text-muted-foreground">{suggestion.value}</p>
                <div className="mt-1 flex items-center gap-x-1.5 text-xs text-muted-foreground">
                  {suggestion.strategy.startsWith("AI") ? (
                    <SparkleIcon weight="bold" className="text-warning" />
                  ) : (
                    <UserIcon weight="bold" className="text-success" />
                  )}
                  <span>
                    {suggestion.strategy === "HEURISTIC"
                      ? "Matched Locally"
                      : "Matched with AI"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator className="my-4" />

      <Button onClick={handleApply} disabled={loading || selectedIds.length === 0}>
        {loading ? "Applying..." : `Apply ${selectedIds.length} Fields`}
      </Button>
    </div>
  );
};
