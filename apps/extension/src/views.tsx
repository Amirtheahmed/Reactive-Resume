import type { DocumentType, GeneratedDocument, Job } from "./api";
import type { IconName } from "@reactive-resume/ui/components/icon";
import type { ReactNode } from "react";
import { useState } from "react";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { Checkbox } from "@reactive-resume/ui/components/checkbox";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";
import { Label } from "@reactive-resume/ui/components/label";
import { SegmentedControl, SegmentedControlItem } from "@reactive-resume/ui/components/segmented-control";
import { Separator } from "@reactive-resume/ui/components/separator";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { api, ApiError, appUrl, editorUrl } from "./api";

export type ReviewSuggestion = { id: string; label: string; value: string; strategy: string };

type BackButtonProps = { onBack: () => void };

function BackButton({ onBack }: BackButtonProps) {
	return (
		<Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
			<Icon name="arrow_back" size={16} />
			Back
		</Button>
	);
}

type ConnectViewProps = { onConnect: (apiKey: string) => void };

export function ConnectView({ onConnect }: ConnectViewProps) {
	const [value, setValue] = useState("");
	const [checking, setChecking] = useState(false);
	const [error, setError] = useState("");

	const connect = async () => {
		const apiKey = value.trim();
		if (!apiKey) return;

		setChecking(true);
		setError("");
		try {
			await api.profile(apiKey);
			onConnect(apiKey);
		} catch (cause) {
			// 400 means the key works but the Information Bank is still empty: connect, and the panel says so.
			if (cause instanceof ApiError && cause.status === 400) onConnect(apiKey);
			else if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403))
				setError("That API key was not accepted. Check it and try again.");
			else setError("Could not reach Reactive Resume. Is it running?");
		} finally {
			setChecking(false);
		}
	};

	return (
		<form
			className="space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				void connect();
			}}
		>
			<div className="space-y-1">
				<h2 className="text-lg font-semibold">Connect to Reactive Resume</h2>
				<p className="text-sm text-ink-2">Paste an API key with full access to get started.</p>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="api-key">API key</Label>
				<Input
					id="api-key"
					type="password"
					autoComplete="off"
					value={value}
					onChange={(event) => setValue(event.target.value)}
				/>
				{error && <p className="text-xs text-danger-text">{error}</p>}
			</div>

			<Button type="submit" className="w-full" disabled={!value.trim() || checking}>
				{checking ? "Connecting…" : "Connect"}
			</Button>

			<Separator />

			<a
				href={appUrl("/dashboard/settings/ai")}
				target="_blank"
				rel="noreferrer"
				className="text-xs text-accent-text underline-offset-4 hover:underline"
			>
				Create a key in Settings → AI & developer
			</a>
		</form>
	);
}

type ActionCardProps = {
	icon: IconName;
	title: string;
	description: string;
	disabled?: boolean;
	badge?: ReactNode;
	onClick: () => void;
};

function ActionCard({ icon, title, description, disabled = false, badge, onClick }: ActionCardProps) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className="flex w-full items-center gap-4 rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
		>
			<Icon name={icon} size={24} className="text-accent-text" />
			<span className="flex-1">
				<span className="flex items-center gap-2 text-sm font-medium">
					{title}
					{badge}
				</span>
				<span className="block text-xs text-ink-2">{description}</span>
			</span>
		</button>
	);
}

type MainViewProps = {
	job: Job | null;
	busy: string | null;
	filled: number | null;
	hasReview: boolean;
	hasResult: boolean;
	onAnalyze: () => void;
	onAutofill: () => void;
	onGenerate: () => void;
	onClearJob: () => void;
	onOpenReview: () => void;
	onOpenResult: () => void;
};

export function MainView(props: MainViewProps) {
	const { job, busy, filled } = props;

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-2 rounded-md border border-line bg-sunken p-3">
				<div className="space-y-1">
					<span className="text-[10px] font-semibold tracking-wider text-ink-2 uppercase">Current job</span>
					{job ? (
						<p className="text-sm leading-tight font-medium">
							{job.title}
							<span className="block text-xs font-normal text-ink-2">at {job.company}</span>
						</p>
					) : (
						<p className="text-sm text-ink-2">Open a job posting and analyze it.</p>
					)}
				</div>
				{job && (
					<Button variant="ghost" size="icon-xs" title="Clear job" aria-label="Clear job" onClick={props.onClearJob}>
						<Icon name="delete" size={14} />
					</Button>
				)}
			</div>

			<div className="grid gap-3">
				{props.hasReview && (
					<Button variant="secondary" className="justify-start" onClick={props.onOpenReview}>
						<Icon name="bolt" size={16} />
						Return to autofill review
					</Button>
				)}
				{props.hasResult && (
					<Button variant="secondary" className="justify-start" onClick={props.onOpenResult}>
						<Icon name="auto_fix_high" size={16} />
						Return to generated document
					</Button>
				)}

				<ActionCard
					icon="work"
					title="Analyze job posting"
					description="Read the job on this page."
					disabled={busy !== null}
					badge={busy === "analyze" && <Badge>Analyzing…</Badge>}
					onClick={props.onAnalyze}
				/>
				<ActionCard
					icon="bolt"
					title="Autofill page"
					description="Fill this application form. You review every value first."
					disabled={!job || busy !== null}
					badge={
						busy === "autofill" ? (
							<Badge>Working…</Badge>
						) : (
							filled !== null && <Badge variant="accent">Filled {filled}</Badge>
						)
					}
					onClick={props.onAutofill}
				/>
				<ActionCard
					icon="auto_fix_high"
					title="Generate documents"
					description="A tailored resume or cover letter for this job."
					disabled={!job || busy !== null}
					onClick={props.onGenerate}
				/>
			</div>
		</div>
	);
}

