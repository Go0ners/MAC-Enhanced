/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const CONTAINER_HIDE_SRC = "/img/password-hide.svg";
const CONTAINER_UNHIDE_SRC = "/img/password-hide.svg";

const DEFAULT_COLOR = "blue";
const DEFAULT_ICON = "circle";
const NEW_CONTAINER_ID = "new";

const ONBOARDING_STORAGE_KEY = "onboarding-stage";
const CONTAINER_DRAG_DATA_TYPE = "firefox-container";

// List of panels
const P_ONBOARDING_1 = "onboarding1";
const P_ONBOARDING_2 = "onboarding2";
const P_ONBOARDING_3 = "onboarding3";
const P_ONBOARDING_4 = "onboarding4";
const P_ONBOARDING_5 = "onboarding5";

const P_CONTAINERS_LIST = "containersList";
const OPEN_NEW_CONTAINER_PICKER = "new-tab";
const MANAGE_CONTAINERS_PICKER = "manage";
const REOPEN_IN_CONTAINER_PICKER = "reopen-in";
const ALWAYS_OPEN_IN_PICKER = "always-open-in";
const P_CONTAINER_INFO = "containerInfo";
const P_CONTAINER_EDIT = "containerEdit";
const P_CONTAINER_DELETE = "containerDelete";
const P_CONTAINERS_ACHIEVEMENT = "containersAchievement";
const P_SURVEY_ACHIEVEMENT = "surveyAchievement";
const P_CONTAINER_ASSIGNMENTS = "containerAssignments";
const P_CLEAR_CONTAINER_STORAGE = "clearContainerStorage";

function addRemoveSiteIsolation() {
  const identity = Logic.currentIdentity();
  browser.runtime.sendMessage({
    method: "addRemoveSiteIsolation",
    cookieStoreId: identity.cookieStoreId
  });
}

async function getExtensionInfo() {
  const manifestPath = browser.runtime.getURL("manifest.json");
  const response = await fetch(manifestPath);
  const extensionInfo = await response.json();
  return extensionInfo;
}

/**
 * Extracts and validates a hostname from user input.
 * Accepts bare hostnames, URLs with protocols, or hostnames with paths.
 *
 * @param {string} input - User-provided string (hostname or URL)
 * @returns {{ valid: boolean, hostname: string|null }}
 */
function extractHostname(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    return { valid: false, hostname: null };
  }

  let urlString = trimmed;
  if (!urlString.includes("://")) {
    urlString = "https://" + urlString;
  }

  let hostname;
  try {
    const url = new URL(urlString);
    hostname = url.hostname;
  } catch (e) {
    return { valid: false, hostname: null };
  }

  if (!hostname || !hostname.includes(".") || !/^[a-zA-Z0-9.-]+$/.test(hostname)) {
    return { valid: false, hostname: null };
  }

  return { valid: true, hostname };
}


