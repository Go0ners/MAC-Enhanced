# MAC-Enhanced

A lightweight fork of Mozilla's [Multi-Account Containers](https://github.com/mozilla/multi-account-containers), with targeted improvements and a cleaner codebase.

## Why?

The original extension required you to actually visit a website before assigning it to a container. Setting up containers in advance meant opening each site manually — tedious and time-consuming. MAC-Enhanced fixes this with manual URL assignment: just type a hostname, hit Enter, done.

On top of that, the original ships with Mozilla VPN integration, proxy management, and cross-device sync — features many users simply don't need. These add complexity, extra permissions, and unused code. MAC-Enhanced strips all of that out, leaving a clean, focused container management tool.

## Changelog

### v0.2.0 — Remove VPN/Proxy and Sync

Full cleanup of all Mozilla VPN, proxy, and sync-related features.

- Removed all dedicated VPN/Proxy files (`mozillaVpn.js`, `proxified-containers.js`, `mozillaVpnBackground.js`) and Sync (`sync.js`)
- Removed VPN/Proxy images (logos, status icons, country flags) and Sync icon
- Cleaned background scripts: removed `MozillaVPN_*` and `resetSync` message handlers, proxy listeners, sync backup logic
- Removed `nativeMessaging` and `proxy` optional permissions from manifest
- Removed `getBogusProxy()` utility function
- Cleaned popup UI: removed onboarding panels 6 (Sync), 7 (Sign-in) and 8 (VPN), VPN logotype, proxy fields in container editor, and all VPN-related functions
- Simplified onboarding flow: panel 5 now goes straight to the containers list
- Cleaned options page: removed VPN/Proxy permissions and Sync sections
- Cleaned pageActionPopup: removed VPN/Proxy scripts and flag references
- Removed all VPN/Proxy CSS rules (variables, `.moz-vpn-*` classes, tooltips, server list, modal warning, permissions overlay)
- Removed 1500+ VPN/Proxy/Sync translation keys across 46 locales

### v0.1.0 — Manual URL Assignment

Added the ability to manually assign a URL to a container directly from the "Manage Site List" panel, without navigating to the site first.

- Added a text input and "+" button above the assigned sites list
- Smart hostname extraction: accepts a bare hostname (`github.com`), a full URL (`https://github.com/settings`), or a hostname with path (`github.com/settings`)
- Inline validation with error message on invalid input
- Submit by clicking the button or pressing Enter
- Auto-refresh of the site list after adding
- Native visual integration with both light and dark themes

## Download

[Download from Github](https://github.com/Go0ners/MAC-Enhanced/releases/tag/latest)  
[Download from Mozilla.org](https://addons.mozilla.org/firefox/downloads/file/4698700/05edbff8dc8c4e908af1-0.2.0.xpi)


## License

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, you can obtain one at https://mozilla.org/MPL/2.0/.