type GenerateViewProps = {
	job: Job;
	generating: boolean;
	onChange: (job: Job) => void;
	onGenerate: (type: DocumentType) => void;
	onBack: () => void;
};

export function GenerateView({ job, generating, onChange, onGenerate, onBack }: GenerateViewProps) {
	const [type, setType] = useState<DocumentType>("resume");

	return (
		<div className="space-y-4">
			<BackButton onBack={onBack} />

			<SegmentedControl
				className="w-full"
				aria-label="Document"
				value={type}
				onValueChange={(value) => setType(value as DocumentType)}
			>
				<SegmentedControlItem value="resume">Resume</SegmentedControlItem>
				<SegmentedControlItem value="cover-letter">Cover letter</SegmentedControlItem>
			</SegmentedControl>

			<div className="space-y-1.5">
				<Label htmlFor="job-title">Job title</Label>
				<Input id="job-title" value={job.title} onChange={(event) => onChange({ ...job, title: event.target.value })} />
			</div>
			<div className="space-y-1.5">
				<Label htmlFor="job-company">Company</Label>
				<Input
					id="job-company"
					value={job.company}
					onChange={(event) => onChange({ ...job, company: event.target.value })}
				/>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor="job-description">Description</Label>
				<Textarea
					id="job-description"
					className="max-h-64 min-h-36 text-xs"
					value={job.description}
					onChange={(event) => onChange({ ...job, description: event.target.value })}
				/>
			</div>

			<Button
				className="w-full"
				disabled={generating || !job.title.trim() || !job.description.trim()}
				onClick={() => onGenerate(type)}
			>
				<Icon name="auto_fix_high" size={16} />
				{generating ? "Generating…" : "Generate"}
			</Button>
		</div>
	);
}

type ReviewViewProps = {
	suggestions: ReviewSuggestion[];
	applying: boolean;
	onApply: (chosen: ReviewSuggestion[]) => void;
	/** Point out a field on the page while its row is hovered or focused; null clears it. */
	onHighlight: (id: string | null) => void;
	onBack: () => void;
};

export function ReviewView({ suggestions, applying, onApply, onHighlight, onBack }: ReviewViewProps) {
	const [selected, setSelected] = useState(() => new Set(suggestions.map(({ id }) => id)));

	const toggle = (id: string, checked: boolean) =>
		setSelected((previous) => {
			const next = new Set(previous);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});

	return (
		<div className="space-y-4">
			<BackButton onBack={onBack} />
			<div>
				<h2 className="text-lg font-semibold">Review autofill</h2>
				<p className="text-xs text-ink-2">
					Nothing is written to the page until you apply. Hover a row to see its field on the page, and untick anything
					you don't want or can't find.
				</p>
			</div>

			<ul className="space-y-2">
				{suggestions.map((suggestion) => (
					<li
						key={suggestion.id}
						className="flex items-start gap-3 rounded-md bg-sunken p-3 hover:bg-hover"
						onMouseEnter={() => onHighlight(suggestion.id)}
						onMouseLeave={() => onHighlight(null)}
						onFocus={() => onHighlight(suggestion.id)}
						onBlur={() => onHighlight(null)}
					>
						<Checkbox
							id={suggestion.id}
							className="mt-0.5"
							checked={selected.has(suggestion.id)}
							onCheckedChange={(checked) => toggle(suggestion.id, checked)}
						/>
						<div className="grid flex-1 gap-1">
							<Label htmlFor={suggestion.id}>{suggestion.label || "Untitled field"}</Label>
							<p className="text-xs break-words whitespace-pre-wrap text-ink-2">{suggestion.value}</p>
							<span className="text-[11px] text-ink-3">
								{suggestion.strategy === "HEURISTIC" ? "From your profile" : "Written by AI"}
							</span>
						</div>
					</li>
				))}
			</ul>

			<Button
				className="w-full"
				disabled={applying || selected.size === 0}
				onClick={() => onApply(suggestions.filter(({ id }) => selected.has(id)))}
			>
				{applying ? "Applying…" : `Fill ${selected.size} fields`}
			</Button>
		</div>
	);
}

type ResultViewProps = {
	apiKey: string;
	document: GeneratedDocument;
	onError: (message: string | null) => void;
	onBack: () => void;
};

export function ResultView({ apiKey, document: generated, onError, onBack }: ResultViewProps) {
	const [downloading, setDownloading] = useState(false);

	// The PDF needs the API key, so it is fetched here and handed to the browser as a file.
	const download = async () => {
		setDownloading(true);
		onError(null);
		try {
			const url = URL.createObjectURL(await api.pdf(apiKey, generated));
			const link = Object.assign(document.createElement("a"), { href: url, download: `${generated.name}.pdf` });
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch (cause) {
			onError(cause instanceof Error ? cause.message : "Could not download the PDF.");
		} finally {
			setDownloading(false);
		}
	};

	return (
		<div className="space-y-4">
			<BackButton onBack={onBack} />

			<div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4">
				<Icon name="description" size={28} className="text-accent-text" />
				<div className="space-y-1">
					<p className="text-sm font-medium">{generated.name}</p>
					<Badge variant="accent">{generated.type === "resume" ? "Resume ready" : "Cover letter ready"}</Badge>
				</div>
			</div>

			<div className="grid gap-2">
				<Button disabled={downloading} onClick={() => void download()}>
					<Icon name="download" size={16} />
					{downloading ? "Preparing…" : "Download PDF"}
				</Button>
				<Button
					variant="secondary"
					nativeButton={false}
					render={<a href={editorUrl(generated)} target="_blank" rel="noreferrer" />}
				>
					<Icon name="open_in_new" size={16} />
					Open in editor
				</Button>
			</div>
		</div>
	);
}
