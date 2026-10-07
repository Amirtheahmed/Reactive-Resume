import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { cn } from "@reactive-resume/utils/style";
import { ENTER_CLASS } from "@/libs/motion";

// Fork feature: the Information Bank's save indicator. Same wording and markup as the letter editor's
// (routes/builder/letter/-components/letter-bar.tsx), kept as a copy so that upstream file stays untouched.

type SaveStatusProps = {
	/** `conflict`: the document changed somewhere else, so saving stops until it's reloaded. */
	status: "saved" | "saving" | "error" | "conflict";
	onRetry: () => void;
	onReload: () => void;
};

/** Saved, Saving…, Not saved · Retry, or Changed elsewhere · Reload. */
export function SaveStatus({ status, onRetry, onReload }: SaveStatusProps) {
	return (
		<span role="status" aria-live="polite" className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-ink-3">
			{status === "saving" && (
				<>
					<Spinner decorative className="size-3 border-[1.5px]" />
					<Trans>Saving…</Trans>
				</>
			)}
			{status === "saved" && (
				<>
					<Icon name="cloud_done" size={16} />
					<Trans>Saved</Trans>
				</>
			)}
			{status === "error" && (
				<span className={cn(ENTER_CLASS, "flex min-w-0 items-center gap-1.5 text-danger-text")}>
					<Icon name="sync_problem" size={16} />
					<Trans>Not saved</Trans>
					<span aria-hidden="true">·</span>
					<button
						type="button"
						onClick={onRetry}
						aria-label={t`Retry saving`}
						className="rounded-sm font-semibold underline underline-offset-2 hover:opacity-80"
					>
						<Trans>Retry</Trans>
					</button>
				</span>
			)}
			{status === "conflict" && (
				<span className={cn(ENTER_CLASS, "flex min-w-0 items-center gap-1.5 text-warn-text")}>
					<Icon name="sync_problem" size={16} />
					<span className="truncate">
						<Trans>Changed elsewhere</Trans>
					</span>
					<span aria-hidden="true">·</span>
					<button
						type="button"
						onClick={onReload}
						className="rounded-sm font-semibold underline underline-offset-2 hover:opacity-80"
					>
						<Trans>Reload</Trans>
					</button>
				</span>
			)}
		</span>
	);
}
