# Requirements Document

## Introduction

This feature adds the ability to manually assign a URL to a container directly from the "Manage Site List" panel in the MAC-Enhanced popup, without needing to navigate to the site first. A text input field and a "+" button are added above the existing assigned sites list, allowing users to type a hostname or full URL to create a new site assignment.

## Glossary

- **Popup**: The browser extension popup UI rendered from `src/popup.html`, controlled by `src/js/popup.js`
- **Manage_Site_List_Panel**: The panel (`#edit-container-assignments`) displayed when the user clicks "Manage Site List" from the container edit view, listing sites assigned to the current container
- **Assignment_Input**: The new text input field added above the assigned sites list for typing a hostname or URL
- **Add_Button**: The "+" button next to the Assignment_Input that triggers the assignment creation
- **Hostname_Extractor**: The logic that parses user input to extract a valid hostname, whether the input is a simple hostname or a full URL
- **Utils.setOrRemoveAssignment**: The existing API function in `src/js/utils.js` that sends a message to the background script to create or remove a site-to-container assignment
- **UserContextId**: The numeric identifier for a container (contextual identity) in Firefox

## Requirements

### Requirement 1: Manual URL Input UI

**User Story:** As a container user, I want to see a text input field and an add button above the assigned sites list in the Manage Site List panel, so that I can type a URL to assign to the current container.

#### Acceptance Criteria

1. WHEN the Manage_Site_List_Panel is displayed, THE Popup SHALL render an Assignment_Input text field and an Add_Button above the existing assigned sites table (`#edit-sites-assigned`)
2. THE Assignment_Input SHALL display a placeholder text "Enter a website (e.g., github.com)" in English
3. THE Add_Button SHALL display a "+" icon drawn in pure CSS with no text content in the HTML
4. WHEN a user hovers over the Add_Button, THE Popup SHALL apply a light gray background and blue color to the Add_Button

### Requirement 2: Hostname Extraction and Validation

**User Story:** As a container user, I want to type either a simple hostname or a full URL, so that the system correctly extracts the hostname regardless of input format.

#### Acceptance Criteria

1. WHEN the user provides a simple hostname (e.g., "github.com"), THE Hostname_Extractor SHALL use that value directly as the hostname
2. WHEN the user provides a full URL (e.g., "https://github.com/settings/profile"), THE Hostname_Extractor SHALL extract the hostname portion ("github.com") from the URL
3. WHEN the user provides input without a protocol prefix that contains path segments (e.g., "github.com/settings"), THE Hostname_Extractor SHALL prepend "https://" before parsing and extract the hostname
4. WHEN the user provides an empty or whitespace-only string, THE Hostname_Extractor SHALL reject the input as invalid
5. WHEN the user provides input that does not yield a valid hostname after extraction (e.g., "not a url!!!"), THE Hostname_Extractor SHALL reject the input as invalid
6. THE Hostname_Extractor SHALL produce a hostname that contains at least one dot and consists only of valid hostname characters (alphanumeric, hyphens, dots)

### Requirement 3: Assignment Creation

**User Story:** As a container user, I want to add a site assignment by typing a URL and clicking the add button, so that the site is always opened in the current container.

#### Acceptance Criteria

1. WHEN the user submits a valid hostname via the Add_Button or by pressing Enter, THE Popup SHALL call Utils.setOrRemoveAssignment with tabId set to false, a URL constructed as "https://{hostname}", the current container's UserContextId, and remove set to false
2. WHEN the assignment is successfully created, THE Popup SHALL clear the Assignment_Input field
3. WHEN the assignment is successfully created, THE Popup SHALL refresh the assigned sites list to display the newly added site
4. WHEN the user submits invalid input, THE Popup SHALL display a brief inline error message in English below the Assignment_Input indicating the input is not valid
5. IF the assignment creation fails, THEN THE Popup SHALL display an error message in English and retain the user's input in the Assignment_Input field

### Requirement 4: Styling and Visual Integration

**User Story:** As a container user, I want the manual URL input to blend seamlessly with the existing Manage Site List panel design, so that the feature feels native to the extension.

#### Acceptance Criteria

1. THE Assignment_Input SHALL use the existing extension CSS variables for input styling (background, border, text color) to match the current theme (light and dark)
2. THE Add_Button SHALL be styled as a compact square button with a "+" icon rendered using CSS `::before` pseudo-element
3. WHEN the Add_Button is in its default state, THE Add_Button SHALL appear discreet with subdued colors matching the panel background
4. THE Assignment_Input and Add_Button SHALL be laid out horizontally in a single row with consistent spacing
5. THE Popup SHALL display all user-facing messages (placeholder, errors) as hardcoded English strings

### Requirement 5: Keyboard Interaction

**User Story:** As a container user, I want to submit a URL by pressing Enter in the input field, so that I can quickly add assignments without using the mouse.

#### Acceptance Criteria

1. WHEN the user presses Enter while the Assignment_Input is focused and contains valid input, THE Popup SHALL trigger the same assignment creation as clicking the Add_Button
2. WHEN the user presses Enter while the Assignment_Input is empty or contains invalid input, THE Popup SHALL display the validation error without submitting
