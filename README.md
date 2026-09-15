# 今日 · 个人时间管理

这是根据《个人时间管理微信小程序 PRD V1.0》制作的第一版跨平台桌面软件。它不依赖微信，也不需要登录服务器，适合先自己使用或放到 GitHub 给朋友下载。

## 最新更新（v1.1.1）

- 修复延期任务从今天消失的问题：延期不再改写原计划日期，今天的任务和专注记录会继续保留。
- 延期任务支持“撤回延期”；升级时会自动迁移旧版本已经移到明天的延期任务。
- 移除主界面的“今日提示”，让今日页面更聚焦于任务和数据。
- 保持原有本地存储键不变，不会因为升级清空已有数据。

## 已实现

- 今日任务：快速添加、新建/编辑、分类、优先级、计划时段、Top 3
- 计时：开始、暂停、继续、完成；计时通过时间戳累计，刷新页面也不会丢失
- 任务状态：未开始、进行中、暂停、已完成、已延期
- 统计：今日 / 本周 / 本月，完成率、计划偏差、分类时间、专注柱状图
- 日历：查看历史日期的任务与完成率
- 我的：每日复盘、分类管理、JSON 数据导出、恢复演示数据
- 数据：Electron 本地存储持久化，当前不依赖服务器
- 手机：支持 PWA，可添加到 iPhone / 安卓主屏幕，并支持离线打开
- 原生手机 App：已加入 Capacitor Android / iOS 工程，不依赖微信小程序

## 下载软件

在 GitHub 的 Releases 页面下载对应系统的安装包：

- macOS：`.dmg`
- Windows：安装版 `.exe` 或免安装版 `portable.exe`
- Linux：`.AppImage` 或 `.deb`

如果只想在手机上使用，可以把仓库发布到 GitHub Pages，用手机浏览器打开页面后选择“添加到主屏幕”（iPhone 在 Safari 的分享菜单中操作），之后会像普通 App 一样从主屏幕打开。

## 直接安装手机 App

- Android：GitHub Releases 会提供 `.apk`，允许安装未知来源后可以直接安装，不需要上架应用商店。
- iPhone：仓库包含 `ios/` 原生工程。iPhone 的安装包必须经过 Apple 签名，可用 Xcode 直接安装到自己的手机，或用 TestFlight；不需要公开上架 App Store，但不能直接安装未签名的 IPA。

原生工程使用 Capacitor 生成，移动端资源由 `npm run mobile:prepare` 同步到 `www/`。开发机需要 Node.js 22.12 或更高版本；Android 需要 Android Studio，iPhone 需要 Xcode。

```bash
npm run mobile:android
npm run mobile:ios
```

仓库里的 `pages.yml` 已经配置好自动发布：把项目推送到 `main` 分支后，在 GitHub 的 Settings → Pages 中选择 GitHub Actions，之后每次更新都会自动发布手机版本。

## 开发运行

需要 Node.js 22.12 或更高版本。

```bash
npm install
npm start
```

## 打包

```bash
npm run dist:mac
npm run dist:win
npm run dist:linux
```

推送一个版本标签后，GitHub Actions 会自动在 macOS、Windows 和 Linux 环境构建并发布安装包：

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 运行

直接用浏览器打开 `index.html` 即可使用。也可以在当前目录启动任意静态文件服务器后访问该页面。

软件界面同时适配桌面窗口和窄屏尺寸。当前版本使用本地数据，后续如果需要多设备同步，再接入云端数据库即可。
