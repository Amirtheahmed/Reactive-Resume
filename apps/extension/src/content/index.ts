import { Readability } from "@mozilla/readability";
import { autofillPage } from "@reactive-resume/autofill";
import type { InformationDto } from "@reactive-resume/dto";

console.log("Reactive Resume Copilot: Content Script Loaded");

// Helper: Show a temporary toast notification in the browser page
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
  // Phase 3: Analyze Job Description
  if (request.type === "ANALYZE_JOB") {
    try {
      // Clone the document to avoid modifying the live page
      const documentClone = document.cloneNode(true) as Document;
      const reader = new Readability(documentClone);
      const article = reader.parse();

      if (!article) {
        sendResponse({ error: "Could not parse page content." });
        return;
      }

      // Heuristics to find Company Name
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
          } catch (e) {
            // ignore json parse errors
          }
        }
      }

      sendResponse({
        title: document.title || article.title,
        content: article.textContent,
        siteName: companyName || article.siteName || window.location.hostname,
        url: window.location.href
      });
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }

  // Phase 4: Autofill
  if (request.type === "AUTOFILL") {
    try {
      const data = request.data as InformationDto;
      if (!data || !data.data) {
        showToast("Autofill failed: No data available", "error");
        sendResponse({ error: "No information data provided." });
        return;
      }

      const count = autofillPage(data.data);

      if (count > 0) {
        showToast(`⚡ Reactive Resume: Auto-filled ${count} fields!`);
      } else {
        showToast("Reactive Resume: No matching fields found.", "error");
      }

      sendResponse({ success: true, count });
    } catch (error) {
      console.error(error);
      showToast("Autofill error occurred", "error");
      sendResponse({ error: (error as Error).message });
    }
  }
});
