# Plan d'implémentation : Suppression VPN/Proxy et Sync

## Vue d'ensemble

Suppression méthodique de toutes les fonctionnalités VPN/Proxy et Sync de l'extension MAC-Enhanced. L'approche procède par couches : d'abord les fichiers dédiés, puis les modifications dans les fichiers partagés (background, UI, CSS, i18n), et enfin la validation.

## Tâches

- [x] 1. Supprimer les fichiers VPN/Proxy dédiés
  - Supprimer `src/js/mozillaVpn.js`
  - Supprimer `src/js/proxified-containers.js`
  - Supprimer `src/js/background/mozillaVpnBackground.js`
  - Supprimer les images VPN : `src/img/moz-vpn-connected.svg`, `src/img/moz-vpn-disconnected.svg`, `src/img/moz-vpn-logo.svg`, `src/img/moz-vpn-logo-light.svg`, `src/img/moz-vpn-onboarding.svg`, `src/img/onboarding-moz-vpn.svg`, `src/img/proxy-warning.svg`, `src/img/proxy-warning-light.svg`
  - Supprimer le répertoire `src/img/moz-vpn-status-icons/`
  - Supprimer le répertoire `src/img/flags/`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Supprimer les fichiers Sync dédiés
  - Supprimer `src/js/background/sync.js`
  - Supprimer `test/features/sync.test.js`
  - Supprimer `src/img/Sync.svg`
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Nettoyer le background
  - [x] 3.1 Nettoyer `src/js/background/index.html`
    - Supprimer les balises `<script>` pour `proxified-containers.js`, `mozillaVpnBackground.js` et `sync.js`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 3.2 Nettoyer `src/js/background/messageHandler.js`
    - Supprimer les 5 cas `MozillaVPN_*` du switch (`MozillaVPN_attemptPort`, `MozillaVPN_queryServers`, `MozillaVPN_queryStatus`, `MozillaVPN_getConnectionStatus`, `MozillaVPN_getInstallationStatus`)
    - Supprimer le cas `resetSync`
    - _Requirements: 3.1, 3.2_

  - [x] 3.3 Nettoyer `src/js/background/assignManager.js`
    - Supprimer la méthode `handleProxifiedRequest()` entièrement
    - Supprimer la méthode `maybeAddProxyListeners()` entièrement
    - Supprimer la méthode `getSyncEnabled()` entièrement
    - Dans `storageArea.set()` : supprimer la ligne `data.identityMacAddonUUID = await identityState.lookupMACaddonUUID(...)` et le bloc sync backup (`const syncEnabled = ...; if (backup && syncEnabled) { ... }`)
    - Dans `storageArea.remove()` : supprimer le bloc sync backup (`const syncEnabled = ...; if (shouldSync && syncEnabled) ...`)
    - Dans `init()` : supprimer l'appel `this.maybeAddProxyListeners()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 3.4 Nettoyer `src/js/background/backgroundLogic.js`
    - Dans `resetPermissions()` : supprimer le `case "nativeMessaging"` (appel à `MozillaVPN_Background.removeMozillaVpnProxies()` et `browser.runtime.reload()`)
    - Dans `resetPermissions()` : supprimer le `case "proxy"` (appel à `assignManager.maybeAddProxyListeners()`)
    - Dans `deleteContainer()` : supprimer la ligne `proxifiedContainers.delete(this.cookieStoreId(userContextId))`
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 4. Checkpoint - Vérifier que le background est cohérent
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Nettoyer le manifest et les utilitaires
  - [x] 5.1 Nettoyer `src/manifest.json`
    - Retirer `"nativeMessaging"` et `"proxy"` de `optional_permissions`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 5.2 Nettoyer `src/js/utils.js`
    - Supprimer la méthode `getBogusProxy()` entièrement
    - _Requirements: 11.1_

- [x] 6. Nettoyer l'interface popup
  - [x] 6.1 Nettoyer `src/popup.html`
    - Supprimer le panneau d'onboarding 8 (VPN) : `<div class="panel onboarding onboarding-panel-8">`
    - Supprimer le panneau d'onboarding 6 (Sync) : `<div class="panel onboarding onboarding-panel-6">`
    - Supprimer le panneau d'onboarding 7 (Sign-in) : `<div class="panel onboarding onboarding-panel-7">`
    - Supprimer le logotype Mozilla VPN dans l'en-tête de la liste des conteneurs (`h4.moz-vpn-logotype`)
    - Supprimer le fieldset proxies et `moz-vpn-container-ui` dans le formulaire d'édition de conteneur
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 6.2 Nettoyer `src/js/popup.js`
    - Supprimer les enregistrements de panneaux P_ONBOARDING_6, P_ONBOARDING_7, P_ONBOARDING_8
    - Supprimer les fonctions VPN : `openServerList`, `submitProxyForm`, `makeServerList`, `toggleCityListVisibility`, `checkActiveServer`
    - Supprimer les références à `proxifiedContainers` et `MozillaVPN`
    - Ajuster le flux d'onboarding : P_ONBOARDING_5 doit pointer directement vers P_CONTAINERS_LIST
    - _Requirements: 8.5, 8.6, 8.7_

- [x] 7. Nettoyer la page d'options
  - [x] 7.1 Nettoyer `src/options.html`
    - Supprimer la section `#moz-vpn-proxy-permissions` (permissions VPN/Proxy)
    - Supprimer le bouton "Learn more" de Mozilla VPN
    - Supprimer la section Sync (`#syncCheck` et son titre `<h3 data-i18n-message-id="sync">`)
    - Supprimer les balises script pour `mozillaVpn.js` et `proxified-containers.js`
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [x] 7.2 Nettoyer `src/js/options.js`
    - Supprimer la fonction `maybeShowPermissionsWarningIcon()`
    - Supprimer le handler du bouton `moz-vpn-learn-more`
    - Supprimer la fonction `enableDisableSync()` et le listener `#syncCheck`
    - Supprimer la logique `syncEnabled` dans `setupOptions()`
    - Supprimer les références à `MozillaVPN.bothPermissionsEnabled()` et `MozillaVPN.attachUtmParameters()`
    - _Requirements: 9.4_

