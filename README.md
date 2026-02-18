# MAC-Enhanced

Fork de [MAC-Enhanced](https://github.com/mozilla/multi-account-containers) par Mozilla, avec des améliorations ciblées et un nettoyage du code.

MAC-Enhanced vous permet de cloisonner chaque aspect de votre vie en ligne dans des onglets séparés — plus besoin d'ouvrir un autre navigateur juste pour consulter vos mails pro.

## Changelog

### v0.2.0 — Suppression VPN/Proxy et Sync

Nettoyage complet de l'extension pour retirer toutes les fonctionnalités liées à Mozilla VPN, aux proxies et à la synchronisation entre appareils.

- Suppression de tous les fichiers dédiés VPN/Proxy (`mozillaVpn.js`, `proxified-containers.js`, `mozillaVpnBackground.js`) et Sync (`sync.js`)
- Suppression des images VPN/Proxy (logos, icônes de statut, drapeaux de pays) et de l'icône Sync
- Nettoyage du background : suppression des cas de messages `MozillaVPN_*` et `resetSync`, des listeners proxy, de la sauvegarde sync dans l'AssignManager
- Retrait des permissions optionnelles `nativeMessaging` et `proxy` du manifest
- Suppression de la fonction utilitaire `getBogusProxy()`
- Nettoyage de l'interface popup : suppression des panneaux d'onboarding 6 (Sync), 7 (Sign-in) et 8 (VPN), du logotype VPN, des champs proxy dans l'éditeur de conteneur, et de toutes les fonctions VPN associées
- Simplification du flux d'onboarding : passage direct du panneau 5 à la liste des conteneurs
- Nettoyage de la page d'options : suppression des sections permissions VPN/Proxy et Sync
- Nettoyage du pageActionPopup : suppression des scripts VPN/Proxy et des références aux drapeaux
- Suppression de toutes les règles CSS liées au VPN/Proxy (variables, classes `.moz-vpn-*`, tooltips, server list, modal warning, permissions overlay)
- Suppression de 1500+ clés de traduction VPN/Proxy et Sync dans les 46 locales

### v0.1.0 — Assignation manuelle d'URL

Ajout de la possibilité d'assigner manuellement une URL à un conteneur directement depuis le panneau "Manage Site List", sans avoir besoin de naviguer d'abord vers le site.

- Ajout d'un champ de saisie et d'un bouton "+" au-dessus de la liste des sites assignés
- Extraction intelligente du hostname : accepte un hostname simple (`github.com`), une URL complète (`https://github.com/settings`) ou un hostname avec chemin (`github.com/settings`)
- Validation de l'entrée avec message d'erreur inline en cas de saisie invalide
- Soumission par clic sur le bouton ou par touche Entrée
- Rafraîchissement automatique de la liste après ajout
- Intégration visuelle native avec les thèmes clair et sombre de l'extension

## Licence

Ce code source est soumis aux termes de la Mozilla Public License, v. 2.0. Si une copie de la MPL n'a pas été distribuée avec ce fichier, vous pouvez en obtenir une à https://mozilla.org/MPL/2.0/.
