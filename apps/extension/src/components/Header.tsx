// apps/extension/src/components/Header.tsx
import { ArrowSquareOutIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui";

type Props = {
  showDisconnect: boolean;
  onDisconnect: () => void;
};

export const Header = ({ showDisconnect, onDisconnect }: Props) => (
  <header className="flex items-center justify-between p-4 pb-2">
    <div className="flex items-center gap-2">
      {showDisconnect ? (
        <CheckCircleIcon size={20} className="text-success" weight="fill" />
      ) : (
        <img src="/icons/icon32.png" alt="Logo" className="size-5" />
      )}
      <h1 className="text-sm font-bold">Reactive Resume Copilot</h1>
    </div>
    {showDisconnect && (
      <Button variant="ghost" size="icon" onClick={onDisconnect} title="Disconnect">
        <ArrowSquareOutIcon />
      </Button>
    )}
  </header>
);