// This object controls all the panels, identities and many other things.
const Logic = {
  _identities: [],
  _currentIdentity: null,
  _currentPanel: null,
  _previousPanelPath: [],
  _panels: {},
  _onboardingVariation: null,

  async init() {
    // Set the theme
    Utils.applyTheme();

    // Remove browserAction "upgraded" badge when opening panel
    this.clearBrowserActionBadge();

    // Retrieve the list of identities.
    const identitiesPromise = this.refreshIdentities();

    try {
      await identitiesPromise;
    } catch (e) {
      throw new Error("Failed to retrieve the identities or variation. We cannot continue. ", e.message);
    }

    // Routing to the correct panel.
    // If localStorage is disabled, we don't show the onboarding.
    const onboardingData = await browser.storage.local.get([ONBOARDING_STORAGE_KEY]);
    let onboarded = onboardingData[ONBOARDING_STORAGE_KEY];
    if (!onboarded) {
      onboarded = 9;
      this.setOnboardingStage(onboarded);
    }

    switch (onboarded) {
    case 8:
      this.showAchievementOrContainersListPanel();
      break;
    case 7:
    case 6:
    case 5:
      this.showAchievementOrContainersListPanel();
      break;
    case 4:
      this.showPanel(P_ONBOARDING_5);
      break;
    case 3:
      this.showPanel(P_ONBOARDING_4);
      break;
    case 2:
      this.showPanel(P_ONBOARDING_3);
      break;
    case 1:
      this.showPanel(P_ONBOARDING_2);
      break;
    case 0:
    default:
      this.showPanel(P_ONBOARDING_1);
      break;
    }

  },

  notify(i18nOpts) {
    const notificationCards = document.querySelectorAll(".popup-notification-card");
    const text = browser.i18n.getMessage(i18nOpts.messageId, i18nOpts.placeholders);
    notificationCards.forEach(notificationCard => {
      notificationCard.textContent = text;
      notificationCard.classList.add("is-shown");
    
      setTimeout(() => {
        notificationCard.classList.remove("is-shown");
      }, 2000);
    });
  },

  async showAchievementOrContainersListPanel() {
    const achievementsStorage = await browser.storage.local.get({ achievements: [] });
    const achievements = achievementsStorage.achievements;

    let saveAchievements = false;
    for (const achievement of achievements.filter(a => !a.done)) {
      if (achievement.name === "manyContainersOpened") {
        this.showPanel(P_CONTAINERS_ACHIEVEMENT);
        return;
      }

      if (achievement.name === "surveyFinal") {
        this.showPanel(P_SURVEY_ACHIEVEMENT);
        return;
      }

      // We have found an unknown achievement. Let's mark it as done.
      achievement.done = true;
      saveAchievements = true;
    }

    if (saveAchievements) {
      browser.storage.local.set({ achievements });
    }

    this.showPanel(P_CONTAINERS_LIST);
  },

  // In case the user wants to click multiple actions,
  // they have to click the "Done" button to stop the panel
  // from showing
  async setAchievementDone(achievementName) {
    const achievementsStorage = await browser.storage.local.get({ achievements: [] });
    const achievements = achievementsStorage.achievements;
    achievements.forEach((achievement, index, achievementsArray) => {
      if (achievement.name === achievementName) {
        achievement.done = true;
        achievementsArray[index] = achievement;
      }
    });
    browser.storage.local.set({ achievements });
  },

  setOnboardingStage(stage) {
    return browser.storage.local.set({
      [ONBOARDING_STORAGE_KEY]: stage
    });
  },

  async clearBrowserActionBadge() {
    const extensionInfo = await getExtensionInfo();
    const storage = await browser.storage.local.get({ browserActionBadgesClicked: [] });
    browser.browserAction.setBadgeBackgroundColor({ color: "#ffffff" });
    browser.browserAction.setBadgeText({ text: "" });
    storage.browserActionBadgesClicked.push(extensionInfo.version);
    // use set and spread to create a unique array
    const browserActionBadgesClicked = [...new Set(storage.browserActionBadgesClicked)];
    browser.storage.local.set({
      browserActionBadgesClicked
    });
  },

  async identity(cookieStoreId) {
    const defaultContainer = {
      name: "Default",
      cookieStoreId,
      icon: "default-tab",
      color: "default-tab",
      numberOfHiddenTabs: 0,
      numberOfOpenTabs: 0
    };
    // Handle old style rejection with null and also Promise.reject new style
    try {
      return await browser.contextualIdentities.get(cookieStoreId) || defaultContainer;
    } catch {
      return defaultContainer;
    }
  },

  async numTabs() {
    const activeTabs = await browser.tabs.query({ windowId: browser.windows.WINDOW_ID_CURRENT });
    return activeTabs.length;
  },

  _disableMenuItem(message, elementToDisable = document.querySelector("#move-to-new-window")) {
    elementToDisable.setAttribute("title", message);
    elementToDisable.removeAttribute("tabindex");
    elementToDisable.classList.remove("hover-highlight");
    elementToDisable.classList.add("disabled-menu-item");
  },

  _enableMenuItems(elementToEnable = document.querySelector("#move-to-new-window")) {
    elementToEnable.removeAttribute("title");
    elementToEnable.setAttribute("tabindex", "0");
    elementToEnable.classList.add("hover-highlight");
    elementToEnable.classList.remove("disabled-menu-item");
  },

  async saveContainerOrder(rows) {
    const containerOrder = {};
    rows.forEach((node, index) => {
      if (typeof browser.contextualIdentities.move === "function") {
        browser.contextualIdentities.move(
          node.dataset.containerId, index);
      }

      return containerOrder[node.dataset.containerId] = index;
    });
    await browser.storage.local.set({
      [CONTAINER_ORDER_STORAGE_KEY]: containerOrder
    });
  },

  async refreshIdentities() {
    const [identities, state, containerOrderStorage] = await Promise.all([
      browser.contextualIdentities.query({}),
      browser.runtime.sendMessage({
        method: "queryIdentitiesState",
        message: {
          windowId: browser.windows.WINDOW_ID_CURRENT
        }
      }),
      browser.storage.local.get([CONTAINER_ORDER_STORAGE_KEY])
    ]);
    const containerOrder =
      containerOrderStorage && containerOrderStorage[CONTAINER_ORDER_STORAGE_KEY];
    this._identities = identities.map((identity) => {
      const stateObject = state[identity.cookieStoreId];
      if (stateObject) {
        identity.hasOpenTabs = stateObject.hasOpenTabs;
        identity.hasHiddenTabs = stateObject.hasHiddenTabs;
        identity.numberOfHiddenTabs = stateObject.numberOfHiddenTabs;
        identity.numberOfOpenTabs = stateObject.numberOfOpenTabs;
        identity.isIsolated = stateObject.isIsolated;
      }
      if (containerOrder) {
        identity.order = containerOrder[identity.cookieStoreId];
      }
      return identity;
    }).sort((i1, i2) => i1.order - i2.order);
  },

  getPanelSelector(panel) {
    if (this._onboardingVariation === "securityOnboarding" &&
    // eslint-disable-next-line no-prototype-builtins
      panel.hasOwnProperty("securityPanelSelector")) {
      return panel.securityPanelSelector;
    } else {
      return panel.panelSelector;
    }
  },

  async showPanel(panel, currentIdentity = null, backwards = false, addToPreviousPanelPath = true) {
    if ((!backwards && addToPreviousPanelPath) || !this._currentPanel) {
      this._previousPanelPath.push(this._currentPanel);
    }

    // If invalid panel, reset panels.
    if (!(panel in this._panels)) {
      panel = P_CONTAINERS_LIST;
      this._previousPanelPath = [];
    }

    this._currentPanel = panel;

    this._currentIdentity = currentIdentity;

    // Initialize the panel before showing it.
    await this._panels[panel].prepare();
    Object.keys(this._panels).forEach((panelKey) => {
      const panelItem = this._panels[panelKey];
      const panelElement = document.querySelector(this.getPanelSelector(panelItem));
      if (!panelElement.classList.contains("hide")) {
        panelElement.classList.add("hide");
        if ("unregister" in panelItem) {
          panelItem.unregister();
        }
      }
    });
    const panelEl = document.querySelector(this.getPanelSelector(this._panels[panel]));
    panelEl.classList.remove("hide");

    const focusEl = panelEl.querySelector(".firstTabindex");
    if(focusEl) {
      focusEl.focus();
    }
  },

  showPreviousPanel() {
    if (!this._previousPanelPath) {
      throw new Error("Current panel not set!");
    }
    this.showPanel(this._previousPanelPath.pop(), this._currentIdentity, true);
  },

  registerPanel(panelName, panelObject) {
    this._panels[panelName] = panelObject;
    panelObject.initialize();
  },

  identities() {
    return this._identities;
  },

  currentIdentity() {
    if (!this._currentIdentity) {
      throw new Error("CurrentIdentity must be set before calling Logic.currentIdentity.");
    }
    return this._currentIdentity;
  },

  currentUserContextId() {
    const identity = Logic.currentIdentity();
    return Utils.userContextId(identity.cookieStoreId);
  },

  cookieStoreId(userContextId) {
    return `firefox-container-${userContextId}`;
  },

  currentCookieStoreId() {
    const identity = Logic.currentIdentity();
    return identity.cookieStoreId;
  },

  removeIdentity(userContextId) {
    if (!userContextId) {
      return Promise.reject("removeIdentity must be called with userContextId argument.");
    }

    return browser.runtime.sendMessage({
      method: "deleteContainer",
      message: { userContextId }
    });
  },

  getAssignment(tab) {
    return browser.runtime.sendMessage({
      method: "getAssignment",
      tabId: tab.id
    });
  },

  getAssignmentObjectByContainer(userContextId) {
    if (!userContextId) {
      return {};
    }
    return browser.runtime.sendMessage({
      method: "getAssignmentObjectByContainer",
      message: { userContextId }
    });
  },

  generateIdentityName() {
    const defaultName = "Container #";
    const ids = [];

    // This loop populates the 'ids' array with all the already-used ids.
    this._identities.forEach(identity => {
      if (identity.name.startsWith(defaultName)) {
        const id = parseInt(identity.name.substr(defaultName.length), 10);
        if (id) {
          ids.push(id);
        }
      }
    });

    // Here we find the first valid id.
    for (let id = 1; ; ++id) {
      if (ids.indexOf(id) === -1) {
        return defaultName + (id < 10 ? "0" : "") + id;
      }
    }
  },

  getCurrentPanelElement() {
    const panelItem = this._panels[this._currentPanel];
    return document.querySelector(this.getPanelSelector(panelItem));
  },

  listenToPickerBackButton() {
    const closeContEl = document.querySelector("#close-container-picker-panel");
    if (!this._listenerSet) {
      Utils.addEnterHandler(closeContEl, () => {
        Logic.showPanel(P_CONTAINERS_LIST);
      });
      this._listenerSet = true;
    }
  },

  shortcutListener(e){
    function openTopContainers() {
      const identities = Logic.identities();
      const key = e.code.substring(5);
      const identity = e.code === "Digit0" ? identities[9] : identities[key - 1];

      try {
        browser.tabs.create({
          cookieStoreId: identity.cookieStoreId
        });
        window.close();
      } catch {
        window.close();
      }
    }

    // We monitor if the search input is focused so we can disable opening
    // containers by typing a digit between 0-9 while the popup is open.
    const searchInput = document.getElementById("search-terms");
    let isSearchInputFocused = false;

    if (document.activeElement === searchInput) {
      isSearchInputFocused = true;
    }

    if (Logic._currentPanel === "containersList" && !isSearchInputFocused) {
      switch(e.code) {
      case "Digit0":
      case "Digit1":
      case "Digit2":
      case "Digit3":
      case "Digit4":
      case "Digit5":
      case "Digit6":
      case "Digit7":
      case "Digit8":
      case "Digit9":
        openTopContainers();
        break;
      case "Slash":
        document.getElementById("search-terms").focus();
        e.preventDefault();
        break;
      }
    }
  },

  keyboardNavListener(e){
    const panelSelector = Logic.getPanelSelector(Logic._panels[Logic._currentPanel]);
    const selectables = [...document.querySelectorAll(`${panelSelector} .keyboard-nav[tabindex='0']`)];
    const element = document.activeElement;
    const backButton = document.querySelector(`${panelSelector} .keyboard-nav-back`);
    const index = selectables.indexOf(element) || 0;
    function next() {
      const nextElement = selectables[index + 1];
      if (nextElement) {
        nextElement.focus();
      }
    }
    function previous() {
      const previousElement = selectables[index - 1];
      if (previousElement) {
        previousElement.focus();
      }
    }
    switch (e.keyCode) {
    case 40:
      next();
      break;
    case 38:
      previous();
      break;
    case 39:
    {
      if(element){
        element.click();
      }

      // If one Container is highlighted,
      if (element.classList.contains("keyboard-right-arrow-override")) {
        element.querySelector(".menu-right-float").click();
      }

      break;
    }
    case 37:
    {
      if(backButton){
        backButton.click();
      }
      break;
    }
    default:
      break;
    }
  },

  filterContainerList() {
    const pattern = /^\s+|\s+$/g;
    const list = Array.from(document.querySelectorAll("#identities-list tr"));
    const search = document.querySelector("#search-terms").value.replace(pattern, "").toLowerCase();

    for (const i in list) {
      const text = list[i].querySelector("td div span");

      if (text.innerText.replace(pattern, "").toLowerCase().includes(search) ||
          !search) {
        list[i].style.display = "block";
      } else {
        list[i].style.display = "none";
      }
    }
  }
};