- [x] 8. Nettoyer le pageActionPopup et les styles CSS
  - [x] 8.1 Nettoyer `src/pageActionPopup.html`
    - Supprimer les balises script pour `mozillaVpn.js` et `proxified-containers.js`
    - _Requirements: 10.1_

  - [x] 8.2 Nettoyer `src/css/popup.css`
    - Supprimer les variables CSS `--iconProxyWarning` et `--logoMozillaVpn` (thèmes clair et sombre)
    - Supprimer toutes les règles `.moz-vpn-*`
    - Supprimer les règles `.proxy-disabled`, `.proxy-unavailable`
    - Supprimer les règles `#moz-vpn-current-server`, `#current-proxy`
    - Supprimer les styles Advanced Proxy Settings
    - _Requirements: 12.1, 12.2_

  - [x] 8.3 Nettoyer `src/css/options.css`
    - Supprimer les règles `.moz-vpn-proxy-permissions` et associées
    - _Requirements: 12.3_

- [x] 9. Checkpoint - Vérifier l'intégrité de l'interface
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Nettoyer les traductions i18n
  - [x] 10.1 Supprimer les clés VPN/Proxy de toutes les locales
    - Pour chaque fichier `messages.json` dans `src/_locales/*/`, supprimer les clés : `proxyNowAvailable`, `onboarding-8-description`, `getMozillaVpn`, `moz-vpn-connected`, `moz-vpn-disconnected`, `invalidProxyAlert`, `mozillaVpnMustBeOn`, `tooltipWarning`, `advancedProxySettings`, `proxyInputLabel`, `clearproxylabel`, `protectYourContainers`, `protectThisContainer`, `integratewithmozillavpn`, `mozillaVpnAndProxyPermissionsTitle`, `proxyPermissionTitle`, `proxyPermissionDescription`, `chooseLocation`, `useCustomLocation`
    - _Requirements: 13.1_

  - [x] 10.2 Supprimer les clés Sync de toutes les locales
    - Pour chaque fichier `messages.json` dans `src/_locales/*/`, supprimer les clés : `onboarding-6-header`, `onboarding-6-description-2`, `onboarding-7-header-2`, `onboarding-7-description-2`, `startSyncing`, `sync`, `enableSync`, `enableSyncDescription`, `syncExclude`, `syncExcludePlaceholder`, `syncExcludeDescription`
    - _Requirements: 13.2_

  - [ ]* 10.3 Écrire un test property-based pour l'absence de clés i18n supprimées
    - **Property 3 : Absence de clés i18n supprimées dans toutes les locales**
    - **Validates: Requirements 13.1, 13.2**

  - [ ]* 10.4 Écrire un test property-based pour la conservation des clés i18n restantes
    - **Property 4 : Conservation des clés i18n non-VPN/Proxy/Sync**
    - **Validates: Requirements 13.3**

- [x] 11. Évaluer la simplification d'identityState.js
  - Examiner `src/js/background/identityState.js` pour déterminer si le système UUID (`lookupMACaddonUUID`, `lookupCookieStoreId`, `updateUUID`, `addUUID`, `getCookieStoreIDuuidMap`) est utilisé uniquement par le sync
  - Si oui, supprimer ces méthodes et le champ `macAddonUUID`
  - Si non, conserver en l'état
  - _Requirements: 4.3_

- [x] 12. Validation finale
  - [ ]* 12.1 Écrire un test property-based pour l'absence de références VPN/Proxy/Sync
    - **Property 1 : Absence de références VPN/Proxy/Sync dans le code source**
    - Scanner tous les fichiers JS restants pour vérifier l'absence des identifiants supprimés
    - **Validates: Requirements 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.6, 5.1, 5.2, 5.3, 11.1**

  - [ ]* 12.2 Écrire un test property-based pour la persistance round-trip des assignations
    - **Property 2 : Persistance round-trip des assignations de sites**
    - Utiliser `fast-check` pour générer des URLs et userContextIds aléatoires
    - **Validates: Requirements 4.5, 14.2**

  - [ ]* 12.3 Écrire un test pour le flux d'onboarding
    - **Property 5 : Intégrité du flux d'onboarding**
    - Vérifier que la progression depuis le panneau 5 mène directement à P_CONTAINERS_LIST
    - **Validates: Requirements 8.5, 14.3**

  - [ ]* 12.4 Écrire un test property-based pour le traitement des messages restants
    - **Property 6 : Traitement correct des messages restants**
    - Utiliser `fast-check` pour envoyer des messages aléatoires parmi les cas valides
    - **Validates: Requirements 3.3, 14.4**

- [x] 13. Checkpoint final - Vérifier l'intégrité complète
  - Ensure all tests pass, ask the user if questions arise.
  - Vérifier que l'extension se charge sans erreur dans Firefox
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

## Notes

- Les tâches marquées avec `*` sont optionnelles et peuvent être ignorées pour un MVP plus rapide
- Chaque tâche référence les exigences spécifiques pour la traçabilité
- Les checkpoints assurent une validation incrémentale
- Les tests property-based valident les propriétés de correction universelles
- Les tests unitaires valident les exemples spécifiques et cas limites
- Le nettoyage i18n (tâche 10) concerne 46+ locales et peut être scripté pour efficacité
