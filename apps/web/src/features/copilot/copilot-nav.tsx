import type { IconName } from "@reactive-resume/ui/components/icon";
import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "@reactive-resume/ui/components/icon";
import { toast } from "@reactive-resume/ui/components/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";
import { cn } from "@reactive-resume/utils/style";
import { useDialogStore } from "@/dialogs/store";
import { client } from "@/libs/orpc/client";

// Fork feature: sidebar entries for the Information Bank and for tailoring a resume to a job.
// The Information Bank is the resume tagged "master": the full profile that tailored resumes, cover
// letters and form answers are generated from.

const MASTER_TAG = "master";

/** Opens the Information Bank in the builder, creating it the first time. */
function useOpenInformationBank() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [opening, setOpening] = useState(false);

	const open = async () => {
		if (opening) return;
		setOpening(true);
		try {
			const [existing] = await client.resume.list({ tags: [MASTER_TAG], sort: "lastUpdatedAt" });
			const resumeId =
				existing?.id ??
				(await client.resume.create({ name: "Information Bank", tags: [MASTER_TAG], withSampleData: false }));
			if (!existing) void queryClient.invalidateQueries();
			await navigate({ to: "/builder/$resumeId", params: { resumeId } });
		} catch {
			toast.add({ type: "error", description: t`Could not open the Information Bank. Please try again.` });
		} finally {
			setOpening(false);
		}
	};

	return { open, opening };
}

type CopilotNavProps = {
	/** Icons only, with names in tooltips (the tablet rail). */
	compact?: boolean;
};

export function CopilotNav({ compact = false }: CopilotNavProps) {
	const openDialog = useDialogStore((state) => state.openDialog);
	const { open, opening } = useOpenInformationBank();

	const items: { icon: IconName; label: string; busy?: boolean; onClick: () => void }[] = [
		{ icon: "bookmark", label: t`Information Bank`, busy: opening, onClick: () => void open() },
		{ icon: "auto_fix_high", label: t`Tailor to a job`, onClick: () => openDialog("resume.generate", undefined) },
	];

	return items.map((item) =>
		compact ? (
			<Tooltip key={item.label}>
				<TooltipTrigger
					render={
						<button
							type="button"
							aria-label={item.label}
							aria-busy={item.busy || undefined}
							onClick={item.onClick}
							className="grid size-10 place-items-center rounded-lg text-ink-2 transition-[background-color,color,scale] duration-quick ease-enter hover:bg-hover active:scale-[0.97]"
						/>
					}
				>
					<Icon name={item.icon} />
				</TooltipTrigger>
				<TooltipContent side="right">{item.label}</TooltipContent>
			</Tooltip>
		) : (
			<button
				key={item.label}
				type="button"
				aria-busy={item.busy || undefined}
				onClick={item.onClick}
				className={cn(
					"flex h-[34px] w-full items-center gap-2.5 rounded-lg px-2.5 text-start text-sm text-ink-2 transition-[background-color,color,scale] duration-quick ease-enter hover:bg-hover hover:text-ink active:scale-[0.97]",
					item.busy && "cursor-progress",
				)}
			>
				<Icon name={item.icon} />
				<span className="flex-1">{item.label}</span>
			</button>
		),
	);
}
