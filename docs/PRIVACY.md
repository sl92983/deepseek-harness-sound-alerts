# Privacy and Data Flow / 隐私与数据流

**English** · [中文](#中文)

## English

DeepSeek Harness Sound Alerts turns local DOM state changes into audio and optional LAN light effects. Version 1.3.3 adds network access only for ESP32 discovery and control; it does not add analytics, accounts, cloud storage, or remote code.

| Data or capability | What happens |
|---|---|
| Approval/question/plan keys | Read from local DOM attributes and held temporarily in page memory for deduplication |
| Conversation text, files, commands, cookies | Not collected or transmitted by the extension |
| Audio | Synthesized locally with Web Audio; no audio assets are downloaded |
| Light discovery | Tries `dsh-light.local`, configured IPv4 subnets, and a WebRTC-inferred local subnet when available |
| Light commands | Plain HTTP requests to a device whose root response begins with `dsh-light`: `/alert`, `/complete`, `/clear` |
| Host access | `http://*/*` is requested for optional LAN device discovery; content scripts still run only on the two local Harness origins |
| Settings and accounts | No storage, account system, or sign-in |
| Analytics and tracking | None |
| Background activity | No background service worker |
| Wi-Fi credentials | Used only by ESP32 firmware in the local ignored `wifi_config.h`; never read by the extension |

The content script runs at `http://127.0.0.1:3080/*` and `http://localhost:3080/*`. Page memory disappears on reload. LAN discovery can send root requests to addresses in the configured subnets; this is the only scanning behavior and can be changed through `FIXED_PREFIXES` in `content.js`.

The firmware HTTP API is unauthenticated and uses wildcard CORS. Use it only on a trusted LAN and never expose it to the internet.

## 中文

DeepSeek Harness Sound Alerts 将本地 DOM 状态变化转换成声音和可选的局域网灯效。v1.3.3 新增的网络访问只用于发现和控制 ESP32，不包含分析统计、账号、云存储或远程代码。

| 数据或能力 | 处理方式 |
|---|---|
| 审批 / 提问 / 计划评审 key | 从本地 DOM 属性读取，暂时保存在页面内存中用于去重 |
| 会话正文、文件、命令、Cookie | 扩展不收集，也不传输 |
| 音频 | 使用 Web Audio 本地合成，不下载音频素材 |
| 灯光发现 | 依次尝试 `dsh-light.local`、配置的 IPv4 网段，以及 WebRTC 可获取时的本机网段 |
| 灯光命令 | 向根路径首行返回 `dsh-light` 的设备发送 `/alert`、`/complete`、`/clear` HTTP 请求 |
| 主机访问 | 为可选的局域网设备发现申请 `http://*/*`；内容脚本仍只运行于两个本地 Harness 源 |
| 设置与账号 | 不使用存储，没有账号系统或登录功能 |
| 分析统计与跟踪 | 无 |
| 后台活动 | 无后台 Service Worker |
| Wi-Fi 凭据 | 只用于 ESP32 本地被忽略的 `wifi_config.h`，扩展不会读取 |

内容脚本只运行于 `http://127.0.0.1:3080/*` 和 `http://localhost:3080/*`，刷新后页面内存即被清除。局域网发现会向配置网段中的地址发送根路径探测，这是唯一的扫描行为，可通过 `content.js` 中的 `FIXED_PREFIXES` 修改。

固件 HTTP 接口没有身份认证并允许跨域，只应在可信局域网中使用，不得暴露到互联网。