// P_ONBOARDING_1: First page for Onboarding.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_ONBOARDING_1, {
  panelSelector: ".onboarding-panel-1",
  securityPanelSelector: ".security-onboarding-panel-1",

  // This method is called when the object is registered.
  initialize() {
    // Let's move to the next panel.
    [...document.querySelectorAll(".onboarding-start-button")].forEach(startElement => {
      Utils.addEnterHandler(startElement, async () => {
        await Logic.setOnboardingStage(1);
        Logic.showPanel(P_ONBOARDING_2);
      });
    });
  },

  // This method is called when the panel is shown.
  prepare() {
    return Promise.resolve(null);
  },
});

// P_ONBOARDING_2: Second page for Onboarding.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_ONBOARDING_2, {
  panelSelector: ".onboarding-panel-2",
  securityPanelSelector: ".security-onboarding-panel-2",

  // This method is called when the object is registered.
  initialize() {
    // Let's move to the containers list panel.
    [...document.querySelectorAll(".onboarding-next-button")].forEach(nextElement => {
      Utils.addEnterHandler(nextElement, async () => {
        await Logic.setOnboardingStage(2);
        Logic.showPanel(P_ONBOARDING_3);
      });
    });
  },

  // This method is called when the panel is shown.
  prepare() {
    return Promise.resolve(null);
  },
});

// P_ONBOARDING_3: Third page for Onboarding.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_ONBOARDING_3, {
  panelSelector: ".onboarding-panel-3",
  securityPanelSelector: ".security-onboarding-panel-3",

  // This method is called when the object is registered.
  initialize() {
    // Let's move to the containers list panel.
    [...document.querySelectorAll(".onboarding-almost-done-button")].forEach(almostElement => {
      Utils.addEnterHandler(almostElement, async () => {
        await Logic.setOnboardingStage(3);
        Logic.showPanel(P_ONBOARDING_4);
      });
    });
  },

  // This method is called when the panel is shown.
  prepare() {
    return Promise.resolve(null);
  },
});

// P_ONBOARDING_4: Fourth page for Onboarding.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_ONBOARDING_4, {
  panelSelector: ".onboarding-panel-4",

  // This method is called when the object is registered.
  initialize() {
    // Let's move to the containers list panel.
    Utils.addEnterHandler(document.querySelector("#onboarding-done-button"), async () => {
      await Logic.setOnboardingStage(4);
      Logic.showPanel(P_ONBOARDING_5);
    });
  },

  // This method is called when the panel is shown.
  prepare() {
    return Promise.resolve(null);
  },
});

// P_ONBOARDING_5: Fifth page for Onboarding: new tab long-press behavior
// ----------------------------------------------------------------------------

Logic.registerPanel(P_ONBOARDING_5, {
  panelSelector: ".onboarding-panel-5",

  // This method is called when the object is registered.
  initialize() {
    // Let's move to the containers list panel.
    Utils.addEnterHandler(document.querySelector("#onboarding-longpress-button"), async () => {
      await Logic.setOnboardingStage(8);
      Logic.showPanel(P_CONTAINERS_LIST);
    });
  },

  // This method is called when the panel is shown.
  prepare() {
    return Promise.resolve(null);
  },
});

