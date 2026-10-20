# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static marketing/landing page for **GAS-SAFE**, a Georgian gas service & gas-detector installation business (24/7). There is no build step, package manager, test suite, linter, or git repo.

- `index.html` — markup only (no inline `<script>`/`<style>`, no `on*` attributes)
- `css/styles.css` — the few custom styles that aren't Tailwind utilities (body defaults, `.modal-active`, `.glass-nav`, scrollbar)
- `js/tailwind.config.js` — Tailwind Play CDN theme (custom `navy` / `amberAccent` colors, `Noto Sans Georgian` font); must load right after the CDN script
- `js/main.js` — all behavior, loaded with `defer`

All user-facing copy is in Georgian (`lang="ka"`); keep new text in Georgian and prices in lari (`₾`).

## Running

Open `index.html` directly in a browser (`open index.html`). It needs network access because all dependencies load from CDNs:
- Tailwind CSS via the Play CDN (`cdn.tailwindcss.com`) — classes are compiled in the browser, so any Tailwind class added to the HTML works without a rebuild
- Font Awesome 6.4.0 (cdnjs) for icons (`fa-solid ...` classes)
- Google Fonts: Noto Sans Georgian

## Structure

Page sections in order: sticky nav (+ `#mobile-menu`), `#hero`, emergency banner, `#services` (service cards), `#calculator`, `#booking` (form), `#guarantee`, footer, then the `#emergency-modal` overlay and `#toast-container`.

`js/main.js` is a plain script of global functions (no framework, no modules). All event wiring happens in its `DOMContentLoaded` handler, keyed off ids and data attributes in the HTML — `[data-open-emergency]` (opens the modal), `[data-book-service]` (service cards), `[data-points-delta]` (calculator +/−), `#calc-to-booking`, `#direct-booking-form`, `#emergency-form`, `#emergency-close`. New interactive elements need a listener there, not an inline handler.

- **Price calculator** — `calculatePrice()`: (`data-price` of the selected `#calc-service` option + `DETECTOR_KIT_PRICE` if `isDetectorKitSelected()`) × `pointsCount` (global, clamped 1–10 by `adjustPoints`) — the kit is installed at every point. The kit checkbox (`#calc-addons`) is only shown and counted when the service is `detector`. Prices are duplicated: calculator `data-price`s, `#book-service` option `data-price`s and labels, and the hard-coded prices in the hero and on service cards.
- **Service keys** — `detector` / `leak` / `appliance` / `piping` link the pieces: they are the `#calc-service` option values and the `data-service` attributes on `#book-service` options. `selectServiceForBooking(key)` (called from service cards) and `transferCalcToBooking()` select the booking option by that key. `transferCalcToBooking()` also stores a `calcEstimate` snapshot; it is shown under the select (`#calc-estimate-note`) and used in the WhatsApp message only while the booking form still has the same service selected (`activeCalcEstimate()`), otherwise the message uses the option's `data-price`.
- **Forms → WhatsApp** — there is no backend. `handleDirectBooking` and `submitEmergency` build a message and call `openWhatsApp(lines)`, which opens `api.whatsapp.com/send` to `WHATSAPP_NUMBER` (top of the script) — not `wa.me`, whose redirect corrupts emoji. The customer still has to press send in WhatsApp. Forms are deliberately not cleared after submit (so a failed WhatsApp open can be retried). Afterwards a toast is shown via `showToast(message, type)` (`'success'` | `'emergency'`); it sets the message with `textContent`, since it contains user input.
- **Phone inputs** — inputs with `data-phone` get a custom validity check via `normalizePhone()` (9-digit Georgian number, optional `+995`), which also formats the number for the message.
- **Modal** — `openEmergencyModal` / `closeEmergencyModal` toggle `hidden` on `#emergency-modal` and `modal-active` on `<body>` to lock scrolling; it also closes on Escape and on a backdrop click.
