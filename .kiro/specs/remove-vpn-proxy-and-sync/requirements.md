# Document d'exigences

## Introduction

Ce document décrit les exigences pour la suppression complète de toutes les fonctionnalités VPN/Proxy Mozilla et de synchronisation (sync) de l'extension navigateur MAC-Enhanced (fork de MAC-Enhanced). L'objectif est d'alléger le code, supprimer les dépendances inutilisées et simplifier l'extension en ne conservant que les fonctionnalités de gestion de conteneurs.

## Glossaire

- **Extension** : L'extension navigateur MAC-Enhanced (MAC-Enhanced Enhanced)
- **VPN_Proxy** : L'ensemble des fonctionnalités liées à Mozilla VPN et à la gestion de proxies par conteneur
- **Sync** : L'ensemble des fonctionnalités de synchronisation des conteneurs et assignations de sites entre plusieurs instances de Firefox
- **Conteneur** : Une identité contextuelle Firefox permettant d'isoler les cookies et données de navigation
- **Onboarding** : Le flux de panneaux d'introduction présentés à l'utilisateur lors de la première utilisation
- **AssignManager** : Le module gérant l'assignation de sites à des conteneurs spécifiques
- **BackgroundLogic** : Le module de logique métier exécuté en arrière-plan de l'extension
- **MessageHandler** : Le module gérant la communication par messages entre les composants de l'extension
- **Manifest** : Le fichier manifest.json décrivant les métadonnées et permissions de l'extension
- **i18n** : Le système d'internationalisation gérant les traductions dans plus de 45 locales

## Exigences

### Exigence 1 : Suppression des fichiers VPN/Proxy dédiés

**User Story :** En tant que mainteneur, je veux supprimer tous les fichiers source dédiés au VPN/Proxy, afin de réduire la taille du code et éliminer le code mort.

#### Critères d'acceptation

1. WHEN l'Extension est construite, THE Extension SHALL ne plus contenir le fichier `src/js/mozillaVpn.js`
2. WHEN l'Extension est construite, THE Extension SHALL ne plus contenir le fichier `src/js/proxified-containers.js`
3. WHEN l'Extension est construite, THE Extension SHALL ne plus contenir le fichier `src/js/background/mozillaVpnBackground.js`
4. WHEN l'Extension est construite, THE Extension SHALL ne plus contenir les images VPN (`moz-vpn-connected.svg`, `moz-vpn-disconnected.svg`, `moz-vpn-logo.svg`, `moz-vpn-logo-light.svg`, `moz-vpn-onboarding.svg`, `onboarding-moz-vpn.svg`, `proxy-warning.svg`, `proxy-warning-light.svg`)
5. WHEN l'Extension est construite, THE Extension SHALL ne plus contenir le répertoire `src/img/moz-vpn-status-icons/`
6. WHEN l'Extension est construite, THE Extension SHALL ne plus contenir le répertoire `src/img/flags/`

### Exigence 2 : Suppression des fichiers Sync dédiés

**User Story :** En tant que mainteneur, je veux supprimer tous les fichiers source dédiés à la synchronisation, afin d'éliminer le code mort et simplifier la base de code.

#### Critères d'acceptation

1. WHEN l'Extension est construite, THE Extension SHALL ne plus contenir le fichier `src/js/background/sync.js`
2. WHEN l'Extension est construite, THE Extension SHALL ne plus contenir le fichier `test/features/sync.test.js`
3. WHEN l'Extension est construite, THE Extension SHALL ne plus contenir l'image `src/img/Sync.svg`

### Exigence 3 : Nettoyage du MessageHandler

**User Story :** En tant que mainteneur, je veux supprimer les cas de messages VPN/Proxy et Sync du MessageHandler, afin que le routage de messages ne référence plus de code supprimé.

#### Critères d'acceptation

1. WHEN le MessageHandler reçoit un message, THE MessageHandler SHALL ne plus traiter les cas `MozillaVPN_attemptPort`, `MozillaVPN_queryServers`, `MozillaVPN_queryStatus`, `MozillaVPN_getConnectionStatus` et `MozillaVPN_getInstallationStatus`
2. WHEN le MessageHandler reçoit un message, THE MessageHandler SHALL ne plus traiter le cas `resetSync`
3. WHEN le MessageHandler traite un message valide restant, THE MessageHandler SHALL continuer à fonctionner correctement

### Exigence 4 : Nettoyage de l'AssignManager

**User Story :** En tant que mainteneur, je veux supprimer les références VPN/Proxy et Sync de l'AssignManager, afin que la gestion des assignations de sites fonctionne sans dépendances proxy ou sync.

#### Critères d'acceptation

