# Internationalization Guide

This directory stores locale assets that extend the Automation Script project
to multiple languages.

## Principles

- **Centralize Strings** – Keep user-facing copy in locale files instead of
  scattering text across Apps Script modules or HTML templates.
- **Sheet-Driven Config** – Reference translation keys from the Sheet Config tab
  or Script Properties so customers can control the active locale without code
  changes.
- **Fallbacks** – Always provide an English fallback. If a translation is
  missing, the app should gracefully degrade to the default text.

## Recommended Structure

```text
i18n/
├── README.md
├── en.json
├── es.json
└── ...additional locale files
```

- Store each locale in a JSON file keyed by message identifiers.
- Keep keys descriptive (e.g., `install.success`, `error.missingConfig`).
- Document any pluralization or formatting requirements inside comments at the
  top of the file.

## Workflow

1. Product or support teams propose translation updates.
2. Contributors update the relevant locale files and confirm formatting via the
   Apps Script UI.
3. Update acceptance tests or manual checklists to reference the new keys.
4. Include screenshots for languages with right-to-left scripts when applicable.

Maintaining translations alongside the automation code ensures customers
receive consistent experiences across regions.
