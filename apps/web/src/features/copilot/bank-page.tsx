import type { InformationBank } from "@reactive-resume/schema/resume/information-bank";
import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useBlocker, useRouteContext } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BANK_SECTIONS, importResume, isEmptyBank } from "@reactive-resume/schema/resume/information-bank";
import { Button } from "@reactive-resume/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { Icon } from "@reactive-resume/ui/components/icon";
import { IconButton } from "@reactive-resume/ui/components/icon-button";
import { Input } from "@reactive-resume/ui/components/input";
import { toast } from "@reactive-resume/ui/components/toast";
import { generateId } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import { BankEntries, BankNotes } from "./bank-cards";
import { useBankStore } from "./bank-store";
import { SaveStatus } from "./save-status";
import { useDialogStore } from "@/dialogs/store";
import { TextField, validateEmail, WebsiteField } from "@/features/resume/editor/write/fields";
import { ADD_LABELS } from "@/features/resume/editor/write/outline";
import { RichTextEditor } from "@/features/resume/editor/write/rich-text-editor";
import { getOrpcErrorMessage } from "@/libs/error-message";
import { client, orpc } from "@/libs/orpc/client";
import { getSectionTitle } from "@/libs/resume/section";

// Fork feature: the Information Bank page. Everything about the user's career in one place, with no template
// or layout: tailored resumes, cover letters and form answers are written from it.

const anchor = (id: string) => `bank-${id}`;

/** How many times the page has been opened, so a save that ends after a return doesn't clear the new visit. */
let visits = 0;

/** Loads the bank into the editor, and saves what's pending before the page is left. */
function useBankSession() {
	const userId = useRouteContext({ from: "/dashboard" }).session.user.id;
	// Keyed by account as well: a bank cached for whoever was signed in before is never shown to someone else.
	const { data, error } = useQuery({
		queryKey: [...orpc.copilot.bank.get.queryKey(), userId],
		queryFn: () => client.copilot.bank.get(),
		staleTime: 0,
	});

	// The editor owns the bank from here. A later fetch only replaces it when it's newer and nothing is unsaved,
	// so an answer that was already on its way can't put older text back.
	useEffect(() => {
		useBankStore.getState().claim(userId);
		if (!data) return;
		const { bank, owner, revision, dirty } = useBankStore.getState();
		if (!bank || owner !== userId || (!dirty && data.revision > revision)) {
			useBankStore.getState().load(data.data, data.revision);
		}
	}, [data, userId]);

	useBlocker({
		shouldBlockFn: async () => {
			const saved = await useBankStore.getState().flush();
			const { dirty, status } = useBankStore.getState();
			// After a conflict no retry can succeed, so leaving is allowed: the page already says what to do.
			if (!saved && dirty && status !== "conflict") {
				toast.add({ type: "error", description: t`Couldn't save your changes. Try again before continuing.` });
				return true;
			}
			return false;
		},
		// A save still on its way counts too: the browser would cancel it.
		enableBeforeUnload: () => useBankStore.getState().dirty || useBankStore.getState().status === "saving",
	});

	// Leaving saves what's pending. Once it is saved the bank is let go, so nothing of it outlives the page;
	// unsaved edits stay for a retry, unless the page has been opened again in the meantime.
	useEffect(() => {
		visits += 1;
		const visit = visits;
		return () => {
			void useBankStore
				.getState()
				.flush()
				.then((saved) => {
					if (saved && visits === visit) useBankStore.getState().reset();
				});
		};
	}, []);

	return { error, userId };
}

async function reloadBank() {
	try {
		const { data, revision } = await client.copilot.bank.get();
		useBankStore.getState().load(data, revision);
	} catch (error) {
		toast.add({ type: "error", description: getOrpcErrorMessage(error, { fallback: t`Couldn't reload. Try again.` }) });
	}
}

function BankSaveStatus() {
	const status = useBankStore((state) => state.status);
	return (
		<SaveStatus
			status={status}
			onRetry={() => void useBankStore.getState().flush()}
			onReload={() => void reloadBank()}
		/>
	);
}

