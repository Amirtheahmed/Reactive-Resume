import { Readability } from "@mozilla/readability";

console.log("Reactive Resume Copilot: Content Script Loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

      // Heuristics to find Company Name (often in meta tags or Schema.org data)
      let companyName = "";

      // Try OpenGraph site name
      const ogSiteName = document.querySelector('meta[property="og:site_name"]');
      if (ogSiteName) companyName = ogSiteName.getAttribute("content") || "";

      // Try JSON-LD Schema
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
        content: article.textContent, // Clean text content
        siteName: companyName || article.siteName || window.location.hostname,
        url: window.location.href
      });
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }
});
