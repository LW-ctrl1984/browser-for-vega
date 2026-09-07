# Browser for Vega

> An independent, unofficial web browser project intended for use with Amazon Vega OS.

**This app was not created or endorsed by Amazon.**

Browser for Vega is a community-developed project distributed independently through GitHub. It is not affiliated with, sponsored by, endorsed by, or otherwise officially associated with Amazon.com, Inc. or any of its affiliates.

The word **Vega** is used only to describe the intended platform compatibility and purpose of this project. This repository does not use Amazon or Vega logos as project branding.

## Project status

Browser for Vega is an independent sideload-focused project. It is not presented as an official Vega browser and is not an Amazon-developed application.

Source code and release packages will be maintained in this repository as development progresses.

## Project goals

- Web browsing on Vega OS
- TV-remote-friendly navigation
- Customizable appearance and colors
- About page with version information, GitHub link, open-source notices, and disclaimer
- Localized interface support for eight languages:
  - English
  - Español
  - 简体中文
  - 繁體中文
  - Filipino
  - Tiếng Việt
  - 한국어
  - العربية, including right-to-left layout support

## Installation

Release builds are intended to be distributed through this repository's **GitHub Releases** page as `.vpkg` packages for manual installation/sideloading on compatible Vega OS development environments.

Installation may require developer tools or developer-mode configuration provided for Vega OS. Users are responsible for following the platform's current installation and development requirements.

## About the name

**Browser for Vega** uses the word “Vega” only to identify the platform the software is designed to work with. The wording “for Vega” is intended to communicate compatibility and purpose, not ownership, sponsorship, endorsement, or official status.

## Trademark notice

Amazon, Vega, Vega OS, and related names, marks, logos, and product identifiers may be trademarks or other protected identifiers of their respective owners. No ownership or license in those third-party marks is claimed by this project.

No Amazon or Vega logo is included as part of this project's branding.

See [TRADEMARKS.md](TRADEMARKS.md) and [DISCLAIMER.md](DISCLAIMER.md) for additional information.

## Distribution note

This repository is an independent GitHub project and is **not** an Amazon Appstore listing.

Amazon's Appstore and Vega submission requirements can differ from the naming and descriptive use appropriate for an independent GitHub repository. If this project is ever submitted to the Amazon Appstore, its store metadata, title, screenshots, and other assets must be reviewed against Amazon's then-current submission requirements before submission.

## License

Unless otherwise noted, original source code in this repository is released under the [MIT License](LICENSE).

Third-party libraries, components, fonts, images, and other materials remain subject to their own licenses and terms. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes.

Please do not add third-party logos, streaming-service artwork, copyrighted screenshots, trademarked branding, television/movie imagery, or other protected assets unless the project has clear permission to redistribute them.

## Security

Please see [SECURITY.md](SECURITY.md) for guidance on reporting security issues.

## Disclaimer

This project is provided independently and on an “as is” basis, without warranties of any kind. Installation and use are at the user's own risk. See [DISCLAIMER.md](DISCLAIMER.md) for the full project disclaimer.

## Implemented features

- Google home page and URL/search input
- Remote-friendly side menu with back, forward, refresh, Home, URL input, web cursor, shortcuts, settings, and exit
- Custom site shortcuts with add, remove, and reorder controls
- Customizable overlay, inactive-item, and highlight colors
- English, Spanish, Simplified Chinese, Traditional Chinese, Filipino, Vietnamese, Korean, and Arabic UI localization
- Arabic right-to-left layout support
- Persistent app settings through Vega application storage
- JavaScript, DOM storage, cookies, and third-party cookies in the Vega WebView
- Remote-controlled page scrolling and an on-screen web cursor
- About, disclaimer, and open-source license pages

## Development environment

- Ubuntu 24.04 x86_64
- Node.js 20 or later
- Vega CLI 1.3.4
- Vega SDK 0.24.9914

Install the current Vega CLI and SDK by following Amazon's Vega developer documentation. The project produces a `.vpkg` package and does not produce an APK.

## Build

From the repository root:

```bash
npm install
npm run lint
npm test -- --runInBand
vega exec npm run build:release
```

After a successful build, locate the package with:

```bash
find build -name '*.vpkg' -type f
```

The application ID is `com.wang.vegabrowser.main`. Fire TV 4K Select uses the `armv7` release package.

## Sideload and launch

Connect a Fire TV development device and verify it is listed:

```bash
vega device list
```

Install and launch the release package:

```bash
vega device install-app --packagePath build/armv7-release/vegabrowser_armv7.vpkg
vega device launch-app --appName com.wang.vegabrowser.main
```

When more than one device is connected, add the device selector shown by `vega device list` to the commands. Developer-mode enrollment and device authorization must be completed according to Amazon's current Vega OS documentation.

## Testing

Run the automated checks:

```bash
npm run lint
npm test -- --runInBand
```

Vega Virtual Device on Ubuntu x86_64 does not currently provide the WebView behavior needed by this app, so browser behavior must also be tested on a physical Fire TV 4K Select. Test page loading, cookies, local storage, URL entry, remote focus, page scrolling, web-cursor clicking, custom shortcuts, localization, Arabic RTL layout, video playback, and exit confirmation.

Website behavior can vary because of user-agent checks, WebView detection, CAPTCHA, codecs, or DRM.
