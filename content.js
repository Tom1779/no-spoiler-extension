// content.js
let isEnabled = false;
let blockedWebsites = [];
let blurAmount = 5;

function log(message) {
  console.log(`[Spoiler Blocker] ${message}`);
}

function applyBlur(element) {
  if (!element.classList.contains("spoiler-blur")) {
    element.classList.add("spoiler-blur");
    element.style.filter = `blur(${blurAmount}px)`;
    element.dataset.spoilerBlurred = "true";

    element.removeEventListener("click", toggleBlur);
    element.addEventListener("click", toggleBlur);
    log(`Blur applied to element: ${element.tagName}`);
  }
}

function removeBlur(element) {
  element.classList.remove("spoiler-blur");
  element.style.filter = "";
  element.removeAttribute("data-spoiler-blurred");
  element.removeEventListener("click", toggleBlur);
  log(`Blur removed from element: ${element.tagName}`);
}

function toggleBlur(event) {
  event.preventDefault();
  event.stopPropagation();
  const element = event.target;

  if (element.dataset.spoilerBlurred === "true") {
    element.style.filter = "";
    element.dataset.spoilerBlurred = "false";
    log("Image unblurred on click");
  } else {
    element.style.filter = `blur(${blurAmount}px)`;
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
  const currentHostname = window.location.hostname.toLowerCase();

  const isBlocked = blockedWebsites.some((website) => {
    // Remove www. from the beginning of the hostname if present
    const cleanCurrentHostname = currentHostname.replace(/^www\./, "");
    const cleanWebsite = website.replace(/^www\./, "").toLowerCase();

    // Check if the cleaned website matches the current hostname
    return (
      cleanCurrentHostname === cleanWebsite ||
      cleanCurrentHostname.endsWith(`.${cleanWebsite}`)
    );
  });

  log(`Current hostname: ${currentHostname}, Is Blocked: ${isBlocked}`);
  return isBlocked;
}

function updateState(enabled, websites, newBlurAmount) {
  isEnabled = enabled;
  blockedWebsites = websites;
  blurAmount = newBlurAmount;
  log(
    `State updated - Enabled: ${isEnabled}, Blocked Websites: ${JSON.stringify(
      blockedWebsites
    )}, Blur Amount: ${blurAmount}`
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

  observer.observe(document.body, { childList: true, subtree: true });
  log("MutationObserver started");
}

function initializeExtension() {
  chrome.runtime.sendMessage({ action: "getState" }, (response) => {
    log(`Received initial state: ${JSON.stringify(response)}`);
    updateState(
      response.enabled,
      response.blockedWebsites,
      response.blurAmount
    );
    processImages();
    initMutationObserver();
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "stateUpdated") {
    log(`Received state update: ${JSON.stringify(request)}`);
    updateState(request.enabled, request.blockedWebsites, request.blurAmount);
  }
});

// Initial processing
processImages();

// Add DOMContentLoaded event listener
window.addEventListener("DOMContentLoaded", () => {
  log("DOMContentLoaded event fired");
  initializeExtension();
});

// Also initialize immediately in case DOMContentLoaded has already fired
initializeExtension();