1. WHEN l'AssignManager est initialisé, THE AssignManager SHALL ne plus enregistrer de listeners proxy via `maybeAddProxyListeners()`
2. WHEN l'AssignManager est initialisé, THE AssignManager SHALL ne plus contenir la méthode `handleProxifiedRequest()`
3. WHEN une assignation de site est enregistrée via `storageArea.set()`, THE AssignManager SHALL ne plus effectuer de sauvegarde sync ni stocker `identityMacAddonUUID`
4. WHEN une assignation de site est supprimée via `storageArea.remove()`, THE AssignManager SHALL ne plus effectuer de sauvegarde sync
5. WHEN une assignation de site est enregistrée ou supprimée, THE AssignManager SHALL continuer à persister les données localement de manière correcte
6. WHEN l'AssignManager est initialisé, THE AssignManager SHALL ne plus contenir la méthode `getSyncEnabled()`

### Exigence 5 : Nettoyage du BackgroundLogic

**User Story :** En tant que mainteneur, je veux supprimer les références VPN/Proxy du BackgroundLogic, afin que la logique métier ne dépende plus de modules supprimés.

#### Critères d'acceptation

1. WHEN les permissions sont réinitialisées, THE BackgroundLogic SHALL ne plus traiter le cas `nativeMessaging` (qui appelait `MozillaVPN_Background.removeMozillaVpnProxies()`)
2. WHEN les permissions sont réinitialisées, THE BackgroundLogic SHALL ne plus traiter le cas `proxy` (qui appelait `assignManager.maybeAddProxyListeners()`)
3. WHEN un conteneur est supprimé, THE BackgroundLogic SHALL ne plus appeler `proxifiedContainers.delete()`
4. WHEN les permissions `bookmarks` sont réinitialisées, THE BackgroundLogic SHALL continuer à fonctionner correctement

### Exigence 6 : Nettoyage de la page background (index.html)

**User Story :** En tant que mainteneur, je veux supprimer les balises script VPN/Proxy et Sync de la page background, afin que les scripts supprimés ne soient plus chargés.

#### Critères d'acceptation

1. WHEN la page background est chargée, THE Extension SHALL ne plus charger le script `proxified-containers.js`
2. WHEN la page background est chargée, THE Extension SHALL ne plus charger le script `mozillaVpnBackground.js`
3. WHEN la page background est chargée, THE Extension SHALL ne plus charger le script `sync.js`
4. WHEN la page background est chargée, THE Extension SHALL continuer à charger tous les autres scripts nécessaires au fonctionnement

### Exigence 7 : Nettoyage du Manifest

**User Story :** En tant que mainteneur, je veux supprimer les permissions optionnelles VPN/Proxy du manifest, afin que l'extension ne demande plus de permissions inutiles.

#### Critères d'acceptation

1. WHEN le Manifest est lu par Firefox, THE Manifest SHALL ne plus contenir `nativeMessaging` dans `optional_permissions`
2. WHEN le Manifest est lu par Firefox, THE Manifest SHALL ne plus contenir `proxy` dans `optional_permissions`
3. WHEN le Manifest est lu par Firefox, THE Manifest SHALL conserver les permissions `bookmarks` et `browsingData` dans `optional_permissions`

### Exigence 8 : Nettoyage de l'interface popup (popup.html et popup.js)

**User Story :** En tant qu'utilisateur, je veux que l'interface popup ne contienne plus d'éléments VPN/Proxy ni de panneaux d'onboarding Sync, afin d'avoir une interface épurée et cohérente.

#### Critères d'acceptation

1. WHEN le popup est affiché, THE Extension SHALL ne plus afficher le panneau d'onboarding 8 (VPN)
2. WHEN le popup est affiché, THE Extension SHALL ne plus afficher les panneaux d'onboarding 6 (Sync) et 7 (Sign-in)
3. WHEN le popup est affiché, THE Extension SHALL ne plus afficher le logotype Mozilla VPN dans l'en-tête de la liste des conteneurs
4. WHEN le formulaire d'édition de conteneur est affiché, THE Extension SHALL ne plus afficher les champs proxy (`fieldset.proxies`, `moz-vpn-container-ui`)
5. WHEN le flux d'onboarding est parcouru, THE Extension SHALL passer directement du panneau 5 à la liste des conteneurs (P_CONTAINERS_LIST)
6. WHEN le popup est affiché, THE Extension SHALL ne plus contenir de fonctions VPN (`openServerList`, `submitProxyForm`, `makeServerList`, `toggleCityListVisibility`, `checkActiveServer`)
7. WHEN le popup charge ses scripts, THE Extension SHALL ne plus référencer `mozillaVpn.js` ni `proxified-containers.js`

### Exigence 9 : Nettoyage de la page d'options (options.html et options.js)

**User Story :** En tant qu'utilisateur, je veux que la page d'options ne contienne plus de sections VPN/Proxy ni Sync, afin de ne voir que les paramètres pertinents.

#### Critères d'acceptation

