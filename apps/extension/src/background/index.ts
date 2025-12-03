// Background service worker
// Unified logic for opening the extension
chrome.action.onClicked.addListener((tab) => {
  // Try to open the side panel if the API is available
  // Note: chrome.sidePanel.open requires a tabId to open in the current window
  if (chrome.sidePanel && chrome.sidePanel.open && tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  } else {
    // Fallback for browsers that don't support the Side Panel API (e.g. Arc)
    // or if the side panel fails to open for some reason
    chrome.windows.create({
      url: "index.html",
      type: "popup",
      width: 420,
      height: 600,
    });
  }
});

console.log("Reactive Resume Copilot: Background Service Started");
