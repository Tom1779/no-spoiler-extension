function log(message) {
  console.log(`[Spoiler Blocker Popup] ${message}`);
}

const toggleExtension = document.getElementById("toggleExtension");
const websiteList = document.getElementById("websiteList");
const newWebsite = document.getElementById("newWebsite");
const addWebsite = document.getElementById("addWebsite");
const addCurrentWebsite = document.getElementById("addCurrentWebsite");

let state = {
  enabled: true,
  blockedWebsites: [],
};

function initPopup() {
  log("Initializing popup");
  chrome.runtime.sendMessage({ action: "getState" }, (response) => {
    log(`Received initial state: ${JSON.stringify(response)}`);
    state = response;
    toggleExtension.checked = state.enabled;
    renderWebsiteList();
  });
}

function renderWebsiteList() {
  log("Rendering website list");
  websiteList.innerHTML = "";
  state.blockedWebsites.forEach((website) => {
    const li = document.createElement("li");
    li.textContent = website;
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.onclick = () => removeWebsite(website);
    li.appendChild(removeButton);
    websiteList.appendChild(li);
  });
}

function addNewWebsite(website) {
  log(`Attempting to add website: ${website}`);
  // Clean the website URL
  const cleanWebsite = website
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .toLowerCase();
  if (cleanWebsite && !state.blockedWebsites.includes(cleanWebsite)) {
    state.blockedWebsites.push(cleanWebsite);
    updateState();
    newWebsite.value = "";
  }
}

function removeWebsite(website) {
  log(`Removing website: ${website}`);
  state.blockedWebsites = state.blockedWebsites.filter((w) => w !== website);
  updateState();
}

function updateState() {
  log(`Updating state: ${JSON.stringify(state)}`);
  chrome.runtime.sendMessage(
    {
      action: "setState",
      enabled: state.enabled,
      blockedWebsites: state.blockedWebsites,
    },
    (response) => {
      if (response.success) {
        log("State updated successfully");
        renderWebsiteList();
      } else {
        log("Failed to update state");
      }
    }
  );
}

function getCurrentTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      callback(tabs[0]);
    }
  });
}

toggleExtension.addEventListener("change", () => {
  log(`Toggle changed: ${toggleExtension.checked}`);
  state.enabled = toggleExtension.checked;
  updateState();
});

addWebsite.addEventListener("click", () => {
  addNewWebsite(newWebsite.value.trim());
});

addCurrentWebsite.addEventListener("click", () => {
  getCurrentTab((tab) => {
    const url = new URL(tab.url);
    const domain = url.hostname;
    addNewWebsite(domain);
  });
});

initPopup();
