# Implementation Plan: Manual URL Assignment

## Overview

Add a text input and "+" button to the Manage Site List panel so users can manually assign URLs to containers. The implementation modifies three existing files (`popup.html`, `popup.css`, `popup.js`) and adds property-based tests using fast-check.

## Tasks

- [x] 1. Add HTML structure for the manual assignment input row
  - [x] 1.1 Add the `div.manual-assignment-row` with input, button, and error elements to `src/popup.html`
    - Insert between the `<hr>` and `div.scrollable.edit-sites-assigned` inside `#edit-container-assignments`
    - Input: `id="manual-assignment-input"`, `placeholder="Enter a website (e.g., github.com)"`
    - Button: `id="manual-assignment-add-btn"`, `title="Add site"`, no text content
    - Error div: `id="manual-assignment-error"`, class `manual-assignment-error hide`
    - _Requirements: 1.1, 1.2, 1.3, 4.5_

- [x] 2. Add CSS styles for the manual assignment row
  - [x] 2.1 Add styles for `.manual-assignment-row`, `#manual-assignment-input`, `#manual-assignment-add-btn`, and `.manual-assignment-error` to `src/css/popup.css`
    - `.manual-assignment-row`: `display: flex`, `align-items: center`, `gap: 8px`, `padding: 8px 16px`
    - `#manual-assignment-input`: `flex: 1`, `block-size: 32px`, uses existing CSS variables for theming
    - `#manual-assignment-add-btn`: `32px × 32px`, `border-radius: 4px`, `::before` pseudo-element with `content: "+"`, `font-size: 18px`
    - Hover state: `background-color: var(--menu-bg-hover-color)`, `color: var(--button-bg-color-primary)`
    - `.manual-assignment-error`: red text, small font, hidden by default
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 1.4_

- [x] 3. Implement hostname extraction and assignment logic in popup.js
  - [x] 3.1 Implement the `extractHostname(input)` pure function
    - Trim input, return invalid if empty
    - Prepend `https://` if no `://` present
    - Use `new URL()` to parse, extract `.hostname`
    - Validate: at least one dot, only `[a-zA-Z0-9.-]` characters
    - Return `{ valid, hostname }` object
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 Implement the `handleManualAssignment()` async handler in the assignments panel
    - Read input value, call `extractHostname`
    - If invalid: show error in `#manual-assignment-error`, return
    - If valid: call `Utils.setOrRemoveAssignment(false, "https://" + hostname, userContextId, false)`
    - On success: clear input, re-fetch and refresh list via `showAssignedContainers`
    - On failure: show error, keep input
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.3 Wire event handlers in the assignments panel's `prepare()` method
    - Click handler on `#manual-assignment-add-btn`
    - Keydown handler on `#manual-assignment-input` for Enter key
    - _Requirements: 5.1, 5.2_

- [ ] 4. Checkpoint - Verify manual assignment works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Install fast-check and add property-based tests
  - [ ] 5.1 Install fast-check as a dev dependency
    - Run `npm install --save-dev fast-check`
    - _Requirements: Testing infrastructure_

  - [ ]* 5.2 Write property test: Hostname extraction correctness (Property 1)
    - **Property 1: Hostname extraction correctness**
    - Generate random valid hostnames, wrap in random URL formats (with/without protocol, with paths), verify extraction returns the original hostname
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 5.3 Write property test: Invalid input rejection (Property 2)
    - **Property 2: Invalid input rejection**
    - Generate random whitespace strings and strings with invalid hostname characters, verify extraction returns `{ valid: false, hostname: null }`
    - **Validates: Requirements 2.4, 2.5**

  - [ ]* 5.4 Write property test: Output format invariant (Property 3)
    - **Property 3: Output format invariant**
    - For any input accepted as valid by extractHostname, verify the hostname contains at least one dot and matches `[a-zA-Z0-9.-]+`
    - **Validates: Requirements 2.6**

  - [ ]* 5.5 Write property test: Assignment API call correctness (Property 4)
    - **Property 4: Assignment API call correctness**
    - For any valid hostname, mock Utils.setOrRemoveAssignment and verify it is called with `(false, "https://{hostname}", userContextId, false)`
    - **Validates: Requirements 3.1**

- [ ] 6. Add unit tests for UI integration
  - [ ]* 6.1 Write unit tests for the manual assignment UI
    - Test panel renders input and button elements
    - Test valid input submission calls API and clears field
    - Test invalid input shows error message
    - Test Enter key triggers assignment
    - Test API failure retains input and shows error
    - _Requirements: 1.1, 3.2, 3.3, 3.4, 3.5, 5.1_

- [ ] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The feature modifies only existing files — no new source files are created
- All user-facing strings are hardcoded in English (no i18n message IDs)
- Property tests use fast-check with minimum 100 iterations each
- `extractHostname` is a pure function, making it ideal for property-based testing
