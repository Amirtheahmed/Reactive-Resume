import type { AnyDialogRendererEntry } from "../schemas";
import { DuplicateResumeDialog, UpdateResumeDialog } from ".";
import { GenerateResumeDialog } from "./generate";

export const resumeDialogRenderers: readonly AnyDialogRendererEntry[] = [
	{ type: "resume.update", render: ({ data }) => <UpdateResumeDialog data={data} /> },
	{ type: "resume.duplicate", render: ({ data }) => <DuplicateResumeDialog data={data} /> },
	{ type: "resume.generate", render: () => <GenerateResumeDialog /> },
];
