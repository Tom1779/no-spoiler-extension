// content.js
let isEnabled = false;
let blockedWebsites = [];
let blurAmount = 5;
let blurVideos = false;

function log(message) {
  console.log(`[Spoiler Blocker] ${message}`);
}

function applyBlur(element) {
  if (!element.classList.contains("spoiler-blur")) {
    element.classList.add("spoiler-blur");
    element.style.filter = `blur(${blurAmount}px)`;
    element.dataset.spoilerBlurred = "true";

    // Create a wrapper div
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);

    // Create an overlay div
    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.cursor = "pointer";
    wrapper.appendChild(overlay);

    // Add click event listener to the overlay
    overlay.addEventListener("click", handleClick);

    log(`Blur applied to element: ${element.tagName}`);
  }
}

function removeBlur(element) {
  if (element.classList.contains("spoiler-blur")) {
    element.classList.remove("spoiler-blur");
    element.style.filter = "";
    element.removeAttribute("data-spoiler-blurred");

    // Remove the wrapper and overlay
    const wrapper = element.parentNode;
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.insertBefore(element, wrapper);
      wrapper.parentNode.removeChild(wrapper);
    }

    // Remove the click event listener
    element.removeEventListener("click", handleClick);

    log(`Blur removed from element: ${element.tagName}`);
  }
}

function handleClick(event) {
  event.stopPropagation();
  const overlay = event.target;
  const wrapper = overlay.parentNode;
  const element = wrapper.querySelector(".spoiler-blur");

  if (element) {
    element.style.filter = "";
    element.dataset.spoilerBlurred = "false";
    overlay.style.display = "none";
    log(`${element.tagName} unblurred on click`);

    // Add a temporary click listener to the element
    const tempClickListener = (e) => {
      e.stopPropagation();
      element.style.filter = `blur(${blurAmount}px)`;
      element.dataset.spoilerBlurred = "true";
      overlay.style.display = "block";
      log(`${element.tagName} re-blurred on click`);
      element.removeEventListener("click", tempClickListener);
    };

    element.addEventListener("click", tempClickListener);
  }
}

function processElements() {
  log("Processing elements...");
  const images = document.querySelectorAll("img");
  const videos = document.querySelectorAll("video");
  log(`Found ${images.length} images and ${videos.length} videos`);

  if (isEnabled && checkURL(blockedWebsites)) {
    images.forEach(applyBlur);
    if (blurVideos) {
      videos.forEach(applyBlur);
    } else {
      videos.forEach(removeBlur);
    }
  } else {
    images.forEach(removeBlur);
    videos.forEach(removeBlur);
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

function updateState(enabled, websites, newBlurAmount, newBlurVideos) {
  isEnabled = enabled;
  blockedWebsites = websites;
  blurAmount = newBlurAmount;
  blurVideos = newBlurVideos;
  log(
    `State updated - Enabled: ${isEnabled}, Blocked Websites: ${JSON.stringify(
      blockedWebsites
    )}, Blur Amount: ${blurAmount}, Blur Videos: ${blurVideos}`
  );
  processElements();
}

function initMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    if (isEnabled && checkURL(blockedWebsites)) {
      log("New mutations detected, processing...");
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === "IMG") {
                applyBlur(node);
              } else if (node.tagName === "VIDEO" && blurVideos) {
                applyBlur(node);
              } else {
                const images = node.querySelectorAll("img");
                images.forEach(applyBlur);
                if (blurVideos) {
                  const videos = node.querySelectorAll("video");
                  videos.forEach(applyBlur);
                }
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
      response.blurAmount,
      response.blurVideos
    );
    processElements();
    initMutationObserver();
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "stateUpdated") {
    log(`Received state update: ${JSON.stringify(request)}`);
    updateState(
      request.enabled,
      request.blockedWebsites,
      request.blurAmount,
      request.blurVideos
    );
  }
});

// Initial processing
processElements();

// Add DOMContentLoaded event listener
window.addEventListener("DOMContentLoaded", () => {
  log("DOMContentLoaded event fired");
  initializeExtension();
});

// Also initialize immediately in case DOMContentLoaded has already fired
initializeExtension();
