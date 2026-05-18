# Alarm Countdown Card

A vanilla Web Component custom card for Home Assistant Lovelace dashboards that provides a live countdown to an alarm time, an inline toggle for arming/disarming, and a dismiss button for siren entities.

## Project Overview

- **Type:** Home Assistant Lovelace Custom Card (Dashboard)
- **Tech Stack:** Vanilla JavaScript (ES6+), CSS, HTML (Web Components)
- **Key Features:**
  - Live countdown (HH:MM:SS) supporting `input_datetime` and timestamp sensors.
  - Inline toggle for `homeassistant.toggle` compatible entities.
  - Contextual "Dismiss" button for any entity supporting `homeassistant.turn_off`.
  - Theme adaptation via CSS variables.
  - Zero dependencies.

## Architecture

The project is a single-file custom element implementation:
- `alarm-countdown-card.js`: Contains the `AlarmCountdownCard` class extending `HTMLElement`.
  - `setConfig(config)`: Handles card configuration.
  - `set hass(hass)`: Receives Home Assistant state updates.
  - `_buildDOM()`: Manually constructs the Shadow DOM using standard DOM APIs.
  - `_update()`: Periodically called (every 1s) to refresh the countdown and UI state.
  - `disconnectedCallback()`: Cleans up the update interval.

## Development Conventions

- **Vanilla JS:** Avoid adding external dependencies. Use standard DOM APIs for manipulation.
- **Shadow DOM:** Styles and structure are encapsulated within the Shadow DOM to prevent collision with HA's global styles.
- **HA Integration:**
  - Uses `ha-icon` for iconography.
  - Interacts with Home Assistant via `hass.callService`.
  - Respects HA themes using variables like `--ha-card-background` and `--primary-text-color`.
- **State Management:** The card is reactive to `hass` updates. Use the `_update()` method for all state-based UI changes.

## Building and Running

- **Build Step:** None. This is a vanilla JS project.
- **Testing:** No automated tests identified. Testing is performed manually by loading the card into a Home Assistant instance.
- **Deployment:**
  - **Manual:** Copy `alarm-countdown-card.js` to the `/config/www/` directory of a Home Assistant instance.
  - **HACS:** Supported via the `hacs.json` configuration.
  - **Release:** Automated via GitHub Actions (`.github/workflows/release.yml`) triggered by version tags (`v*`).

## Key Files

- `alarm-countdown-card.js`: The core implementation of the card.
- `hacs.json`: Metadata for HACS integration.
- `README.md`: User documentation, installation instructions, and configuration options.
- `LICENSE`: MIT License.
