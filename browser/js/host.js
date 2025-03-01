var host;
var ls = window.localStorage;
var conn;
var idInfo;
var status;
var copyId;
var genId;
var connList;
var connStatusBar;
var connectedPeerId;
var statusDot;
var loadingOverlay;
var notification;
var notificationMessage;
var notificationClose;
var connStatusBarText;
var idTooltip;
var customIdPrefix = "MMM-2M-";
const ipcRenderer = require("electron").ipcRenderer;
document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("hide-to-tray")
    .addEventListener("click", function () {
      ipcRenderer.send("hide-to-tray");
    });

  document.getElementById("close").addEventListener("click", function () {
    ipcRenderer.send("close");
  });
  document.getElementById("maximize").addEventListener("click", function () {
    ipcRenderer.send("maximize");
  });
  document.getElementById("minimize").addEventListener("click", function () {
    ipcRenderer.send("minimize");
  });
});

// 生成自定义格式的ID
function generateCustomId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = customIdPrefix;

  // 生成5位随机大写字母
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

// 从完整ID中提取用户可见部分
function getDisplayId(fullId) {
  if (fullId.startsWith(customIdPrefix)) {
    return fullId.substring(customIdPrefix.length);
  }
  return fullId;
}

// 保存ID到本地存储
function saveIdToLocalStorage(id) {
  ls.setItem("peerId", id);
}

// 从本地存储获取ID
function getIdFromLocalStorage() {
  return ls.getItem("peerId");
}

// 显示通知
function showNotification(message, duration = 3000) {
  notificationMessage.textContent = message;
  notification.classList.remove("hidden");
  notification.classList.add("slide-in-up");

  // 自动关闭通知
  setTimeout(() => {
    hideNotification();
  }, duration);
}

// 隐藏通知
function hideNotification() {
  notification.classList.remove("slide-in-up");
  notification.classList.add("fade-out");

  setTimeout(() => {
    notification.classList.add("hidden");
    notification.classList.remove("fade-out");
  }, 300);
}

function addMessage(name, text) {
  var message = document.getElementsByClassName("message")[0].cloneNode(true);
  message.getElementsByClassName("message-sender")[0].innerHTML = name;
  message.getElementsByClassName("message-text")[0].innerHTML = text;
  document.getElementById("messages").appendChild(message);
  // 滚动到底部
  var messagesContainer = document.getElementById("messages");
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // 添加动画效果
  message.classList.add("fade-in");
}

function sendMessage() {
  var text = document.getElementById("message").value;
  if (text != "") {
    document.getElementById("message").value = "";
    conn.send(text);
    addMessage("我", text);
  }
}

function updateConnectionStatus(statusText) {
  console.log("连接状态更新: " + statusText);

  // 更新状态点的样式
  statusDot.className = "status-dot";
  connStatusBarText.textContent = statusText;
  if (statusText === "等待连接") {
    statusDot.classList.add("connecting");
  } else if (statusText === "已连接") {
    statusDot.classList.add("connected");
    showNotification("连接成功!");
  } else if (statusText.includes("断开") || statusText.includes("错误")) {
    statusDot.classList.add("disconnected");
    if (statusText.includes("错误")) {
      showNotification("连接发生错误", 5000);
    }
  }
}