// P_CONTAINERS_LIST: The list of containers. The main page.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_CONTAINERS_LIST, {
  panelSelector: "#container-panel",

  // This method is called when the object is registered.
  async initialize() {
    Utils.addEnterHandler(document.querySelector("#manage-containers-link"), (e) => {
      if (!e.target.classList.contains("disable-edit-containers")) {
        Logic.showPanel(MANAGE_CONTAINERS_PICKER);
      }
    });
    Utils.addEnterHandler(document.querySelector("#open-new-tab-in"), () => {
      Logic.showPanel(OPEN_NEW_CONTAINER_PICKER);
    });
    Utils.addEnterHandler(document.querySelector("#reopen-site-in"), () => {
      Logic.showPanel(REOPEN_IN_CONTAINER_PICKER);
    });
    Utils.addEnterHandler(document.querySelector("#always-open-in"), () => {
      Logic.showPanel(ALWAYS_OPEN_IN_PICKER);
    });
    Utils.addEnterHandler(document.querySelector("#sort-containers-link"), async () => {
      try {
        await browser.runtime.sendMessage({
          method: "sortTabs"
        });
        window.close();
      } catch {
        window.close();
      }
    });

    Utils.addEnterHandler((document.querySelector("#info-icon")), async() => {
      browser.runtime.openOptionsPage();
    });
  },

  unregister() {
  },

  // This method is called when the panel is shown.
  async prepare() {
    const fragment = document.createDocumentFragment();
    const identities = Logic.identities();

    for (const identity of identities) {
      const tr = document.createElement("tr");
      tr.classList.add("menu-item", "hover-highlight", "keyboard-nav", "keyboard-right-arrow-override");
      tr.setAttribute("tabindex", "0");
      tr.setAttribute("data-cookie-store-id", identity.cookieStoreId);
      const td = document.createElement("td");
      const openTabs = identity.numberOfOpenTabs || "" ;

      td.innerHTML = Utils.escaped`
        <div class="menu-item-name">
          <div class="menu-icon">

            <div class="usercontext-icon"
              data-identity-icon="${identity.icon}"
              data-identity-color="${identity.color}">
            </div>
          </div>
          <span class="menu-text">${identity.name}</span>
        </div>
        <span class="menu-right-float">
          <span class="container-count">${openTabs}</span>
          <span class="menu-arrow">
            <img alt="Container Info" src="/img/arrow-icon-right.svg" />
          </span>

        </span>`;



      fragment.appendChild(tr);

      tr.appendChild(td);

      const openInThisContainer = tr.querySelector(".menu-item-name");
      Utils.addEnterHandler(openInThisContainer, (e) => {
        e.preventDefault();
        try {
          browser.tabs.create({
            cookieStoreId: identity.cookieStoreId
          });
          window.close();
        } catch {
          window.close();
        }
      });

      Utils.addEnterOnlyHandler(tr, () => {
        try {
          browser.tabs.create({
            cookieStoreId: identity.cookieStoreId
          });
          window.close();
        } catch {
          window.close();
        }
      });

      // Select only the ">" from the container list
      const showPanelButton = tr.querySelector(".menu-right-float");

      Utils.addEnterHandler(showPanelButton, () => {
        Logic.showPanel(P_CONTAINER_INFO, identity);
      });
    }

    const list = document.querySelector("#identities-list");

    list.innerHTML = "";
    list.appendChild(fragment);

    document.addEventListener("keydown", Logic.keyboardNavListener);
    document.addEventListener("keydown", Logic.shortcutListener);
    document.addEventListener("input", Logic.filterContainerList);

    // reset path
    this._previousPanelPath = [];
    return Promise.resolve();
  },
});

// P_CONTAINER_INFO: More info about a container.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_CONTAINER_INFO, {
  panelSelector: "#container-info-panel",

  // This method is called when the object is registered.
  async initialize() {
    const closeContEl = document.querySelector("#close-container-info-panel");
    Utils.addEnterHandler(closeContEl, () => {
      Logic.showPanel(P_CONTAINERS_LIST);
    });

    // Check if the user has incompatible add-ons installed
    // Note: this is not implemented in messageHandler.js
    let incompatible = false;
    try {
      incompatible = await browser.runtime.sendMessage({
        method: "checkIncompatibleAddons"
      });
    } catch {
      throw new Error("Could not check for incompatible add-ons.");
    }

    const moveTabsEl = document.querySelector("#move-to-new-window");
    const numTabs = await Logic.numTabs();
    if (incompatible) {
      Logic._disableMenuItem("Moving container tabs is incompatible with Pulse, PageShot, and SnoozeTabs.");
      return;
    } else if (numTabs === 1) {
      Logic._disableMenuItem("Cannot move a tab from a single-tab window.");
      return;
    }

    Utils.addEnterHandler(moveTabsEl, async () => {
      await browser.runtime.sendMessage({
        method: "moveTabsToWindow",
        windowId: browser.windows.WINDOW_ID_CURRENT,
        cookieStoreId: Logic.currentIdentity().cookieStoreId,
      });
      window.close();
    });
  },

  // This method is called when the panel is shown.
  async prepare() {
    const identity = Logic.currentIdentity();

    const newTab = document.querySelector("#open-new-tab-in-info");
    Utils.addEnterHandler(newTab, () => {
      try {
        browser.tabs.create({
          cookieStoreId: identity.cookieStoreId
        });
        window.close();
      } catch {
        window.close();
      }
    });
    // Populating the panel: name and icon
    document.getElementById("container-info-title").textContent = identity.name;

    const alwaysOpen = document.querySelector("#always-open-in-info-panel");
    Utils.addEnterHandler(alwaysOpen, async () => {
      Utils.alwaysOpenInContainer(identity);
      window.close();
    });

    // Show or not the has-tabs section.
    for (let trHasTabs of document.getElementsByClassName("container-info-has-tabs")) { // eslint-disable-line prefer-const
      trHasTabs.style.display = !identity.hasHiddenTabs && !identity.hasOpenTabs ? "none" : "";
    }

    if (identity.numberOfOpenTabs === 0) {
      Logic._disableMenuItem("No tabs available for this container");
    } else {
      Logic._enableMenuItems();
    }

    this.intializeShowHide(identity);

    // Let's retrieve the list of tabs.
    const tabs = await browser.runtime.sendMessage({
      method: "getTabs",
      windowId: browser.windows.WINDOW_ID_CURRENT,
      cookieStoreId: Logic.currentIdentity().cookieStoreId
    });
    const manageContainer = document.querySelector("#manage-container-link");
    Utils.addEnterHandler(manageContainer, async () => {
      Logic.showPanel(P_CONTAINER_EDIT, identity);
    });
    const clearContainerStorageButton = document.getElementById("clear-container-storage-info");
    Utils.addEnterHandler(clearContainerStorageButton, async () => {
      const granted = await browser.permissions.request({ permissions: ["browsingData"] });
      if (granted) {
        Logic.showPanel(P_CLEAR_CONTAINER_STORAGE, identity);
      }
    });
    return this.buildOpenTabTable(tabs);
  },

  intializeShowHide(identity) {
    const hideContEl = document.querySelector("#hideorshow-container");
    if (identity.numberOfOpenTabs === 0 && !identity.hasHiddenTabs) {
      return Logic._disableMenuItem("No tabs available for this container",  hideContEl);
    } else {
      Logic._enableMenuItems(hideContEl);
    }

    Utils.addEnterHandler(hideContEl, async () => {
      try {
        browser.runtime.sendMessage({
          method: identity.hasHiddenTabs ? "showTabs" : "hideTabs",
          windowId: browser.windows.WINDOW_ID_CURRENT,
          cookieStoreId: Logic.currentCookieStoreId()
        });
        window.close();
      } catch {
        window.close();
      }
    });

    const hideShowIcon = document.getElementById("container-info-hideorshow-icon");
    hideShowIcon.src = identity.hasHiddenTabs ? CONTAINER_UNHIDE_SRC : CONTAINER_HIDE_SRC;

    const hideShowLabel = document.getElementById("container-info-hideorshow-label");
    hideShowLabel.textContent = browser.i18n.getMessage(identity.hasHiddenTabs ? "showThisContainer" : "hideThisContainer");
    return;
  },

  buildOpenTabTable(tabs) {
    // Let's remove all the previous tabs.
    const table = document.getElementById("container-info-table");
    while (table.firstChild) {
      table.firstChild.remove();
    }

    // For each one, let's create a new line.
    const fragment = document.createDocumentFragment();
    for (let tab of tabs) { // eslint-disable-line prefer-const
      const tr = document.createElement("tr");
      fragment.appendChild(tr);
      tr.classList.add("menu-item", "hover-highlight", "keyboard-nav");
      tr.setAttribute("tabindex", "0");
      tr.innerHTML = Utils.escaped`
        <td>
          <div class="favicon"></div>
          <span title="${tab.url}" class="menu-text truncate-text">${tab.title}</span>
          <img id="${tab.id}" class="trash-button" src="/img/close.svg" />
        </td>`;
      tr.querySelector(".favicon").appendChild(Utils.createFavIconElement(tab.favIconUrl));
      tr.setAttribute("tabindex", "0");
      table.appendChild(fragment);

      // On click, we activate this tab. But only if this tab is active.
      if (!tab.hiddenState) {
        Utils.addEnterHandler(tr, async () => {
          await browser.tabs.update(tab.id, { active: true });
          window.close();
        });

        const closeTab = tr.querySelector(".trash-button");
        if (closeTab) {
          Utils.addEnterHandler(closeTab, async (e) => {
            await browser.tabs.remove(Number(e.target.id));
            window.close();
          });
        }
      }
    }
  },
});

