// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set(
    {
      enabled: true,
      blockedWebsites: [],
      blurAmount: 5, // Default blur amount
      blurVideos: false, // New setting for video blurring
    },
    () => {
      console.log("Extension installed with default settings");
    }
  );
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getState") {
    chrome.storage.sync.get(
      ["enabled", "blockedWebsites", "blurAmount", "blurVideos"],
      (result) => {
        sendResponse({
          enabled: result.enabled !== undefined ? result.enabled : true,
          blockedWebsites: result.blockedWebsites || [],
          blurAmount: result.blurAmount || 5,
          blurVideos:
            result.blurVideos !== undefined ? result.blurVideos : false,
        });
      }
    );
    return true; // Indicates that the response is sent asynchronously
  } else if (request.action === "setState") {
    chrome.storage.sync.set(
      {
        enabled: request.enabled,
        blockedWebsites: request.blockedWebsites,
        blurAmount: request.blurAmount,
        blurVideos: request.blurVideos,
      },
      () => {
        // Notify all tabs about the state change and refresh if necessary
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.url) {
              const url = new URL(tab.url);
              const domain = url.hostname;

              // Check if the current tab's domain is in the blocked list
              const isBlocked = request.blockedWebsites.includes(domain);

              if (isBlocked && request.enabled) {
                // If the site is now blocked, refresh the tab
                chrome.tabs.reload(tab.id);
              } else {
                // Otherwise, just send an update message
                chrome.tabs.sendMessage(
                  tab.id,
                  {
                    action: "stateUpdated",
                    enabled: request.enabled,
                    blockedWebsites: request.blockedWebsites,
                    blurAmount: request.blurAmount,
                    blurVideos: request.blurVideos,
                  },
                  () => {
                    if (chrome.runtime.lastError) {
                      console.log(
                        `Failed to send message to tab ${tab.id}: ${chrome.runtime.lastError.message}`
                      );
                    }
                  }
                );
              }
            }
          });
        });
        sendResponse({ success: true });
      }
    );
    return true;
  }
});

// Function to check if a tab should have images blurred
function checkAndBlurImages(tabId, changeInfo, tab) {
  if (changeInfo.status === "complete" && tab.url) {
    chrome.storage.sync.get(
      ["enabled", "blockedWebsites", "blurAmount", "blurVideos"],
      (result) => {
        const enabled = result.enabled !== undefined ? result.enabled : true;
        const blockedWebsites = result.blockedWebsites || [];
        const blurAmount = result.blurAmount || 5;
        const blurVideos =
          result.blurVideos !== undefined ? result.blurVideos : false;

        const url = new URL(tab.url);
        const domain = url.hostname;

        if (enabled && blockedWebsites.includes(domain)) {
          // If the site is in the blocked list, inject the blurring script
          chrome.scripting
            .executeScript({
              target: { tabId: tabId },
              files: ["content-script.js"],
            })
            .then(() => {
              // After injecting the script, send the blur settings
              chrome.tabs.sendMessage(tabId, {
                action: "blurImages",
                blurAmount: blurAmount,
                blurVideos: blurVideos,
              });
            })
            .catch((error) => {
              console.log(`Failed to inject blurring script: ${error.message}`);
            });
        }
      }
    );
  }
}

// The rest of the background.js file remains the same

// Listen for tab updates
chrome.tabs.onUpdated.addListener(checkAndBlurImages);

// Listen for tab activation (when a tab is focused)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab) {
      checkAndBlurImages(tab.id, { status: "complete" }, tab);
    }
  });
});
