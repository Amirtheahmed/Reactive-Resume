import { t } from "@lingui/core/macro";
import { Link, useMatchRoute, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";
import { cn } from "@reactive-resume/utils/style";
import { useBankStore } from "./bank-store";
import { useDialogStore } from "@/dialogs/store";

// Fork feature: sidebar entries for the Information Bank (the full profile that tailored resumes, cover
// letters and form answers are generated from) and for tailoring a resume to a job.

const RAIL_CLASS =
	"grid size-10 place-items-center rounded-lg text-ink-2 transition-[background-color,color,scale] duration-quick ease-enter hover:bg-hover active:scale-[0.97]";
const ROW_CLASS =
	"flex h-[34px] w-full items-center gap-2.5 rounded-lg px-2.5 text-start text-sm transition-[background-color,color,scale] duration-quick ease-enter active:scale-[0.97]";
const IDLE_CLASS = "text-ink-2 hover:bg-hover hover:text-ink";
const CURRENT_CLASS = "bg-sunken font-medium text-ink";

type CopilotNavProps = {
	/** Icons only, with names in tooltips (the tablet rail). */
	compact?: boolean;
};

export function CopilotNav({ compact = false }: CopilotNavProps) {
	const openDialog = useDialogStore((state) => state.openDialog);
	// The shell is on every dashboard page, so this is where a change of account is noticed first: a bank still
	// held for the previous one is dropped before anything can show or save it.
	const userId = useRouteContext({ from: "/dashboard" }).session.user.id;
	useEffect(() => useBankStore.getState().claim(userId), [userId]);
	const current = Boolean(useMatchRoute()({ to: "/dashboard/information-bank", fuzzy: true }));
	const bank = t`Information Bank`;
	const tailor = t`Tailor to a job`;
	const openTailor = () => openDialog("resume.generate", undefined);

	if (compact) {
		return (
			<>
				<Tooltip>
					<TooltipTrigger
						render={
							<Link
								to="/dashboard/information-bank"
								aria-label={bank}
								aria-current={current ? "page" : undefined}
								className={cn(RAIL_CLASS, current && "bg-sunken text-ink")}
							/>
						}
					>
						<Icon name="bookmark" filled={current} />
					</TooltipTrigger>
					<TooltipContent side="right">{bank}</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger
						render={<button type="button" aria-label={tailor} onClick={openTailor} className={RAIL_CLASS} />}
					>
						<Icon name="auto_fix_high" />
					</TooltipTrigger>
					<TooltipContent side="right">{tailor}</TooltipContent>
				</Tooltip>
			</>
		);
	}

	return (
		<>
			<Link
				to="/dashboard/information-bank"
				aria-current={current ? "page" : undefined}
				className={cn(ROW_CLASS, current ? CURRENT_CLASS : IDLE_CLASS)}
			>
				<Icon name="bookmark" filled={current} />
				<span className="flex-1">{bank}</span>
			</Link>
			<button type="button" onClick={openTailor} className={cn(ROW_CLASS, IDLE_CLASS)}>
				<Icon name="auto_fix_high" />
				<span className="flex-1">{tailor}</span>
			</button>
		</>
	);
}
