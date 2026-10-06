import type { Profile } from "./api";
import type { FormField, Suggestion } from "./autofill";
import { Readability } from "@mozilla/readability";
import { applyAutofill, extractFormFields, runHeuristics } from "./autofill";

// The content script: the only part of the extension that touches the job page. It answers requests
// from the side panel and never talks to the network or sees the API key.

export type PageRequest =
	| { type: "ANALYZE_JOB" }
	| { type: "PREPARE_AUTOFILL"; profile: Profile }
	| { type: "APPLY_AUTOFILL"; suggestions: Suggestion[] };

export type JobAnalysis = { title: string; company: string; description: string; url: string };
export type PreparedAutofill = { fields: FormField[]; heuristic: Suggestion[] };
export type AppliedAutofill = { count: number };

function hiringOrganization(): string {
	for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
		try {
			const data = JSON.parse(script.textContent ?? "{}") as {
				"@type"?: string;
				hiringOrganization?: { name?: string };
			};
			if (data["@type"] === "JobPosting" && data.hiringOrganization?.name) return data.hiringOrganization.name;
		} catch {
			// Not JSON, or not a job posting.
		}
	}
	return "";
}

function analyzeJob(): JobAnalysis {
	const article = new Readability(document.cloneNode(true) as Document).parse();
	if (!article?.textContent) throw new Error("Could not read this page. Is it a job posting?");

	return {
		title: document.title || article.title || "",
		company:
			hiringOrganization() ||
			document.querySelector('meta[property="og:site_name"]')?.getAttribute("content") ||
			article.siteName ||
			window.location.hostname,
		description: article.textContent.trim(),
		url: window.location.href,
	};
}

function toast(message: string) {
	const host = document.createElement("div");
	host.attachShadow({ mode: "open" }).textContent = message;
	Object.assign(host.style, {
		position: "fixed",
		bottom: "20px",
		right: "20px",
		zIndex: "2147483647",
		padding: "12px 20px",
		borderRadius: "8px",
		font: "500 14px system-ui, sans-serif",
		color: "#fff",
		background: "#18181b",
		boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
	});
	document.body.append(host);
	setTimeout(() => host.remove(), 4000);
}

chrome.runtime.onMessage.addListener((request: PageRequest, _sender, sendResponse) => {
	try {
		if (request.type === "ANALYZE_JOB") sendResponse(analyzeJob());

		if (request.type === "PREPARE_AUTOFILL") {
			const fields = extractFormFields();
			sendResponse({ fields, heuristic: runHeuristics(request.profile) } satisfies PreparedAutofill);
		}

		if (request.type === "APPLY_AUTOFILL") {
			const count = applyAutofill(request.suggestions);
			toast(count > 0 ? `Reactive Resume filled ${count} fields.` : "Reactive Resume: no fields were filled.");
			sendResponse({ count } satisfies AppliedAutofill);
		}
	} catch (error) {
		sendResponse({ error: error instanceof Error ? error.message : "Something went wrong on this page." });
	}
	// Every response above is sent synchronously.
	return false;
});