function initializePeer(customId = null) {
  // 如果提供了自定义ID,则使用它,否则创建没有ID的Peer
  if (customId) {
    host = new Peer(customId);
  } else {
    host = new Peer();
  }

  // 显示加载动画
  loadingOverlay.classList.remove("hidden");

  // 处理ID已被占用的错误
  host.on("error", function (err) {
    if (err.type === "unavailable-id") {
      console.log("ID已被占用,生成新ID");
      showNotification("保存的ID已被占用,正在生成新ID...", 2000);

      // 清除本地存储的ID
      ls.removeItem("peerId");

      // 关闭当前连接
      if (host) {
        host.destroy();
      }

      // 使用新生成的自定义ID重新初始化
      setTimeout(() => {
        initializePeer(generateCustomId());
      }, 1000);
    } else {
      console.log("发生错误: ", err);
      updateConnectionStatus("发生错误");
      showNotification("发生错误: " + err.message, 5000);
    }
  });

  host.on("open", function (id) {
    console.log("我的Peer ID是: " + id);

    // 保存ID到本地存储
    saveIdToLocalStorage(id);

    // 显示用户可见部分的ID
    idInfo.value = getDisplayId(id);
    updateConnectionStatus("等待连接");

    // 隐藏加载动画
    setTimeout(() => {
      loadingOverlay.classList.add("hidden");
      showNotification("服务器已启动,等待连接...");
    }, 1500);

    // 发送ID到主进程
    ipcRenderer.send("peer-id", id);

    // host.on("data", function (data) {
    //   console.log("收到数据", data);
    // });

    host.on("connection", function (dataConnection) {
      console.log(
        "已连接到 " +
          dataConnection.peer +
          " .open:" +
          dataConnection.open +
          " .reliable:" +
          dataConnection.reliable
      );
      ipcRenderer.on("screen-size-reply", function (event, data) {
        if (dataConnection.open) {
          // 可选链操作符更安全
          dataConnection.send(
            JSON.stringify({
              type: "screen-size",
              width: data.width,
              height: data.height,
            })
          );
        }
      });
      updateConnectionStatus("已连接");
      conn = dataConnection;

      // 显示连接的对等方ID
      connectedPeerId.innerHTML = dataConnection.peer;

      dataConnection.on("data", function (data) {
        ipcRenderer.send("screen-size", 1);
        // addMessage("对方", data);
        //  console.log("收到数据: " + data);
        //解析Json
        var json = JSON.parse(data);
        // console.log("解析后的数据", json);

        //获取json的type 如果是键盘输入则
        if (json.type === "keyboard") {
          //获取json的键盘序号
          var key = json.key;
          //发送到主线程
          ipcRenderer.send("keyboard", key);
          //示例json : {"type":"keyboard","key":"a"}
        } else if (json.type === "mouse-move") {
          //获取json的鼠标移动
          var targetX = json.targetX;
          var targetY = json.targetY;
          ipcRenderer.send("mouse-move", targetX, targetY);
          //示例json : {"type":"mouse-move","targetX":100,"targetY":100}
        } else if (json.type === "mouse-event") {
          //获取json的鼠标事件
          var event = json.event;
          if (event === "mousedown") {
            ipcRenderer.send("mouse-event", "mousedown");
          } else if (event === "mouseup") {
            ipcRenderer.send("mouse-event", "mouseup");
          }
        }
      });

      // 添加过渡动画
      // document.getElementById("connection-panel").classList.add("hidden");
      // setTimeout(() => {
      //   document.getElementById("messaging-panel").classList.remove("hidden");
      // }, 300);

      // document
      //   .getElementById("message")
      //   .addEventListener("keydown", function (e) {
      //     if (e.key === "Enter") sendMessage();
      //   });

      // document.getElementById("send").addEventListener("click", function () {
      //   //  sendMessage();
      // });

      // 监听连接关闭
      dataConnection.on("close", function () {
        console.log("连接已关闭");
        updateConnectionStatus("连接已关闭");
        showNotification("连接已关闭");
      });

      // 监听连接错误
      dataConnection.on("error", function (err) {
        console.log("连接错误: ", err);
        updateConnectionStatus("连接错误");
        showNotification("连接发生错误: " + err.message, 5000);
      });
    });

    host.on("disconnected", function () {
      console.log("连接断开");
      updateConnectionStatus("连接断开");
      showNotification("连接已断开");
    });

    host.on("close", function () {
      console.log("连接关闭");
      updateConnectionStatus("连接关闭");
    });
  });
}

function listConnections() {
  if (host && host.connections && Object.keys(host.connections).length > 0) {
    let connectionCount = 0;
    let connectionHtml = "";

    for (let peerId in host.connections) {
      if (host.connections[peerId].length > 0) {
        connectionCount++;
        connectionHtml += `<div class="connection-item">${peerId}</div>`;
      }
    }

    if (connectionCount > 0) {
      connList.innerHTML = connectionHtml;
    } else {
      connList.innerHTML = "<span>暂无连接</span>";
    }
  } else {
    connList.innerHTML = "<span>暂无连接</span>";
  }
}

function setHostVariables() {
  status = document.getElementById("connection-status");
  copyId = document.getElementById("copy-id");
  genId = document.getElementById("generate-id");
  idInfo = document.getElementById("id-input");
  connList = document.getElementById("connection-list");
  connStatusBar = document.getElementById("connection-status-bar");
  connectedPeerId = document.getElementById("connected-peer-id");
  statusDot = document.getElementById("status-dot");
  loadingOverlay = document.getElementById("loading-overlay");
  notification = document.getElementById("notification");
  notificationMessage = document.getElementById("notification-message");
  notificationClose = document.getElementById("notification-close");
  idTooltip = document.getElementById("id-tooltip");
  connStatusBarText = document.getElementById("connection-status-text");
}

function addPeerListeners() {
  // 复制ID按钮
  copyId.addEventListener("click", function () {
    // 复制完整ID,而不仅仅是显示部分
    const fullId = getIdFromLocalStorage();
    ipcRenderer.send("copy-id", fullId);
    showNotification("ID已复制到剪贴板");
  });

  // 生成新ID按钮
  genId.addEventListener("click", function () {
    showNotification("正在生成新ID...");

    // 清除本地存储的ID
    ls.removeItem("peerId");

    // 关闭当前连接
    if (host) {
      host.destroy();
    }

    setTimeout(() => {
      // 使用新生成的自定义ID重新初始化
      initializePeer(generateCustomId());
    }, 1000);
  });

  // 断开连接按钮
  document.getElementById("disconnect").addEventListener("click", function () {
    if (conn) {
      conn.send("服务器: 断开连接");
      conn.close();
    }
    showNotification("正在断开连接...");
    setTimeout(() => {
      location.reload();
    }, 1000);
  });

  // 关闭通知按钮
  notificationClose.addEventListener("click", function () {
    hideNotification();
  });

  // 定期更新连接列表
  setInterval(listConnections, 5000);
}

function startServer() {
  console.log("启动服务器");
  setHostVariables();

  // 检查本地存储中是否有保存的ID
  const savedId = getIdFromLocalStorage();

  if (savedId) {
    console.log("使用保存的ID: " + savedId);
    initializePeer(savedId);
  } else {
    console.log("生成新的自定义ID");
    initializePeer(generateCustomId());
  }

  addPeerListeners();
}

document.addEventListener("DOMContentLoaded", function () {
  startServer();
});
