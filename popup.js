function log(message) {
  console.log(`[Spoiler Blocker Popup] ${message}`);
}

const toggleExtension = document.getElementById("toggleExtension");
const toggleVideoBlur = document.getElementById("toggleVideoBlur");
const websiteList = document.getElementById("websiteList");
const newWebsite = document.getElementById("newWebsite");
const addWebsite = document.getElementById("addWebsite");
const addCurrentWebsite = document.getElementById("addCurrentWebsite");
const blurStrength = document.getElementById("blurStrength");
const blurValue = document.getElementById("blurValue");

let state = {
  enabled: true,
  blockedWebsites: [],
  blurAmount: 5,
  blurVideos: false,
};

function initPopup() {
  log("Initializing popup");
  chrome.runtime.sendMessage({ action: "getState" }, (response) => {
    log(`Received initial state: ${JSON.stringify(response)}`);
    state = response;
    toggleExtension.checked = state.enabled;
    toggleVideoBlur.checked = state.blurVideos;
    blurStrength.value = state.blurAmount;
    blurValue.textContent = state.blurAmount;
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
  try {
    // Create a URL object to parse the input
    const url = new URL(website);
    // Get the hostname (domain) from the URL
    const hostname = url.hostname;
    // Remove 'www.' if present
    const cleanWebsite = hostname.replace(/^www\./, "").toLowerCase();

    if (cleanWebsite && !state.blockedWebsites.includes(cleanWebsite)) {
      state.blockedWebsites.push(cleanWebsite);
      updateState();
      newWebsite.value = "";
    }
  } catch (error) {
    // If URL parsing fails, try adding the input as-is
    const cleanWebsite = website.toLowerCase();
    if (cleanWebsite && !state.blockedWebsites.includes(cleanWebsite)) {
      state.blockedWebsites.push(cleanWebsite);
      updateState();
      newWebsite.value = "";
    }
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
      blurAmount: state.blurAmount,
      blurVideos: state.blurVideos,
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

blurStrength.addEventListener("input", () => {
  log(`Blur strength changed: ${blurStrength.value}`);
  state.blurAmount = parseInt(blurStrength.value);
  blurValue.textContent = state.blurAmount;
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

toggleVideoBlur.addEventListener("change", () => {
  log(`Video blur toggle changed: ${toggleVideoBlur.checked}`);
  state.blurVideos = toggleVideoBlur.checked;
  updateState();
});

initPopup();
