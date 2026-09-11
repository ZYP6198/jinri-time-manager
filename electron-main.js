const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 920,
    minHeight: 680,
    show: false,
    backgroundColor: "#f7f8fb",
    title: "今日 · 个人时间管理",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);
  window.loadFile(path.join(__dirname, "index.html"));
  window.once("ready-to-show", () => window.show());
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
