// Background service worker
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

console.log("Reactive Resume Copilot: Background Service Started");
