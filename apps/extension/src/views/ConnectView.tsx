// apps/extension/src/views/ConnectView.tsx
import { KeyIcon, PlugIcon } from "@phosphor-icons/react";
import { Button, Input, Label, Separator } from "@reactive-resume/ui";
import { useState } from "react";

import { axios } from "../libs/axios";
import { useAuthStore } from "../store/auth";

export const ConnectView = () => {
  const { setApiKey } = useAuthStore();
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (!inputValue.trim()) return;
    setLoading(true);
    setError("");

    try {
      await axios.get("/extension/me", { headers: { "X-API-Key": inputValue.trim() } });
      setApiKey(inputValue.trim());
    } catch (err) {
      setError("Invalid API Key. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <PlugIcon /> Connect to Reactive Resume
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your API Key from the main app to get started.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <div className="relative">
            <KeyIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="api-key"
              type="password"
              placeholder="rx_..."
              className="pl-9"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-error">{error}</p>}
        </div>

        <Button onClick={handleConnect} className="w-full" disabled={!inputValue || loading}>
          {loading ? "Connecting..." : "Connect Account"}
        </Button>
      </div>

      <Separator className="my-6" />

      <div className="text-xs text-muted-foreground">
        <p>Don't have a key?</p>
        <a
          href="http://localhost:5173/dashboard/settings"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:no-underline"
        >
          Generate one in Settings &rarr; Developer
        </a>
      </div>
    </div>
  );
};
