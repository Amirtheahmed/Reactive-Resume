import type { Plugin } from "vite";
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// A Manifest V3 extension is three bundles: the side panel page and the background worker (ES modules),
// and the content script, which Chrome loads as a classic script and so must be one self-contained file.
// `vite build` makes the first two; `EXT_ENTRY=content vite build` adds the third into the same dist/.

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
	version: string;
};

/** Writes manifest.json, granting host access to the configured Reactive Resume instance and nothing else. */
const manifest = (appUrl: string): Plugin => ({
	name: "extension-manifest",
	generateBundle() {
		this.emitFile({
			type: "asset",
			fileName: "manifest.json",
			source: JSON.stringify(
				{
					manifest_version: 3,
					name: "Reactive Resume Copilot",
					version,
					description:
						"Tailor resumes and cover letters to a job posting and fill application forms from your master resume.",
					permissions: ["sidePanel", "storage", "activeTab", "scripting"],
					host_permissions: [`${new URL(appUrl).origin}/*`],
					side_panel: { default_path: "index.html" },
					background: { service_worker: "background.js", type: "module" },
					content_scripts: [{ matches: ["http://*/*", "https://*/*"], js: ["content.js"], run_at: "document_idle" }],
					action: { default_title: "Open Copilot" },
					icons: { 16: "icons/icon16.png", 32: "icons/icon32.png", 48: "icons/icon48.png", 128: "icons/icon128.png" },
				},
				null,
				2,
			),
		});
	},
});

export default defineConfig(({ mode }) => {
	const appUrl = loadEnv(mode, process.cwd(), "VITE_").VITE_APP_URL ?? "http://localhost:3000";

	if (process.env.EXT_ENTRY === "content") {
		return {
			publicDir: false,
			build: {
				emptyOutDir: false,
				lib: {
					entry: "src/content.ts",
					formats: ["iife"],
					name: "ReactiveResumeCopilot",
					fileName: () => "content.js",
				},
			},
		};
	}

	return {
		plugins: [tailwindcss(), viteReact(), manifest(appUrl)],
		build: {
			rollupOptions: {
				input: { index: "index.html", background: "src/background.ts" },
				output: { entryFileNames: "[name].js" },
			},
		},
	};
});