// OPEN_NEW_CONTAINER_PICKER: Opens a new container tab.
// ----------------------------------------------------------------------------

Logic.registerPanel(OPEN_NEW_CONTAINER_PICKER, {
  panelSelector: "#container-picker-panel",

  // This method is called when the object is registered.
  initialize() {
  },

  // This method is called when the panel is shown.
  prepare() {
    Logic.listenToPickerBackButton();
    document.getElementById("picker-title").textContent = browser.i18n.getMessage("openANewTabIn");
    const fragment = document.createDocumentFragment();
    const pickedFunction = function (identity) {
      try {
        browser.tabs.create({
          cookieStoreId: identity.cookieStoreId
        });
        window.close();
      } catch {
        window.close();
      }
    };

    document.getElementById("new-container-div").innerHTML = "";

    Logic.identities().forEach(identity => {
      const tr = document.createElement("tr");
      tr.classList.add("menu-item", "hover-highlight", "keyboard-nav");
      tr.setAttribute("tabindex", "0");
      const td = document.createElement("td");

      td.innerHTML = Utils.escaped`
        <div class="menu-icon">
          <div class="usercontext-icon"
            data-identity-icon="${identity.icon}"
            data-identity-color="${identity.color}">
          </div>
        </div>
        <span class="menu-text">${identity.name}</span>`;

      fragment.appendChild(tr);

      tr.appendChild(td);

      Utils.addEnterHandler(tr, () => {
        pickedFunction(identity);
      });

    });

    const list = document.querySelector("#picker-identities-list");

    list.innerHTML = "";
    list.appendChild(fragment);

    return Promise.resolve(null);
  }
});

// MANAGE_CONTAINERS_PICKER: Makes the list editable.
// ----------------------------------------------------------------------------

Logic.registerPanel(MANAGE_CONTAINERS_PICKER, {
  panelSelector: "#container-picker-panel",

  // This method is called when the object is registered.
  initialize() {
  },

  // This method is called when the panel is shown.
  async prepare() {
    Logic.listenToPickerBackButton();
    const closeContEl = document.querySelector("#close-container-picker-panel");
    if (!this._listenerSet) {
      Utils.addEnterHandler(closeContEl, () => {
        Logic.showPanel(P_CONTAINERS_LIST);
      });
      this._listenerSet = true;
    }
    document.getElementById("picker-title").textContent = browser.i18n.getMessage("manageContainers");
    const fragment = document.createDocumentFragment();
    const pickedFunction = function (identity) {
      Logic.showPanel(P_CONTAINER_EDIT, identity);
    };

    document.getElementById("new-container-div").innerHTML = Utils.escaped`
      <table class="menu">
        <tr class="menu-item hover-highlight keyboard-nav" id="new-container" tabindex="0">
          <td>
            <div class="menu-icon"><img src="/img/new-16.svg" />
            </div>
            <span class="menu-text">${ browser.i18n.getMessage("newContainer") }</span>
          </td>
        </tr>
      </table>
      <hr>
    `;

    Utils.addEnterHandler(document.querySelector("#new-container"), () => {
      Logic.showPanel(P_CONTAINER_EDIT, { name: Logic.generateIdentityName() });
    });

    const identities = Logic.identities();

    for (const identity of identities) {
      const tr = document.createElement("tr");
      tr.classList.add("menu-item", "hover-highlight", "keyboard-nav");
      tr.setAttribute("tabindex", "0");
      tr.setAttribute("data-cookie-store-id", identity.cookieStoreId);

      const td = document.createElement("td");

      td.innerHTML = Utils.escaped`
        <div class="menu-icon hover-highlight">
          <div class="usercontext-icon"
            data-identity-icon="${identity.icon}"
            data-identity-color="${identity.color}">
          </div>
        </div>
        <span class="menu-text">${identity.name}</span>
        <span class="move-button">
          <img
            class="pop-button-image"
            src="/img/container-move.svg"
          />
        </span>`;

      fragment.appendChild(tr);

      tr.appendChild(td);

      tr.draggable = true;
      tr.dataset.containerId = identity.cookieStoreId;
      tr.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData(CONTAINER_DRAG_DATA_TYPE, identity.cookieStoreId);
      });
      tr.addEventListener("dragover", (e) => {
        if (e.dataTransfer.types.includes(CONTAINER_DRAG_DATA_TYPE)) {
          tr.classList.add("drag-over");
          e.preventDefault();
        }
      });
      tr.addEventListener("dragenter", (e) => {
        if (e.dataTransfer.types.includes(CONTAINER_DRAG_DATA_TYPE)) {
          e.preventDefault();
          tr.classList.add("drag-over");
        }
      });
      tr.addEventListener("dragleave", (e) => {
        if (e.dataTransfer.types.includes(CONTAINER_DRAG_DATA_TYPE)) {
          e.preventDefault();
          tr.classList.remove("drag-over");
        }
      });
      tr.addEventListener("drop", async (e) => {
        e.preventDefault();
        const parent = tr.parentNode;
        const containerId = e.dataTransfer.getData(CONTAINER_DRAG_DATA_TYPE);
        let droppedElement;
        parent.childNodes.forEach((node) => {
          if (node.dataset.containerId === containerId) {
            droppedElement = node;
          }
        });
        if (droppedElement && droppedElement !== tr) {
          tr.classList.remove("drag-over");
          parent.insertBefore(droppedElement, tr);
          await Logic.saveContainerOrder(parent.childNodes);
          await Logic.refreshIdentities();
        }
      });

      Utils.addEnterHandler(tr, () => {
        pickedFunction(identity);
      });
    }

    const list = document.querySelector("#picker-identities-list");

    list.innerHTML = "";
    list.appendChild(fragment);

    return Promise.resolve();
  }
});

