const NUMBER_OF_KEYBOARD_SHORTCUTS = 10;

async function setUpCheckBoxes() {
  document.querySelectorAll("[data-permission-id]").forEach(async(el) => {
    const permissionId = el.dataset.permissionId;
    const permissionEnabled = await browser.permissions.contains({ permissions: [permissionId] });
    el.checked = !!permissionEnabled;
  });
}

function disablePermissionsInputs() {
  document.querySelectorAll("[data-permission-id").forEach(el => {
    el.disabled = true;
  });
}

function enablePermissionsInputs() {
  document.querySelectorAll("[data-permission-id").forEach(el => {
    el.disabled = false;
  });
}

document.querySelectorAll("[data-permission-id").forEach(async(el) => {
  const permissionId = el.dataset.permissionId;
  el.addEventListener("change", async() => {
    if (el.checked) {
      disablePermissionsInputs();
      const granted = await browser.permissions.request({ permissions: [permissionId] });
      if (!granted) {
        el.checked = false;
        enablePermissionsInputs();
      }
      return;
    }
    await browser.permissions.remove({ permissions: [permissionId] });
  });
});

async function enableDisableReplaceTab() {
  const checkbox = document.querySelector("#replaceTabCheck");
  await browser.storage.local.set({replaceTabEnabled: !!checkbox.checked});
}

async function changeTheme(event) {
  const theme = event.currentTarget;
  await browser.storage.local.set({currentTheme: theme.value});
  await browser.storage.local.set({currentThemeId: theme.selectedIndex});
}

async function setupOptions() {
  const { replaceTabEnabled } = await browser.storage.local.get("replaceTabEnabled");
  const { currentThemeId } = await browser.storage.local.get("currentThemeId");

  document.querySelector("#replaceTabCheck").checked = !!replaceTabEnabled;
  document.querySelector("#changeTheme").selectedIndex = currentThemeId;
  setupContainerShortcutSelects();
}

async function setupContainerShortcutSelects () {
  const keyboardShortcut = await browser.runtime.sendMessage({method: "getShortcuts"});
  const identities = await browser.contextualIdentities.query({});
  const fragment = document.createDocumentFragment();
  const noneOption = document.createElement("option");
  noneOption.value = "none";
  noneOption.id = "none";
  noneOption.textContent = "None";
  fragment.append(noneOption);

  for (const identity of identities) {
    const option = document.createElement("option");
    option.value = identity.cookieStoreId;
    option.id = identity.cookieStoreId;
    option.textContent = identity.name;
    fragment.append(option);
  }

  for (let i=0; i < NUMBER_OF_KEYBOARD_SHORTCUTS; i++) {
    const shortcutKey = "open_container_"+i;
    const shortcutSelect = document.getElementById(shortcutKey);
    shortcutSelect.appendChild(fragment.cloneNode(true));
    if (keyboardShortcut && keyboardShortcut[shortcutKey]) {
      const cookieStoreId = keyboardShortcut[shortcutKey];
      shortcutSelect.querySelector("#" + cookieStoreId).selected = true;
    }
  }
}

function storeShortcutChoice (event) {
  browser.runtime.sendMessage({
    method: "setShortcut",
    shortcut: event.target.id,
    cookieStoreId: event.target.value
  });
}

function resetOnboarding() {
  browser.storage.local.set({"onboarding-stage": 0});
}

async function resetPermissionsUi() {
  await setUpCheckBoxes();
  enablePermissionsInputs();
}

browser.permissions.onAdded.addListener(resetPermissionsUi);
browser.permissions.onRemoved.addListener(resetPermissionsUi);

document.addEventListener("DOMContentLoaded", setupOptions);
document.querySelector("#replaceTabCheck").addEventListener( "change", enableDisableReplaceTab);
document.querySelector("#changeTheme").addEventListener( "change", changeTheme);

for (let i=0; i < NUMBER_OF_KEYBOARD_SHORTCUTS; i++) {
  document.querySelector("#open_container_"+i)
    .addEventListener("change", storeShortcutChoice);
}

document.querySelectorAll("[data-btn-id]").forEach(btn => {
  btn.addEventListener("click", () => {
    switch (btn.dataset.btnId) {
    case "reset-onboarding":
      resetOnboarding();
      break;
    }
  });
});
resetPermissionsUi();
