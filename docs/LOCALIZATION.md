# Localization Plan

Browser for Vega targets eight interface languages for the initial localization set:

| Language | Suggested locale | Direction |
| --- | --- | --- |
| English | `en-US` | LTR |
| Spanish | `es` or `es-US` | LTR |
| Simplified Chinese | `zh-CN` | LTR |
| Traditional Chinese | `zh-TW` | LTR |
| Filipino | `fil` | LTR |
| Vietnamese | `vi` | LTR |
| Korean | `ko` | LTR |
| Arabic | `ar` | RTL |

## Requirements

- Do not hard-code user-facing strings in UI components.
- Keep a complete default English resource set.
- Fall back safely to English for missing strings during development.
- Treat Arabic as an RTL layout, not only a text translation.
- Test truncation and focus states on TV-sized layouts.
- Keep the product name **Browser for Vega** consistent unless a locale-specific rendering is intentionally approved.

The About page should localize labels and explanatory text while preserving legally important brand-status meaning.