1. WHEN la page d'options est affichée, THE Extension SHALL ne plus afficher la section de permissions VPN/Proxy (`#moz-vpn-proxy-permissions`)
2. WHEN la page d'options est affichée, THE Extension SHALL ne plus afficher le bouton "Learn more" de Mozilla VPN
3. WHEN la page d'options est affichée, THE Extension SHALL ne plus afficher la section Sync (`#syncCheck` et son titre)
4. WHEN la page d'options est affichée, THE Extension SHALL ne plus contenir les fonctions `enableDisableSync()` et `maybeShowPermissionsWarningIcon()`
5. WHEN la page d'options charge ses scripts, THE Extension SHALL ne plus référencer `mozillaVpn.js` ni `proxified-containers.js`

### Exigence 10 : Nettoyage du pageActionPopup

**User Story :** En tant que mainteneur, je veux supprimer les scripts VPN/Proxy du pageActionPopup, afin que cette page ne charge plus de code inutile.

#### Critères d'acceptation

1. WHEN le pageActionPopup charge ses scripts, THE Extension SHALL ne plus référencer `mozillaVpn.js` ni `proxified-containers.js`

### Exigence 11 : Nettoyage des utilitaires

**User Story :** En tant que mainteneur, je veux supprimer les fonctions utilitaires liées au proxy, afin d'éliminer le code mort.

#### Critères d'acceptation

1. WHEN le module utils.js est chargé, THE Extension SHALL ne plus contenir la méthode `getBogusProxy()`

### Exigence 12 : Nettoyage des styles CSS

**User Story :** En tant qu'utilisateur, je veux que les feuilles de style ne contiennent plus de règles VPN/Proxy, afin d'éviter du CSS mort et des références à des images supprimées.

#### Critères d'acceptation

1. WHEN les styles popup sont chargés, THE Extension SHALL ne plus contenir les variables CSS `--iconProxyWarning` et `--logoMozillaVpn`
2. WHEN les styles popup sont chargés, THE Extension SHALL ne plus contenir les règles `.moz-vpn-*`, `.proxy-disabled`, `.proxy-unavailable`, `#moz-vpn-current-server`, `#current-proxy` et les styles Advanced Proxy Settings
3. WHEN les styles options sont chargés, THE Extension SHALL ne plus contenir les règles `.moz-vpn-proxy-permissions`

### Exigence 13 : Nettoyage des traductions i18n

**User Story :** En tant que mainteneur, je veux supprimer les clés de traduction VPN/Proxy et Sync de toutes les locales, afin d'éliminer les chaînes orphelines.

#### Critères d'acceptation

1. WHEN les fichiers de traduction sont chargés, THE Extension SHALL ne plus contenir les clés VPN/Proxy : `proxyNowAvailable`, `onboarding-8-description`, `getMozillaVpn`, `moz-vpn-connected`, `moz-vpn-disconnected`, `invalidProxyAlert`, `mozillaVpnMustBeOn`, `tooltipWarning`, `advancedProxySettings`, `proxyInputLabel`, `clearproxylabel`, `protectYourContainers`, `protectThisContainer`, `integratewithmozillavpn`, `mozillaVpnAndProxyPermissionsTitle`, `proxyPermissionTitle`, `proxyPermissionDescription`, `chooseLocation`, `useCustomLocation`
2. WHEN les fichiers de traduction sont chargés, THE Extension SHALL ne plus contenir les clés Sync : `onboarding-6-header`, `onboarding-6-description-2`, `onboarding-7-header-2`, `onboarding-7-description-2`, `startSyncing`, `sync`, `enableSync`, `enableSyncDescription`, `syncExclude`, `syncExcludePlaceholder`, `syncExcludeDescription`
3. WHEN les fichiers de traduction sont chargés pour une locale donnée, THE Extension SHALL conserver toutes les autres clés de traduction intactes

### Exigence 14 : Intégrité fonctionnelle post-nettoyage

**User Story :** En tant qu'utilisateur, je veux que toutes les fonctionnalités restantes de l'extension continuent de fonctionner correctement après la suppression du VPN/Proxy et du Sync.

#### Critères d'acceptation

1. WHEN un utilisateur crée, modifie ou supprime un conteneur, THE Extension SHALL effectuer ces opérations correctement
2. WHEN un utilisateur assigne un site à un conteneur, THE Extension SHALL persister cette assignation localement et la respecter lors de la navigation
3. WHEN un utilisateur parcourt le flux d'onboarding, THE Extension SHALL afficher les panneaux 1 à 5 puis la liste des conteneurs sans erreur
4. WHEN l'Extension démarre, THE Extension SHALL s'initialiser sans erreur de référence à des modules supprimés
5. WHEN un utilisateur ouvre la page d'options, THE Extension SHALL afficher uniquement les paramètres restants sans erreur
