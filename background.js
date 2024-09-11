// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set(
    {
      enabled: true,
      blockedWebsites: [],
    },
    () => {
      console.log("Extension installed with default settings");
    }
  );
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getState") {
    chrome.storage.sync.get(["enabled", "blockedWebsites"], (result) => {
      sendResponse({
        enabled: result.enabled,
        blockedWebsites: result.blockedWebsites || [],
      });
    });
    return true; // Indicates that the response is sent asynchronously
  } else if (request.action === "setState") {
    chrome.storage.sync.set(
      {
        enabled: request.enabled,
        blockedWebsites: request.blockedWebsites,
      },
      () => {
        // Notify all tabs about the state change
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {
              action: "stateUpdated",
              enabled: request.enabled,
              blockedWebsites: request.blockedWebsites,
            });
          });
        });
        sendResponse({ success: true });
      }
    );
    return true;
  }
});

// Listen for tab updates to reapply content script if necessary
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.storage.sync.get(["enabled", "blockedWebsites"], (result) => {
      chrome.tabs.sendMessage(tabId, {
        action: "stateUpdated",
        enabled: result.enabled,
        blockedWebsites: result.blockedWebsites || [],
      });
    });
  }
});
