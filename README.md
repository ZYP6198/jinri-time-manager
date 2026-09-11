# 今日 · 个人时间管理

这是根据《个人时间管理微信小程序 PRD V1.0》制作的第一版跨平台桌面软件。它不依赖微信，也不需要登录服务器，适合先自己使用或放到 GitHub 给朋友下载。

## 已实现

- 今日任务：快速添加、新建/编辑、分类、优先级、计划时段、Top 3
- 计时：开始、暂停、继续、完成；计时通过时间戳累计，刷新页面也不会丢失
- 任务状态：未开始、进行中、暂停、已完成、已延期
- 统计：今日 / 本周 / 本月，完成率、计划偏差、分类时间、专注柱状图
- 日历：查看历史日期的任务与完成率
- 我的：每日复盘、分类管理、JSON 数据导出、恢复演示数据
- 数据：Electron 本地存储持久化，当前不依赖服务器
- 手机：支持 PWA，可添加到 iPhone / 安卓主屏幕，并支持离线打开

## 下载软件

在 GitHub 的 Releases 页面下载对应系统的安装包：

- macOS：`.dmg`
- Windows：安装版 `.exe` 或免安装版 `portable.exe`
- Linux：`.AppImage` 或 `.deb`

如果只想在手机上使用，可以把仓库发布到 GitHub Pages，用手机浏览器打开页面后选择“添加到主屏幕”（iPhone 在 Safari 的分享菜单中操作），之后会像普通 App 一样从主屏幕打开。

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