// REOPEN_IN_CONTAINER_PICKER: Makes the list editable.
// ----------------------------------------------------------------------------

Logic.registerPanel(REOPEN_IN_CONTAINER_PICKER, {
  panelSelector: "#container-picker-panel",

  // This method is called when the object is registered.
  initialize() {
  },

  // This method is called when the panel is shown.
  async prepare() {
    Logic.listenToPickerBackButton();
    document.getElementById("picker-title").textContent = browser.i18n.getMessage("reopenThisSiteIn");
    const fragment = document.createDocumentFragment();
    const currentTab = await Utils.currentTab();
    const pickedFunction = function (identity) {
      const newUserContextId = Utils.userContextId(identity.cookieStoreId);
      Utils.reloadInContainer(
        currentTab.url,
        false,
        newUserContextId,
        currentTab.index + 1,
        currentTab.active,
        currentTab.groupId
      );
      window.close();
    };

    document.getElementById("new-container-div").innerHTML = "";

    if (currentTab.cookieStoreId !== "firefox-default") {
      const tr = document.createElement("tr");
      tr.classList.add("menu-item", "hover-highlight", "keyboard-nav");
      tr.setAttribute("tabindex", "0");
      const td = document.createElement("td");

      td.innerHTML = Utils.escaped`
        <div class="menu-icon hover-highlight">
          <div class="mac-icon">
          </div>
        </div>
        <span class="menu-text">Default Container</span>`;

      fragment.appendChild(tr);

      tr.appendChild(td);

      Utils.addEnterHandler(tr, () => {
        Utils.reloadInContainer(
          currentTab.url,
          false,
          0,
          currentTab.index + 1,
          currentTab.active,
          currentTab.groupId
        );
        window.close();
      });
    }

    Logic.identities().forEach(identity => {
      if (currentTab.cookieStoreId !== identity.cookieStoreId) {
        const tr = document.createElement("tr");
        tr.classList.add("menu-item", "hover-highlight", "keyboard-nav");
        tr.setAttribute("tabindex", "0");
        const td = document.createElement("td");

        td.innerHTML = Utils.escaped`
        <div class="menu-icon hover-highlight">
          <div class="usercontext-icon"
            data-identity-icon="${identity.icon}"
            data-identity-color="${identity.color}">
          </div>
        </div>
        <span class="menu-text">${identity.name}</span>`;

        fragment.appendChild(tr);

        tr.appendChild(td);

        Utils.addEnterHandler(tr, () => {
          pickedFunction(identity);
        });
      }
    });

    const list = document.querySelector("#picker-identities-list");

    list.innerHTML = "";
    list.appendChild(fragment);

    return Promise.resolve(null);
  }
});

// ALWAYS_OPEN_IN_PICKER: Makes the list editable.
// ----------------------------------------------------------------------------

Logic.registerPanel(ALWAYS_OPEN_IN_PICKER, {
  panelSelector: "#container-picker-panel",

  // This method is called when the object is registered.
  initialize() {
  },

  // This method is called when the panel is shown.
  async prepare() {
    const identities = Logic.identities();
    Logic.listenToPickerBackButton();
    document.getElementById("picker-title").textContent = browser.i18n.getMessage("alwaysOpenIn");
    const fragment = document.createDocumentFragment();

    document.getElementById("new-container-div").innerHTML = "";

    for (const identity of identities) {
      const tr = document.createElement("tr");
      tr.classList.add("menu-item", "hover-highlight", "keyboard-nav");
      tr.setAttribute("tabindex", "0");
      const td = document.createElement("td");

      td.innerHTML = Utils.escaped`
        <div class="menu-icon hover-highlight">
          <div class="usercontext-icon"
            data-identity-icon="${identity.icon}"
            data-identity-color="${identity.color}">
          </div>
        </div>
        <span class="menu-text">${identity.name}</span>
        `;

      fragment.appendChild(tr);

      tr.appendChild(td);

      Utils.addEnterHandler(tr, () => {
        Utils.alwaysOpenInContainer(identity);
        window.close();
      });
    }

    const list = document.querySelector("#picker-identities-list");

    list.innerHTML = "";
    list.appendChild(fragment);

    return Promise.resolve(null);
  }
});

