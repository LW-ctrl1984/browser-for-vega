# Contributing to Browser for Vega

Thank you for helping improve Browser for Vega.

## Ground rules

- Keep the project clearly independent and unofficial.
- Do not imply sponsorship, certification, or endorsement by Amazon or any other platform/service provider.
- Do not add Amazon/Vega logos or third-party service logos as project branding.
- Do not add copyrighted entertainment artwork, screenshots, video frames, proprietary icons, or fonts unless redistribution rights are clear.
- Keep platform names descriptive and factual.
- Preserve license and attribution notices for third-party code.

## Code contributions

Before opening a pull request:

1. Keep changes focused and document user-visible behavior.
2. Test TV-remote navigation where relevant.
3. Avoid hard-coding user-facing strings; use the localization system.
4. Check both left-to-right and right-to-left layout behavior for UI changes that affect Arabic.
5. Update third-party notices when adding dependencies.
6. Do not include secrets, signing keys, credentials, device identifiers, or private account information.

## Localization

The initial localization target is:

- English
- Español
- 简体中文
- 繁體中文
- Filipino
- Tiếng Việt
- 한국어
- العربية

New strings should be added to the localization resources rather than embedded directly in UI code.

## Pull requests

A pull request should explain:

- What changed
- Why it changed
- How it was tested
- Whether it affects localization, licensing, privacy, security, or third-party content
