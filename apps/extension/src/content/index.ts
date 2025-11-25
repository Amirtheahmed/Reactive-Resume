// apps/extension/src/content/index.ts

import { Readability } from "@mozilla/readability";
import { applyAutofill, extractFormFields, runHeuristics } from "@reactive-resume/autofill";
import { InformationData } from "@reactive-resume/schema";

console.log("Reactive Resume Copilot: Content Script Loaded");

// ... showToast function (unchanged) ...
const showToast = (message: string, type: "success" | "error" = "success") => {
  const id = "rx-resume-toast-host";
  let host = document.getElementById(id);

  if (!host) {
    host = document.createElement("div");
    host.id = id;
    host.style.position = "fixed";
    host.style.bottom = "20px";
    host.style.right = "20px";
    host.style.zIndex = "2147483647"; // Max z-index
    document.body.appendChild(host);
  }

  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });

  const toast = document.createElement("div");
  toast.textContent = message;

  // styles
  toast.style.padding = "12px 24px";
  toast.style.marginBottom = "10px";
  toast.style.borderRadius = "8px";
  toast.style.fontFamily = "system-ui, -apple-system, sans-serif";
  toast.style.fontSize = "14px";
  toast.style.fontWeight = "500";
  toast.style.color = "#fff";
  toast.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(20px)";
  toast.style.transition = "all 0.3s ease";
  toast.style.backgroundColor = type === "success" ? "#10b981" : "#ef4444"; // Emerald-500 or Red-500

  shadow.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  // Animate out
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => {
      toast.remove();
      if (shadow.childNodes.length === 0) host?.remove();
    }, 300);
  }, 4000);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ANALYZE_JOB") {
    // ... (existing ANALYZE_JOB logic) ...
    try {
      const documentClone = document.cloneNode(true) as Document;
      const reader = new Readability(documentClone);
      const article = reader.parse();

      if (!article) {
        sendResponse({ error: "Could not parse page content." });
        return false; // Synchronous response
      }

      let companyName = "";
      const ogSiteName = document.querySelector('meta[property="og:site_name"]');
      if (ogSiteName) companyName = ogSiteName.getAttribute("content") || "";

      if (!companyName) {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of Array.from(scripts)) {
          try {
            const data = JSON.parse(script.textContent || "{}");
            if (data["@type"] === "JobPosting" && data.hiringOrganization) {
              companyName = data.hiringOrganization.name;
              break;
            }
          } catch (e) { /* ignore json parse errors */ }
        }
      }

      sendResponse({
        title: document.title || article.title,
        content: article.textContent,
        siteName: companyName || article.siteName || window.location.hostname,
        url: window.location.href,
      });
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
    return false; // Synchronous response
  }

  if (request.type === "PREPARE_AUTOFILL") {
    try {
      const fields = extractFormFields();
      const heuristicSuggestions = runHeuristics(request.data as InformationData);

      // Find which fields were NOT matched by heuristics
      const matchedIds = new Set(heuristicSuggestions.map(s => s.id));
      const remainingFields = fields.filter(f => !matchedIds.has(f.id));

      sendResponse({
        success: true,
        fields,
        heuristicSuggestions,
        remainingFields,
        url: window.location.href,
      });
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
    return false; // This is synchronous, so we can return false.
  }

  if (request.type === "APPLY_AUTOFILL") {
    try {
      const count = applyAutofill(request.map);
      if (count > 0) {
        showToast(`⚡ Reactive Resume: Auto-filled ${count} fields!`);
      } else {
        showToast("Reactive Resume: No fields were filled.", "error");
      }
      sendResponse({ success: true, count });
    } catch (error) {
      console.error(error);
      showToast("Autofill error occurred", "error");
      sendResponse({ error: (error as Error).message });
    }
    return false; // Synchronous response
  }

  // Default case for unknown message types
  return false;
});