// P_CONTAINER_ASSIGNMENTS: Shows Site Assignments and allows editing.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_CONTAINER_ASSIGNMENTS, {
  panelSelector: "#edit-container-assignments",

  // This method is called when the object is registered.
  initialize() {  },

  // This method is called when the panel is shown.
  async prepare() {
    const identity = Logic.currentIdentity();

    // Populating the panel: name and icon
    document.getElementById("edit-assignments-title").textContent = identity.name;

    const userContextId = Logic.currentUserContextId();
    const assignments = await Logic.getAssignmentObjectByContainer(userContextId);
    this.showAssignedContainers(assignments);

    // Wire manual assignment handlers
    const addBtn = document.getElementById("manual-assignment-add-btn");
    const assignmentInput = document.getElementById("manual-assignment-input");

    addBtn.addEventListener("click", () => this.handleManualAssignment());
    assignmentInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleManualAssignment();
      }
    });

    return Promise.resolve(null);
  },

  showAssignedContainers(assignments) {
    const closeContEl = document.querySelector("#close-container-assignment-panel");
    Utils.addEnterHandler(closeContEl, () => {
      const identity = Logic.currentIdentity();
      Logic.showPanel(P_CONTAINER_EDIT, identity, false, false);
    });

    const assignmentPanel = document.getElementById("edit-sites-assigned");
    const assignmentKeys = Object.keys(assignments);
    assignmentPanel.hidden = !(assignmentKeys.length > 0);
    if (assignments) {
      const tableElement = document.querySelector("#edit-sites-assigned");
      /* Remove previous assignment list,
         after removing one we rerender the list */
      while (tableElement.firstChild) {
        tableElement.firstChild.remove();
      }
      assignmentKeys.forEach((siteKey) => {
        const site = assignments[siteKey];
        const trElement = document.createElement("tr");
        /* As we don't have the full or correct path the best we can assume is the path is HTTPS and then replace with a broken icon later if it doesn't load.
           This is pending a better solution for favicons from web extensions */
        const assumedUrl = `https://${site.hostname}/favicon.ico`;
        const resetSiteCookiesInfo = browser.i18n.getMessage("clearSiteCookiesTooltipInfo");
        const deleteSiteInfo = browser.i18n.getMessage("deleteSiteTooltipInfo");
        trElement.innerHTML = Utils.escaped`
        <td>
          <div class="favicon"></div>
          <span title="${site.hostname}" class="menu-text truncate-text">${site.hostname}</span>
          <img title="${resetSiteCookiesInfo}" class="reset-button reset-assignment" src="/img/refresh-16.svg" />
          <img title="${deleteSiteInfo}" class="trash-button delete-assignment"  src="/img/container-delete.svg" />
        </td>`;
        trElement.getElementsByClassName("favicon")[0].appendChild(Utils.createFavIconElement(assumedUrl));
        const deleteButton = trElement.querySelector(".trash-button");
        Utils.addEnterHandler(deleteButton, async () => {
          const userContextId = Logic.currentUserContextId();
          // Lets show the message to the current tab
          // const currentTab = await Utils.currentTab();
          Utils.setOrRemoveAssignment(false, assumedUrl, userContextId, true);
          delete assignments[siteKey];
          this.showAssignedContainers(assignments);
        });
        const resetButton = trElement.querySelector(".reset-button");
        Utils.addEnterHandler(resetButton, async () => {
          const cookieStoreId = Logic.currentCookieStoreId();
          const granted = await browser.permissions.request({ permissions: ["browsingData"] });
          if (!granted) {
            return;
          }
          const result = await Utils.resetCookiesForSite(site.hostname, cookieStoreId);
          if (result === true) {
            Logic.notify({messageId: "cookiesClearedSuccess", placeholders: [site.hostname]});
          } else {
            Logic.notify({messageId: "cookiesCouldNotBeCleared", placeholders: [site.hostname]});
          }
        });
        trElement.classList.add("menu-item", "hover-highlight", "keyboard-nav");
        tableElement.appendChild(trElement);
      });
    }
  },

  async handleManualAssignment() {
    const input = document.getElementById("manual-assignment-input");
    const errorEl = document.getElementById("manual-assignment-error");
    const value = input.value;
    const result = extractHostname(value);

    if (!result.valid) {
      errorEl.textContent = "Please enter a valid website address";
      errorEl.classList.remove("hide");
      return;
    }

    errorEl.classList.add("hide");
    const userContextId = Logic.currentUserContextId();

    try {
      await Utils.setOrRemoveAssignment(false, "https://" + result.hostname, userContextId, false);
      input.value = "";
      const assignments = await Logic.getAssignmentObjectByContainer(userContextId);
      this.showAssignedContainers(assignments);
    } catch (e) {
      errorEl.textContent = "Failed to add site assignment";
      errorEl.classList.remove("hide");
    }
  },
});

// P_CONTAINER_EDIT: Editor for a container.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_CONTAINER_EDIT, {
  panelSelector: "#edit-container-panel",

  // This method is called when the object is registered.
  async initialize() {
    this.initializeRadioButtons();

    Utils.addEnterHandler(document.querySelector("#close-container-edit-panel"), () => {
      // Resets listener from siteIsolation checkbox to keep the update queue to 0.
      const siteIsolation = document.querySelector("#site-isolation");
      siteIsolation.removeEventListener("change", addRemoveSiteIsolation, false);
      const formValues = new FormData(this._editForm);
      if (formValues.get("container-id") !== NEW_CONTAINER_ID) {
        this._submitForm();
      } else {
        Logic.showPreviousPanel();
      }
    });

    this._editForm = document.getElementById("edit-container-panel-form");
    this._editForm.addEventListener("submit", () => {
      this._submitForm();
    });
    Utils.addEnterHandler(document.querySelector("#create-container-cancel-link"), () => {
      Logic.showPanel(MANAGE_CONTAINERS_PICKER);
    });

    Utils.addEnterHandler(document.querySelector("#create-container-ok-link"), () => {
      this._submitForm();
    });
  },

  async _submitForm() {
    const formValues = new FormData(this._editForm);

    try {
      await browser.runtime.sendMessage({
        method: "createOrUpdateContainer",
        message: {
          userContextId: formValues.get("container-id") || NEW_CONTAINER_ID,
          params: {
            name: document.getElementById("edit-container-panel-name-input").value || Logic.generateIdentityName(),
            icon: formValues.get("container-icon") || DEFAULT_ICON,
            color: formValues.get("container-color") || DEFAULT_COLOR
          },
        }
      });
      await Logic.refreshIdentities();
      Logic.showPreviousPanel();
    } catch {
      Logic.showPreviousPanel();
    }
  },

  // This prevents identity edits (change of icon, color, etc)
  // from getting lost when navigating to and from one
  // of the edit sub-pages (advanced proxy settings, for instance).
  getEditInProgressIdentity() {
    const formValues = new FormData(this._editForm);
    const editedIdentity = Logic.currentIdentity();

    editedIdentity.color = formValues.get("container-color") || DEFAULT_COLOR;
    editedIdentity.icon = formValues.get("container-icon") || DEFAULT_ICON;
    editedIdentity.name = document.getElementById("edit-container-panel-name-input").value || Logic.generateIdentityName();
    return editedIdentity;
  },

  initializeRadioButtons() {
    const colorRadioTemplate = (containerColor) => {
      return Utils.escaped`<input type="radio" value="${containerColor}" name="container-color" id="edit-container-panel-choose-color-${containerColor}" />
     <label for="edit-container-panel-choose-color-${containerColor}" class="usercontext-icon choose-color-icon" data-identity-icon="circle" data-identity-color="${containerColor}">`;
    };
    const colors = ["blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple"];
    const colorRadioFieldset = document.getElementById("edit-container-panel-choose-color");
    colors.forEach((containerColor) => {
      const templateInstance = document.createElement("div");
      templateInstance.classList.add("radio-container");
      // eslint-disable-next-line no-unsanitized/property
      templateInstance.innerHTML = colorRadioTemplate(containerColor);
      colorRadioFieldset.appendChild(templateInstance);
    });

    const iconRadioTemplate = (containerIcon) => {
      return Utils.escaped`<input type="radio" value="${containerIcon}" name="container-icon" id="edit-container-panel-choose-icon-${containerIcon}" />
     <label for="edit-container-panel-choose-icon-${containerIcon}" class="usercontext-icon choose-color-icon" data-identity-color="grey" data-identity-icon="${containerIcon}">`;
    };
    const icons = ["fingerprint", "briefcase", "dollar", "cart", "vacation", "gift", "food", "fruit", "pet", "tree", "chill", "circle", "fence"];
    const iconRadioFieldset = document.getElementById("edit-container-panel-choose-icon");
    icons.forEach((containerIcon) => {
      const templateInstance = document.createElement("div");
      templateInstance.classList.add("radio-container");
      // eslint-disable-next-line no-unsanitized/property
      templateInstance.innerHTML = iconRadioTemplate(containerIcon);
      iconRadioFieldset.appendChild(templateInstance);
    });
  },

  // This method is called when the panel is shown.
  async prepare() {
    const identity = Logic.currentIdentity();

    // Populating the panel: name and icon
    document.getElementById("container-edit-title").textContent = identity.name;

    const userContextId = Logic.currentUserContextId();
    document.querySelector("#edit-container-panel .panel-footer").hidden = !!userContextId;
    document.querySelector("#edit-container-panel .delete-container").hidden = !userContextId;
    document.querySelector("#edit-container-options").hidden = !userContextId;

    Utils.addEnterHandler(document.querySelector("#manage-assigned-sites-list"), () => {
      Logic.showPanel(P_CONTAINER_ASSIGNMENTS, this.getEditInProgressIdentity(), false, false);
    });

    document.querySelector("#edit-container-panel-name-input").value = identity.name || "";
    document.querySelector("#edit-container-panel-usercontext-input").value = userContextId || NEW_CONTAINER_ID;
    const containerName = document.querySelector("#edit-container-panel-name-input");
    window.requestAnimationFrame(() => {
      containerName.select();
      containerName.focus();
    });

    const siteIsolation = document.querySelector("#site-isolation");
    siteIsolation.checked = !!identity.isIsolated;
    siteIsolation.addEventListener( "change", addRemoveSiteIsolation, false);
    [...document.querySelectorAll("[name='container-color']")].forEach(colorInput => {
      colorInput.checked = colorInput.value === identity.color;
    });
    [...document.querySelectorAll("[name='container-icon']")].forEach(iconInput => {
      iconInput.checked = iconInput.value === identity.icon;
    });

    const deleteButton = document.getElementById("delete-container-button");
    Utils.addEnterHandler(deleteButton, () => {
      Logic.showPanel(P_CONTAINER_DELETE, this.getEditInProgressIdentity(), false, false);
    });

    if (!userContextId) {
      return;
    }
  },
});

