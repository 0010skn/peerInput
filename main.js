const electron = require("electron");
const url = require("url");
const path = require("path");
var robot = require("@jitsi/robotjs");
const { type } = require("os");
const {
  app,
  BrowserWindow,
  Menu,
  IncomingMessage,
  ipcMain,
  dialog,
  clipboard,
} = electron;

let window;
// Listen for app ready
app.on("ready", function () {
  window = new BrowserWindow({
    width: 900,
    height: 900,
    minHeight: 900,
    minWidth: 900,
    frame: false,
    title: "Loading...",
    resizable: true,
    backgroundColor: "#304042",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: false,
      devTools: false,
    },
  });
  window.loadURL(
    url.format({
      pathname: path.join(__dirname, "/browser/html/index.html"),
      protocol: "file",
      slashes: true,
    })
  );

  window.webContents.openDevTools();
  // 启用控制台输出转发
  window.webContents.on(
    "console-message",
    (event, level, message, line, sourceId) => {
      console.log("Renderer Process:", message);
    }
  );

  ipcMain.on("peer-id", (event, id) => {
    console.log("Peer ID from renderer:", id);
  });

  ipcMain.on("copy-id", (event, id) => {
    dialog.showMessageBox({
      title: "提示",
      message: "ID已复制到剪贴板",
    });
    clipboard.writeText(id);
  });

  ipcMain.on("screen-size", (event, int) => {
    var screenSize = robot.getScreenSize();

    //发送屏幕大小
    window.webContents.send("screen-size-reply", {
      width: screenSize.width,
      height: screenSize.height,
    });
  });

  ipcMain.on("keyboard", (event, key) => {
    robot.keyTap(key);
  });

  ipcMain.on("mouse-move", (event, targetX, targetY) => {
    if (targetX === null || targetY === null) {
      return;
    }
    robot.moveMouse(targetX, targetY);
  });
  ipcMain.on("mouse-event", (event, eventType) => {
    if (eventType === "mousedown") {
      robot.mouseClick();
    } else if (eventType === "mouseup") {
      robot.mouseClick();
    }
  });
  ipcMain.on("hide-to-tray", () => {
    window.hide();
  });
  ipcMain.on("close", () => {
    app.exit();
  });
  ipcMain.on("maximize", () => {
    window.maximize();
  });
  ipcMain.on("minimize", () => {
    window.minimize();
  });
  //window.loadURL("https://jmcker.github.io/Peer-to-Peer-Cue-System/");
});
