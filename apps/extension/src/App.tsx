import type { DocumentType, GeneratedDocument, Profile } from "./api";
import type { AppliedAutofill, JobAnalysis, PageRequest, PreparedAutofill } from "./content";
import type { ReviewSuggestion } from "./views";
import { useEffect, useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Separator } from "@reactive-resume/ui/components/separator";
import { api, ApiError } from "./api";
import { toQuestions, toSuggestions } from "./autofill";
import { useSessionStore } from "./store";
import { ConnectView, GenerateView, MainView, ResultView, ReviewView } from "./views";

type View = "main" | "generate" | "review" | "result";

async function activeTabId(): Promise<number> {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	if (!tab?.id) throw new Error("Cannot access the current tab.");
	return tab.id;
}

/** Asks the content script in a tab to do something on its page. */
async function askPage<T>(tabId: number, request: PageRequest): Promise<T> {
	const response = (await chrome.tabs.sendMessage(tabId, request).catch(() => undefined)) as
		| (T & { error?: string })
		| undefined;
	if (!response) throw new Error("This page is not ready. Reload it and try again.");
	if (response.error) throw new Error(response.error);
	return response;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.");

export function App() {
	const { apiKey, job, setApiKey, setJob } = useSessionStore();
	const [hydrated, setHydrated] = useState(useSessionStore.persist.hasHydrated());
	const [view, setView] = useState<View>("main");
	const [loaded, setLoaded] = useState<{ apiKey: string; profile: Profile } | null>(null);
	// A profile only counts for the key it was fetched with.
	const profile = loaded && loaded.apiKey === apiKey ? loaded.profile : null;
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState<"analyze" | "autofill" | "apply" | "generate" | null>(null);
	const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);
	// The tab a review was prepared in. Values are only ever sent back to that tab, whichever is in front.
	const [reviewTabId, setReviewTabId] = useState<number | null>(null);
	const [filled, setFilled] = useState<number | null>(null);
	const [result, setResult] = useState<GeneratedDocument | null>(null);

	useEffect(() => useSessionStore.persist.onFinishHydration(() => setHydrated(true)), []);

	// Load the profile whenever there is a key; a rejected key disconnects.
	useEffect(() => {
		if (!apiKey) return;
		let stale = false;
		api
			.profile(apiKey)
			.then((profile) => !stale && setLoaded({ apiKey, profile }))
			.catch((cause: unknown) => {
				if (stale) return;
				if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) setApiKey(null);
				else setError(messageOf(cause));
			});
		return () => {
			stale = true;
		};
	}, [apiKey, setApiKey]);

	/** Runs one action at a time, showing its failure instead of throwing. */
	const run = async (action: NonNullable<typeof busy>, task: () => Promise<void>) => {
		setBusy(action);
		setError(null);
		try {
			await task();
		} catch (cause) {
			setError(messageOf(cause));
		} finally {
			setBusy(null);
		}
	};

	const analyze = () =>
		run("analyze", async () => setJob(await askPage<JobAnalysis>(await activeTabId(), { type: "ANALYZE_JOB" })));

	const prepareAutofill = () =>
		run("autofill", async () => {
			if (!apiKey || !job) return;
			if (!profile) throw new Error('No master resume found. Add the tag "master" to your full resume.');

			const tabId = await activeTabId();
			const { fields, heuristic } = await askPage<PreparedAutofill>(tabId, { type: "PREPARE_AUTOFILL", profile });
			const matched = new Set(heuristic.map(({ id }) => id));
			const questions = toQuestions(fields.filter(({ id }) => !matched.has(id)));
			const answered = questions.length > 0 ? toSuggestions(await api.answer(apiKey, questions, job), fields) : [];

			const all = [...heuristic.map((suggestion) => ({ ...suggestion, strategy: "HEURISTIC" })), ...answered].map(
				(suggestion) => ({ ...suggestion, label: fields.find(({ id }) => id === suggestion.id)?.label ?? "" }),
			);
			if (all.length === 0) throw new Error("Found nothing to fill on this page.");

			setSuggestions(all);
			setReviewTabId(tabId);
			setView("review");
		});

	const applyAutofill = (chosen: ReviewSuggestion[]) =>
		run("apply", async () => {
			if (reviewTabId === null) return;
			const { count } = await askPage<AppliedAutofill>(reviewTabId, {
				type: "APPLY_AUTOFILL",
				suggestions: chosen.map(({ id, value }) => ({ id, value })),
			});
			setFilled(count);
			setSuggestions([]);
			setView("main");
		});

	/** Points out a reviewed field on the page (or clears the pointer). Failing to is not worth an error. */
	const highlight = (id: string | null) => {
		if (reviewTabId !== null) void askPage(reviewTabId, { type: "HIGHLIGHT_FIELD", id }).catch(() => {});
	};

	const generate = (type: DocumentType) =>
		run("generate", async () => {
			if (!apiKey || !job) return;
			setResult(await api.generate(apiKey, type, job));
			setView("result");
		});

	const disconnect = () => {
		setApiKey(null);
		setJob(null);
		setSuggestions([]);
		setResult(null);
		setError(null);
		setView("main");
	};

	if (!hydrated) return null;

	return (
		<div className="flex h-screen flex-col overflow-hidden bg-bg text-ink">
			<header className="flex items-center justify-between px-4 py-2">
				<div className="flex items-center gap-2">
					<img src="/icons/icon32.png" alt="" className="size-5" />
					<h1 className="text-sm font-semibold">Reactive Resume Copilot</h1>
				</div>
				{apiKey && (
					<Button variant="ghost" size="icon-sm" title="Disconnect" aria-label="Disconnect" onClick={disconnect}>
						<Icon name="logout" size={16} />
					</Button>
				)}
			</header>
			<Separator />

			<main className="flex-1 overflow-y-auto p-4">
				{error && (
					<p role="alert" className="mb-4 rounded-md bg-danger-soft p-3 text-xs text-danger-text">
						{error}
					</p>
				)}

				{!apiKey ? (
					<ConnectView onConnect={setApiKey} />
				) : view === "review" ? (
					<ReviewView
						suggestions={suggestions}
						applying={busy === "apply"}
						onApply={applyAutofill}
						onHighlight={highlight}
						onBack={() => {
							highlight(null);
							setView("main");
						}}
					/>
				) : view === "generate" && job ? (
					<GenerateView
						job={job}
						generating={busy === "generate"}
						onChange={setJob}
						onGenerate={generate}
						onBack={() => setView("main")}
					/>
				) : view === "result" && result ? (
					<ResultView apiKey={apiKey} document={result} onError={setError} onBack={() => setView("main")} />
				) : (
					<MainView
						job={job}
						busy={busy}
						filled={filled}
						hasReview={suggestions.length > 0}
						hasResult={result !== null}
						onAnalyze={analyze}
						onAutofill={prepareAutofill}
						onGenerate={() => setView("generate")}
						onClearJob={() => setJob(null)}
						onOpenReview={() => setView("review")}
						onOpenResult={() => setView("result")}
					/>
				)}
			</main>
		</div>
	);
}