/**
 * Takes back an import without touching anything edited since: the entries and notes it added go, and a
 * contact detail or the summary returns to what it was only if it still holds what the import put there.
 */
function undoImport(draft: InformationBank, before: InformationBank, imported: InformationBank) {
	const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
	const added = (was: { id: string }[], now: { id: string }[]) => {
		const kept = new Set(was.map((row) => row.id));
		return new Set(now.filter((row) => !kept.has(row.id)).map((row) => row.id));
	};

	for (const key of BANK_SECTIONS) {
		const gone = added(before.sections[key], imported.sections[key]);
		const rows = draft.sections[key] as { id: string }[];
		(draft.sections[key] as { id: string }[]) = rows.filter((row) => !gone.has(row.id));
	}
	const goneNotes = added(before.notes, imported.notes);
	draft.notes = draft.notes.filter((note) => !goneNotes.has(note.id));

	const basics = draft.basics as Record<string, unknown>;
	for (const [field, value] of Object.entries(imported.basics)) {
		if (same(basics[field], value)) basics[field] = (before.basics as Record<string, unknown>)[field];
	}
	if (draft.summary === imported.summary) draft.summary = before.summary;
}

type ImportDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

/** Adds a resume's entries to the bank. Entries already there are skipped, and one Undo takes it all back. */
function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
	const { data: documents } = useQuery({
		...orpc.documents.list.queryOptions({ input: { trashed: false } }),
		enabled: open,
	});
	const allResumes = (documents ?? []).filter((document) => document.type === "resume");
	// Tailored resumes were written from the bank by an AI: importing one would feed its wording back in as fact.
	const resumes = allResumes.filter((resume) => !resume.tags.includes("tailored"));
	const [selectedId, setSelectedId] = useState<string>();
	const [busy, setBusy] = useState(false);
	const selected = resumes.find((resume) => resume.id === selectedId) ?? resumes[0];

	const run = async () => {
		const before = useBankStore.getState().bank;
		if (!selected || !before) return;
		setBusy(true);
		try {
			const resume = await client.resume.getById({ id: selected.id });
			const { edit, owner } = useBankStore.getState();
			// Built from the saved state: importResume clones its input, and an immer draft can't be cloned.
			const next = importResume(before, resume.data);
			edit(() => next);
			onOpenChange(false);
			toast.add({
				description: t`Added what “${selected.name}” had that the bank didn't.`,
				actionProps: {
					children: t`Undo`,
					// Not if someone else's bank has been loaded since.
					onClick: () => useBankStore.getState().owner === owner && edit((draft) => undoImport(draft, before, next)),
				},
			});
		} catch (error) {
			toast.add({
				type: "error",
				description: getOrpcErrorMessage(error, { fallback: t`Couldn't read that resume. Try again.` }),
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>Import from a resume</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>
							Adds the resume's entries to your Information Bank and turns its free-text sections into notes. Your
							contact details and summary are only filled in where they are empty. The resume itself is not changed.
						</Trans>
					</DialogDescription>
				</DialogHeader>

				{documents && resumes.length === 0 && (
					<p className="text-sm text-ink-2">
						<Trans>You don't have a resume to import from yet.</Trans>
					</p>
				)}
				<div className="grid max-h-64 gap-1 overflow-y-auto">
					{resumes.map((resume) => (
						<label
							key={resume.id}
							className={cn(
								"relative flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 transition-colors duration-quick",
								resume.id === selected?.id ? "border-accent bg-accent-soft" : "border-line hover:bg-hover",
							)}
						>
							<input
								type="radio"
								name="bank-import-source"
								className="sr-only"
								checked={resume.id === selected?.id}
								onChange={() => setSelectedId(resume.id)}
							/>
							<Icon name="description" className="text-ink-2" />
							<span className="truncate text-sm font-medium">{resume.name}</span>
						</label>
					))}
				</div>

				{resumes.length < allResumes.length && (
					<p className="text-xs text-ink-3">
						<Trans>Resumes tailored from the bank are not listed.</Trans>
					</p>
				)}

				<DialogFooter>
					<Button disabled={!selected || busy} onClick={() => void run()}>
						<Trans>Import</Trans>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

type BankSectionProps = { id: string; title: string; description?: ReactNode; children: ReactNode };

function Section({ id, title, description, children }: BankSectionProps) {
	return (
		<section id={anchor(id)} className="grid scroll-mt-20 gap-3 border-t border-line pt-6 first:border-t-0 first:pt-0">
			<div className="grid gap-0.5">
				<h2 className="text-[17px] font-semibold">{title}</h2>
				{description && <p className="text-sm text-ink-3">{description}</p>}
			</div>
			{children}
		</section>
	);
}

function Basics() {
	const basics = useBankStore((state) => state.bank?.basics);
	const edit = useBankStore((state) => state.edit);
	if (!basics) return null;

	const text = (field: "name" | "headline" | "email" | "phone" | "location") => ({
		value: basics[field],
		onChange: (value: string) =>
			edit((draft) => {
				draft.basics[field] = value;
			}),
	});

	return (
		<div className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
			<TextField label={<Trans>Name</Trans>} autoComplete="name" {...text("name")} />
			<TextField label={<Trans>Headline</Trans>} {...text("headline")} />
			<TextField label={<Trans>Email</Trans>} type="email" validate={validateEmail} {...text("email")} />
			<TextField label={<Trans>Phone</Trans>} type="tel" {...text("phone")} />
			<TextField label={<Trans>Location</Trans>} wide {...text("location")} />
			<WebsiteField
				label={<Trans>Website</Trans>}
				allowInlineLink={false}
				value={basics.website}
				onChange={({ url, label }) =>
					edit((draft) => {
						draft.basics.website = { url, label };
					})
				}
			/>

			<div className="col-span-full grid gap-2">
				<span className="text-[13px] leading-4 font-medium">
					<Trans>Other contact details</Trans>
				</span>
				{basics.customFields.map((field, index) => {
					const write = (key: "text" | "link", value: string) =>
						edit((draft) => {
							const target = draft.basics.customFields[index];
							if (target) target[key] = value;
						});
					return (
						<div key={field.id} className="flex items-center gap-2">
							<Input
								aria-label={t`Contact detail ${index + 1}, text`}
								placeholder={t`Text, like github.com/you`}
								value={field.text}
								onChange={(event) => write("text", event.target.value)}
							/>
							<Input
								aria-label={t`Contact detail ${index + 1}, link`}
								placeholder={t`Link (optional)`}
								value={field.link}
								onChange={(event) => write("link", event.target.value)}
							/>
							<IconButton
								icon="close"
								label={t`Remove contact detail ${index + 1}`}
								size="icon-sm"
								className="shrink-0 text-ink-2"
								onClick={() =>
									edit((draft) => {
										draft.basics.customFields.splice(index, 1);
									})
								}
							/>
						</div>
					);
				})}
				<Button
					variant="ghost"
					size="sm"
					className="w-fit text-ink-2"
					onClick={() =>
						edit((draft) => {
							draft.basics.customFields.push({ id: generateId(), icon: "", text: "", link: "" });
						})
					}
				>
					<Icon name="add" size={16} />
					<Trans>Add contact detail</Trans>
				</Button>
			</div>
		</div>
	);
}

function Summary() {
	const summary = useBankStore((state) => state.bank?.summary);
	const edit = useBankStore((state) => state.edit);
	if (summary === undefined) return null;

	return (
		<RichTextEditor
			label={t`Summary`}
			improve={false}
			value={summary}
			onChange={(html) =>
				edit((draft) => {
					draft.summary = html;
				})
			}
		/>
	);
}

type NavRow = { id: string; title: string; count?: number };

/** Jumps to a section. A list down the side on wide screens, a row that scrolls sideways on narrow ones. */
type SectionNavProps = { rows: NavRow[] };

function SectionNav({ rows }: SectionNavProps) {
	const [current, setCurrent] = useState(rows[0]?.id);
	const ids = rows.map((row) => row.id).join();

	// A jump from the list names its target at once; the scrolling that follows mustn't pass through the others.
	const jumped = useRef(0);

	// The section being read is the last one whose heading has passed the upper part of the view. At the very
	// bottom that is the last section, which may be too short to ever get that high.
	useEffect(() => {
		const sections = ids.split(",").flatMap((id) => {
			const element = document.getElementById(anchor(id));
			return element ? [{ id, element }] : [];
		});
		const first = sections[0]?.element;
		const update = (event: Event) => {
			// Only the page's own scrolling counts, not a list or an editor scrolling inside it.
			const scrolled = event.target;
			if (scrolled !== document && !(scrolled instanceof Node && first && scrolled.contains(first))) return;
			if (Date.now() - jumped.current < 1000) return;
			const line = window.innerHeight * 0.4;
			const last = sections.at(-1);
			const atEnd = last ? last.element.getBoundingClientRect().bottom <= window.innerHeight + 8 : false;
			const reading = atEnd ? last : sections.findLast(({ element }) => element.getBoundingClientRect().top <= line);
			setCurrent((reading ?? sections[0])?.id);
		};
		// Captured, because the page scrolls inside the app shell and scroll events don't bubble.
		window.addEventListener("scroll", update, { capture: true, passive: true });
		return () => window.removeEventListener("scroll", update, { capture: true });
	}, [ids]);

	// On narrow screens the list is a row that scrolls sideways: keep the current section's name in it.
	const nav = useRef<HTMLElement>(null);
	useEffect(() => {
		const row = nav.current;
		const pill = row?.querySelector<HTMLElement>(`[data-section="${current}"]`);
		if (!row || !pill || row.scrollWidth <= row.clientWidth) return;
		row.scrollTo({ left: pill.offsetLeft - row.clientWidth / 2 + pill.offsetWidth / 2, behavior: "smooth" });
	}, [current]);

	return (
		<nav
			ref={nav}
			aria-label={t`Sections`}
			className="sticky top-0 z-10 -mx-1 flex [scrollbar-width:none] gap-1 overflow-x-auto bg-bg px-1 py-2 lg:top-6 lg:mx-0 lg:grid lg:content-start lg:gap-0.5 lg:self-start lg:overflow-visible lg:p-0"
		>
			{rows.map((row) => (
				<button
					key={row.id}
					type="button"
					data-section={row.id}
					aria-current={row.id === current ? "true" : undefined}
					onClick={() => {
						jumped.current = Date.now();
						setCurrent(row.id);
						document.getElementById(anchor(row.id))?.scrollIntoView({ behavior: "smooth", block: "start" });
					}}
					className={cn(
						"flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-start text-sm transition-colors duration-quick",
						row.id === current ? "bg-sunken font-medium text-ink" : "text-ink-2 hover:bg-hover hover:text-ink",
					)}
				>
					<span className="flex-1 whitespace-nowrap">{row.title}</span>
					{row.count !== undefined && (
						<span className={cn("font-mono text-xs", row.count ? "text-ink-2" : "text-ink-3")}>{row.count}</span>
					)}
				</button>
			))}
		</nav>
	);
}

export function InformationBankPage() {
	const { i18n } = useLingui();
	const { error, userId } = useBankSession();
	const loaded = useBankStore((state) => state.bank !== null && state.owner === userId);
	const counts = useBankStore(
		(state) => state.bank && BANK_SECTIONS.map((key) => state.bank?.sections[key].length).join(),
	);
	const noteCount = useBankStore((state) => state.bank?.notes.length ?? 0);
	const empty = useBankStore((state) => state.owner === userId && state.bank !== null && isEmptyBank(state.bank));
	const [importing, setImporting] = useState(false);

	// After a conflict nothing typed is taken, wherever on the page that happens: say so there, once.
	const blocked = useBankStore((state) => state.blocked);
	useEffect(() => {
		if (!blocked) return;
		toast.add({
			id: "bank-conflict",
			type: "error",
			description: t`This was changed somewhere else, so nothing new is being saved. Reload to carry on.`,
			actionProps: { children: t`Reload`, onClick: () => void reloadBank() },
		});
	}, [blocked]);

	const sectionCounts = (counts ?? "").split(",").map(Number);
	const rows: NavRow[] = [
		{ id: "basics", title: getSectionTitle("basics") },
		{ id: "summary", title: getSectionTitle("summary") },
		...BANK_SECTIONS.map((key, index) => ({ id: key, title: getSectionTitle(key), count: sectionCounts[index] ?? 0 })),
		{ id: "notes", title: t`Notes`, count: noteCount },
	];

	const tailor = async () => {
		// The dialog reads the saved bank, so what was just typed goes first.
		if (await useBankStore.getState().flush()) useDialogStore.getState().openDialog("resume.generate", undefined);
		else toast.add({ type: "error", description: t`Couldn't save your changes. Try again before continuing.` });
	};

	return (
		<div className="mx-auto grid w-full max-w-[1080px] content-start gap-5 px-8 py-8 max-sm:px-4 max-sm:py-5">
			<header className="flex flex-wrap items-start justify-between gap-3 lg:flex-nowrap">
				<div className="grid min-w-0 gap-1">
					<h1 className="font-display text-[30px] leading-9 font-medium">
						<Trans>Information Bank</Trans>
					</h1>
					<p className="max-w-[60ch] text-sm text-ink-2">
						<Trans>
							Everything you could put on a resume, in as much detail as you like. Tailored resumes, cover letters and
							form answers are written from it. It is never printed or shared as it is.
						</Trans>
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:flex-nowrap">
					{loaded && <BankSaveStatus />}
					<Button variant="secondary" disabled={!loaded} onClick={() => setImporting(true)}>
						<Icon name="upload_file" size={18} />
						<Trans>Import from a resume</Trans>
					</Button>
					<Button disabled={!loaded} onClick={() => void tailor()}>
						<Icon name="auto_fix_high" size={18} />
						<Trans>Tailor a resume to a job</Trans>
					</Button>
				</div>
			</header>

			{!loaded && error && (
				<p role="alert" className="text-sm text-danger-text">
					{getOrpcErrorMessage(error, {
						fallback: t`Couldn't load your Information Bank. Reload the page to try again.`,
					})}
				</p>
			)}

			{empty && (
				<button
					type="button"
					onClick={() => setImporting(true)}
					className="flex items-start gap-4 rounded-xl border-[1.5px] border-dashed border-line-2 p-5 text-start transition-[background-color,border-color,scale] duration-quick ease-enter hover:border-accent hover:bg-accent-soft active:scale-[0.98]"
				>
					<span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-sunken text-ink-2">
						<Icon name="upload_file" size={24} />
					</span>
					<span className="grid gap-1">
						<span className="text-[15px] font-semibold">
							<Trans>Start from a resume you already have</Trans>
						</span>
						<span className="text-[13px] leading-[19px] text-ink-2">
							<Trans>
								Import one to fill every section at once, then add what a single resume never had room for. Or just
								start typing below.
							</Trans>
						</span>
					</span>
				</button>
			)}

			{loaded && (
				<div className="grid gap-x-8 gap-y-2 lg:grid-cols-[200px_minmax(0,1fr)]">
					<SectionNav rows={rows} />

					<div className="grid min-w-0 content-start gap-6">
						<Section id="basics" title={getSectionTitle("basics")}>
							<Basics />
						</Section>
						<Section
							id="summary"
							title={getSectionTitle("summary")}
							description={
								<Trans>Who you are professionally. Long is fine: each resume gets its own short version.</Trans>
							}
						>
							<Summary />
						</Section>
						{BANK_SECTIONS.map((key) => (
							<Section
								key={key}
								id={key}
								title={getSectionTitle(key)}
								description={
									key === "references" ? (
										<Trans>Kept for your resumes only. Referees' details are never sent to an AI or a form.</Trans>
									) : undefined
								}
							>
								<BankEntries type={key} addLabel={i18n._(ADD_LABELS[key])} />
							</Section>
						))}
						<Section
							id="notes"
							title={t`Notes`}
							description={
								<Trans>
									Facts that fit nowhere above: answers to common application questions, preferences, side projects.
									Notes are read by the AI and never printed. Give a side project its own heading and it can be used as
									a project on a resume.
								</Trans>
							}
						>
							<BankNotes />
						</Section>
					</div>
				</div>
			)}

			<ImportDialog open={importing} onOpenChange={setImporting} />
		</div>
	);
}
