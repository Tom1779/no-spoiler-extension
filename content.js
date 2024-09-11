// content.js
let isEnabled = false;
let blockedWebsites = [];

function log(message) {
  console.log(`[Spoiler Blocker] ${message}`);
}

function applyBlur(element) {
  if (!element.classList.contains("spoiler-blur")) {
    element.classList.add("spoiler-blur");
    element.dataset.spoilerBlurred = "true";

    element.removeEventListener("click", toggleBlur);
    element.addEventListener("click", toggleBlur);
    log(`Blur applied to element: ${element.tagName}`);
  }
}

function removeBlur(element) {
  element.classList.remove("spoiler-blur");
  element.removeAttribute("data-spoiler-blurred");
  element.removeEventListener("click", toggleBlur);
  log(`Blur removed from element: ${element.tagName}`);
}

function toggleBlur(event) {
  event.preventDefault();
  event.stopPropagation();
  const element = event.target;

  if (element.dataset.spoilerBlurred === "true") {
    element.classList.remove("spoiler-blur");
    element.dataset.spoilerBlurred = "false";
    log("Image unblurred on click");
  } else {
    element.classList.add("spoiler-blur");
    element.dataset.spoilerBlurred = "true";
    log("Image re-blurred on click");
  }
}

function processImages() {
  log("Processing images...");
  const images = document.querySelectorAll("img, video");
  log(`Found ${images.length} images/videos`);
  images.forEach((element) => {
    if (isEnabled && checkURL(blockedWebsites)) {
      applyBlur(element);
    } else {
      removeBlur(element);
    }
  });
}

function checkURL(blockedWebsites) {
  const currentURL = window.location.hostname;
  const isBlocked = blockedWebsites.some((website) =>
    currentURL.includes(website)
  );
  log(`Current URL: ${currentURL}, Is Blocked: ${isBlocked}`);
  return isBlocked;
}

function updateState(enabled, websites) {
  isEnabled = enabled;
  blockedWebsites = websites;
  log(
    `State updated - Enabled: ${isEnabled}, Blocked Websites: ${JSON.stringify(
      blockedWebsites
    )}`
  );
  processImages();
}

function initMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    if (isEnabled && checkURL(blockedWebsites)) {
      log("New mutations detected, processing...");
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === "IMG" || node.tagName === "VIDEO") {
                applyBlur(node);
              } else {
                const images = node.querySelectorAll("img, video");
                images.forEach(applyBlur);
              }
            }
          });
        }
      });
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    log("MutationObserver started");
  } else {
    log("Document body not ready, waiting...");
    window.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
      log("MutationObserver started after DOMContentLoaded");
    });
  }
}

chrome.runtime.sendMessage({ action: "getState" }, (response) => {
  log(`Received initial state: ${JSON.stringify(response)}`);
  updateState(response.enabled, response.blockedWebsites);
  initMutationObserver();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "stateUpdated") {
    log(`Received state update: ${JSON.stringify(request)}`);
    updateState(request.enabled, request.blockedWebsites);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  log("DOMContentLoaded event fired");
  processImages();
});
