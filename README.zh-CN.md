[English](README.md) | 简体中文

# Browser for Vega

> 一个面向 Amazon Vega OS 的独立、非官方网页浏览器项目。

**本应用并非由 Amazon 创建，也未获得 Amazon 认可。**

Browser for Vega 是一个由社区开发、通过 GitHub 独立分发的项目。它与 Amazon.com, Inc. 或其任何关联公司不存在隶属、赞助、认可或其他官方关系。

名称中的 **Vega** 仅用于说明本项目的目标平台兼容性和用途。本仓库未使用 Amazon 或 Vega 标志作为项目品牌。

## 为什么做这个项目？

部分较新的 Fire TV 设备运行 Vega OS。Vega OS 使用 VPKG 作为本地应用程序包格式，而不是传统 Fire OS 所使用的 Android APK，因此 Android APK 无法像过去一样直接作为本地应用安装到 Vega OS 设备上。

为 Vega OS 单独开发原生应用需要额外的开发工具和适配工作。Browser for Vega 因此被开发为一个面向 Vega OS 的轻量级通用网页浏览器，让用户可以直接通过 Fire TV 访问基于网页的服务，而不必为每一个网站分别开发一个 Vega 原生应用。

本项目为独立、非官方项目，与 Amazon 不存在隶属、赞助或认可关系。

## 项目状态

Browser for Vega 是一个以侧载为主要分发方式的独立项目。它不以官方 Vega 浏览器或 Amazon 开发的应用程序名义发布。

项目源码和发布安装包将随着开发进展在本仓库中维护。

## 项目目标

- 在 Vega OS 上浏览网页
- 适合电视遥控器的导航方式
- 可自定义外观与颜色
- 提供包含版本信息、GitHub 链接、开源声明和免责声明的关于页面
- 支持八种界面语言：
  - English
  - Español
  - 简体中文
  - 繁體中文
  - Filipino
  - Tiếng Việt
  - 한국어
  - العربية，并支持从右向左布局

## 安装

发布版本计划通过本仓库的 **GitHub Releases** 页面提供 `.vpkg` 安装包，用于在兼容的 Vega OS 开发环境中手动安装或侧载。

安装过程可能需要 Vega OS 提供的开发工具或开发者模式配置。用户应按照平台当前的安装与开发要求操作。

## 关于项目名称

**Browser for Vega** 中的“Vega”仅用于说明软件面向的平台及兼容用途。“for Vega”表示兼容性和用途，并不表示所有权、赞助、认可或官方身份。

## 商标声明

Amazon、Vega、Vega OS 以及相关名称、标志、徽标和产品标识可能属于其各自权利人的商标或其他受保护标识。本项目不主张拥有或取得这些第三方商标的许可。

本项目未将 Amazon 或 Vega 徽标用作项目品牌。

更多信息请参阅 [TRADEMARKS.md](TRADEMARKS.md) 和 [DISCLAIMER.md](DISCLAIMER.md)。

## 分发说明

本仓库是独立的 GitHub 项目，**不是** Amazon Appstore 商品页面。

Amazon Appstore 和 Vega 的提交要求可能不同于独立 GitHub 仓库中适用的描述性命名方式。如果将来把本项目提交到 Amazon Appstore，必须根据届时有效的 Amazon 要求重新审查商店元数据、标题、截图和其他素材。

## 许可证

除非另有说明，本仓库中的原创源代码均采用 [MIT License](LICENSE) 发布。

第三方库、组件、字体、图片和其他材料仍受其各自许可证和条款约束。详情请参阅 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 参与贡献

欢迎参与贡献。提交更改前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

除非项目已取得明确的再分发许可，否则请勿加入第三方徽标、流媒体服务素材、受版权保护的截图、商标品牌、影视图片或其他受保护素材。

## 安全

安全问题报告方式请参阅 [SECURITY.md](SECURITY.md)。

## 免责声明

本项目以独立方式按“现状”提供，不提供任何形式的保证。安装和使用风险由用户自行承担。完整免责声明请参阅 [DISCLAIMER.md](DISCLAIMER.md)。

## 已实现功能

- Google 默认主页和网址/搜索输入
- 适合遥控器操作的侧边菜单，包含后退、前进、刷新、主页、网址输入、网页光标、快捷网站、设置和退出
- 支持添加、删除和排序的自定义网站快捷项
- 可自定义遮罩、未选中菜单项和高亮颜色
- 支持英语、西班牙语、简体中文、繁体中文、菲律宾语、越南语、韩语和阿拉伯语界面
- 支持阿拉伯语从右向左布局
- 通过 Vega 应用存储持久保存设置
- Vega WebView 支持 JavaScript、DOM Storage、Cookie 和第三方 Cookie
- 遥控器控制网页滚动和屏幕网页光标
- 关于、免责声明和开源许可证页面

## 开发环境

- Ubuntu 24.04 x86_64
- Node.js 20 或更高版本
- Vega CLI 1.3.4
- Vega SDK 0.24.9914

请按照 Amazon 的 Vega 开发文档安装当前版本的 Vega CLI 和 SDK。本项目生成 `.vpkg` 安装包，不生成 APK。

## 构建

在仓库根目录运行：

```bash
npm install
npm run lint
npm test -- --runInBand
vega exec npm run build:release
```

构建成功后，可通过以下命令查找安装包：

```bash
find build -name '*.vpkg' -type f
```

应用 ID 为 `com.wang.webbrowser.main`。Fire TV 4K Select 使用 `armv7` release 安装包。

## 侧载与启动

连接 Fire TV 开发设备，并确认设备已被识别：

```bash
vega device list
```

安装并启动 release 安装包：

```bash
vega device install-app --packagePath build/armv7-release/vegabrowser_armv7.vpkg
vega device launch-app --appName com.wang.webbrowser.main
```

如果连接了多台设备，请在命令中加入 `vega device list` 所显示的设备选择参数。开发者模式注册和设备授权必须按照 Amazon 当前的 Vega OS 文档完成。

## 测试

运行自动检查：

```bash
npm run lint
npm test -- --runInBand
```

Ubuntu x86_64 上的 Vega Virtual Device 当前无法提供本应用所需的 WebView 行为，因此还必须在 Fire TV 4K Select 真机上测试浏览器功能。测试内容应包括网页载入、Cookie、localStorage、网址输入、遥控器焦点、页面滚动、网页光标点击、自定义快捷网站、多语言、阿拉伯语 RTL 布局、视频播放和退出确认。

网站可能因 User-Agent 检测、WebView 检测、验证码、编解码器或 DRM 而表现不同。