// P_CLEAR_CONTAINER_STORAGE: Page for confirming container storage removal.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_CLEAR_CONTAINER_STORAGE, {
  panelSelector: "#clear-container-storage-panel",

  // This method is called when the object is registered.
  initialize() {

    Utils.addEnterHandler(document.querySelector("#clear-container-storage-cancel-link"), () => {
      const identity = Logic.currentIdentity();
      Logic.showPanel(P_CONTAINER_INFO, identity, false, false);
    });
    Utils.addEnterHandler(document.querySelector("#close-clear-container-storage-panel"), () => {
      const identity = Logic.currentIdentity();
      Logic.showPanel(P_CONTAINER_INFO, identity, false, false);
    });
    Utils.addEnterHandler(document.querySelector("#clear-container-storage-ok-link"), async () => {
      const identity = Logic.currentIdentity();
      const userContextId = Utils.userContextId(identity.cookieStoreId);
      const result = await browser.runtime.sendMessage({
        method: "deleteContainerDataOnly",
        message: { userContextId }
      });
      if (result.done === true) {
        Logic.notify({messageId: "storageWasClearedConfirmation", placeholders: [identity.name]});
      }
      Logic.showPanel(P_CONTAINER_INFO, identity, false, false);
    });
  },

  // This method is called when the panel is shown.
  prepare() {
    const identity = Logic.currentIdentity();
    
    // Populating the panel: name, icon, and warning message
    document.getElementById("container-clear-storage-title").textContent = identity.name;
    return Promise.resolve(null);
  },
});

// P_CONTAINER_DELETE: Delete a container.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_CONTAINER_DELETE, {
  panelSelector: "#delete-container-panel",

  // This method is called when the object is registered.
  initialize() {
    Utils.addEnterHandler(document.querySelector("#delete-container-cancel-link"), () => {
      const identity = Logic.currentIdentity();
      Logic.showPanel(P_CONTAINER_EDIT, identity, false, false);
    });
    Utils.addEnterHandler(document.querySelector("#close-container-delete-panel"), () => {
      const identity = Logic.currentIdentity();
      Logic.showPanel(P_CONTAINER_EDIT, identity, false, false);
    });
    Utils.addEnterHandler(document.querySelector("#delete-container-ok-link"), async () => {

      /* Strip "containerEdit" and "containerInfo" panels out of previousPanelPath so that
       a user is not returned to either an edit, or info panel for a container
       that has been deleted and no longer exists.
      */
      while (
        Logic._previousPanelPath[Logic._previousPanelPath.length - 1] === "containerEdit" ||
        Logic._previousPanelPath[Logic._previousPanelPath.length - 1] === "containerInfo") {
        Logic._previousPanelPath.pop();
      }

      /* This promise wont resolve if the last tab was removed from the window.
          as the message async callback stops listening, this isn't an issue for us however it might be in future
          if you want to do anything post delete do it in the background script.
          Browser console currently warns about not listening also.
      */
      try {
        await Logic.removeIdentity(Utils.userContextId(Logic.currentIdentity().cookieStoreId));
        await Logic.refreshIdentities();
        Logic.showPreviousPanel();
      } catch {
        Logic.showPreviousPanel();
      }
    });
  },

  // This method is called when the panel is shown.
  prepare() {
    const identity = Logic.currentIdentity();

    // Populating the panel: name, icon, and warning message
    document.getElementById("container-delete-title").textContent = identity.name;
    return Promise.resolve(null);
  },
});

// P_CONTAINERS_ACHIEVEMENT: Page for achievement.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_CONTAINERS_ACHIEVEMENT, {
  panelSelector: ".achievement-panel",

  // This method is called when the object is registered.
  initialize() {
    // Set done and move to the containers list panel.
    Utils.addEnterHandler(document.querySelector("#achievement-done-button"), async () => {
      await Logic.setAchievementDone("manyContainersOpened");
      Logic.showPanel(P_CONTAINERS_LIST);
    });
  },

  // This method is called when the panel is shown.
  prepare() {
    return Promise.resolve(null);
  },
});

// P_SURVEY_ACHIEVEMENT: A simple survey view.
// ----------------------------------------------------------------------------

Logic.registerPanel(P_SURVEY_ACHIEVEMENT, {
  panelSelector: ".survey-panel",

  // This method is called when the object is registered.
  initialize() {
    Utils.addEnterHandler(document.querySelector("#survey-achievement-done-button"), async () => {
      await Logic.setAchievementDone("surveyFinal");
      Logic.showPanel(P_CONTAINERS_LIST);
    });
    Utils.addEnterHandler(document.querySelector("#survey-button"), async () => {
      await Logic.setAchievementDone("surveyFinal");
      window.close();
    });
  },

  // This method is called when the panel is shown.
  prepare() {
    return Promise.resolve(null);
  },
});

Logic.init();

window.addEventListener("resize", function () {
  //for overflow menu
  const difference = window.innerWidth - document.body.offsetWidth;
  if (difference > 2) {
    //if popup is in the overflow menu, window will be larger than 300px

    const root = document.documentElement;
    root.classList.add("overflow");
  }
});
