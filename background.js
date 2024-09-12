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
        enabled: result.enabled !== undefined ? result.enabled : true,
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

// Function to check if a tab should be blocked
function checkAndBlockTab(tabId, changeInfo, tab) {
  if (changeInfo.status === "complete" && tab.url) {
    chrome.storage.sync.get(["enabled", "blockedWebsites"], (result) => {
      const enabled = result.enabled !== undefined ? result.enabled : true;
      const blockedWebsites = result.blockedWebsites || [];

      const url = new URL(tab.url);
      const domain = url.hostname;

      if (enabled && blockedWebsites.includes(domain)) {
        // If the site is blocked, inject the blocking script
        chrome.tabs.executeScript(
          tabId,
          {
            code: `
            document.body.innerHTML = '<h1>This site is blocked</h1>';
            document.title = 'Blocked Site';
          `,
          },
          () => {
            if (chrome.runtime.lastError) {
              console.log(
                `Failed to inject blocking script: ${chrome.runtime.lastError.message}`
              );
            }
          }
        );
      } else {
        // Otherwise, just update the state
        chrome.tabs.sendMessage(
          tabId,
          {
            action: "stateUpdated",
            enabled: enabled,
            blockedWebsites: blockedWebsites,
          },
          () => {
            if (chrome.runtime.lastError) {
              console.log(
                `Failed to send message to tab ${tabId}: ${chrome.runtime.lastError.message}`
              );
            }
          }
        );
      }
    });
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(checkAndBlockTab);

// Listen for tab activation (when a tab is focused)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab) {
      checkAndBlockTab(tab.id, { status: "complete" }, tab);
    }
  });
});
