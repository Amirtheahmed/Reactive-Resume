// apps/extension/src/views/ResultView.tsx
import {
  ArticleIcon,
  ArrowSquareOutIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@reactive-resume/ui";

import type { GenerationResult } from "../App";

type Props = {
  result: GenerationResult;
  onReset: () => void;
};

export const ResultView = ({ result, onReset }: Props) => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{result.title}</CardTitle>
        <Badge variant="success" className="mt-2 w-fit">
          Generated Successfully
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-[1/1.4] w-full overflow-hidden rounded-md bg-secondary shadow-inner">
          {result.previewUrl ? (
            <img
              src={result.previewUrl}
              alt="Resume Preview"
              className="size-full object-cover opacity-90"
            />
          ) : (
            <div className="flex size-full items-center justify-center p-4">
              <ArticleIcon size={64} className="text-muted-foreground/30" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-2">
      <Button asChild>
        <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer">
          <DownloadSimpleIcon className="mr-2" /> Download PDF
        </a>
      </Button>
      {result.editorUrl && (
        <Button asChild variant="secondary">
          <a
            href={`http://localhost:5173${result.editorUrl}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ArrowSquareOutIcon className="mr-2" /> Open in Editor
          </a>
        </Button>
      )}
      <Button variant="outline" onClick={onReset}>
        Start Over
      </Button>
    </div>
  </div>
);
