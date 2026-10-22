# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static marketing/landing page for **GAS-SAFE**, a Georgian gas service & gas-detector installation business (24/7), published in Georgian (default, site root), English (`/en/`) and Russian (`/ru/`) on https://gassafe.ge. No package manager, test suite or linter; the only tooling is a dependency-free Node build script.

```
src/template.html      markup for every language (no inline <script>/<style>, no on* attributes)
src/i18n/{ka,en,ru}.json  "page": texts for the template, "js": texts used by main.js
src/css/styles.css     the few non-Tailwind styles (body defaults, .modal-active, .glass-nav, scrollbar)
src/js/tailwind.config.js  Tailwind Play CDN theme; must load right after the CDN script
src/js/main.js         all behavior, loaded with defer
build.js               src/ -> dist/ (generated, git-ignored)
```

## Commands

- `node build.js` — regenerates `dist/`: `index.html`, `en/index.html`, `ru/index.html`, `js/i18n/<lang>.js`, copies css/js, writes `sitemap.xml` and `robots.txt`. Run after every change in `src/`; `dist/` is what gets deployed.
- Preview: `python3 -m http.server 8000 -d dist` → http://localhost:8000/ (language links are directory URLs like `en/`, so use a server rather than `file://`).

- Deploy: push to `main` on GitHub (`gassafe2026-stack/gas-safe`). `.github/workflows/deploy.yml` runs `node build.js` and publishes `dist/` to GitHub Pages; check runs with `gh run list`. The repo uses a local credential helper (`gh auth git-credential`), so pushes go through the active `gh` account, which must be `gassafe2026-stack`.

Never edit `dist/` by hand. Dependencies load from CDNs, so previews need network access: Tailwind Play CDN (classes are compiled in the browser, so any Tailwind class in the template works without extra tooling), Font Awesome 6.4.0, Google Fonts (Noto Sans Georgian + Noto Sans for Latin/Cyrillic).

## Internationalization & SEO

- In `src/template.html`, `{{key}}` is replaced with the HTML-escaped `page.key` of the current language; `{{{key}}}` is a value computed in `build.js` (asset base path, canonical URL, hreflang/og tags, language switcher links, JSON-LD). Unknown keys, and keys present in one locale but not the others, fail the build — add every new text to all three JSON files.
- Each page gets its own `<html lang>`, title/description, canonical URL, `hreflang` alternates (+ `x-default` → Georgian), `og:locale` + alternates, and `HomeAndConstructionBusiness` JSON-LD whose service prices are read from the `data-price` attributes on `#book-service` options. `SITE_URL` and the language list live at the top of `build.js`.
- `main.js` gets its strings from `window.I18N` (generated `js/i18n/<lang>.js`) via `t(key, vars)`; `formatPrice()` and `formatPoints()` (uses `Intl.PluralRules`, so `points` in the locale has `one`/`few`/`many`/`other` forms) handle language-specific word order. WhatsApp messages are sent in the page's language.
- Keep the Georgian copy as the source of truth; prices are in lari (`₾` in the UI, `GEL`/`лари` in titles).

## Analytics

- Google Analytics 4 is enabled by setting `GA_MEASUREMENT_ID` at the top of `build.js`; when empty, pages are built without `js/analytics.js`.
- `src/js/analytics.js` uses Consent Mode v2: analytics storage stays `denied` (no cookies) until the visitor accepts `#consent-banner`; the choice is kept in `localStorage` (`gassafe-consent`) and can be changed via the footer `[data-open-consent]` link. Ad-related consent is always denied.
- Events are sent from `main.js` through `track(name, params)` (a no-op without analytics): `generate_lead` (`lead_type`: `booking` | `emergency`, plus `service`, `value`, `currency`, `from_calculator` for bookings — fired when WhatsApp opens, not when the message is actually sent), `calculator_to_booking`, `open_emergency`, `click_call`, `click_whatsapp`, `click_viber` (with `placement` = nearest element id or `header`/`footer`).

## Structure

Page sections in order: language top bar, sticky nav (+ `#mobile-menu`), `#hero`, emergency banner, `#services` (service cards), `#calculator`, `#booking` (form), `#guarantee`, footer, then the `#emergency-modal` overlay and `#toast-container`.

`src/js/main.js` is a plain script of global functions (no framework, no modules). All event wiring happens in its `DOMContentLoaded` handler, keyed off ids and data attributes in the HTML — `[data-open-emergency]` (opens the modal), `[data-book-service]` (service cards), `[data-points-delta]` (calculator +/−), `#calc-to-booking`, `#direct-booking-form`, `#emergency-form`, `#emergency-close`. New interactive elements need a listener there, not an inline handler.

- **Price calculator** — `calculatePrice()`: (`data-price` of the selected `#calc-service` option + `DETECTOR_KIT_PRICE` if `isDetectorKitSelected()`) × `pointsCount` (global, clamped 1–10 by `adjustPoints`) — the kit is installed at every point. The kit checkbox (`#calc-addons`) is only shown and counted when the service is `detector`. Prices are duplicated: calculator `data-price`s, `#book-service` option `data-price`s and labels, and the hard-coded prices in the hero and on service cards.
- **Service keys** — `detector` / `leak` / `appliance` / `piping` link the pieces: they are the `#calc-service` option values and the `data-service` attributes on `#book-service` options. `selectServiceForBooking(key)` (called from service cards) and `transferCalcToBooking()` select the booking option by that key. `transferCalcToBooking()` also stores a `calcEstimate` snapshot; it is shown under the select (`#calc-estimate-note`) and used in the WhatsApp message only while the booking form still has the same service selected (`activeCalcEstimate()`), otherwise the message uses the option's `data-price`.
- **Forms → WhatsApp** — there is no backend. `handleDirectBooking` and `submitEmergency` build a message and call `openWhatsApp(lines)`, which opens `api.whatsapp.com/send` to `WHATSAPP_NUMBER` (top of the script) — not `wa.me`, whose redirect corrupts emoji. The customer still has to press send in WhatsApp. Forms are deliberately not cleared after submit (so a failed WhatsApp open can be retried). Afterwards a toast is shown via `showToast(message, type)` (`'success'` | `'emergency'`); it sets the message with `textContent`, since it contains user input.
- **Phone inputs** — inputs with `data-phone` get a custom validity check via `normalizePhone()` (9-digit Georgian number, optional `+995`), which also formats the number for the message.
- **Modal** — `openEmergencyModal` / `closeEmergencyModal` toggle `hidden` on `#emergency-modal` and `modal-active` on `<body>` to lock scrolling; it also closes on Escape and on a backdrop click.
