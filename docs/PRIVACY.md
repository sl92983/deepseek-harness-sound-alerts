# Privacy and Data Flow / 隐私与数据流

**English** · [中文](#中文)

## English

DeepSeek Harness Sound Alerts is designed to do one local job: turn specific DeepSeek Harness DOM changes into sound.

| Data or capability | What happens |
|---|---|
| Approval/question/plan keys | Read from local DOM attributes and held temporarily in page memory to suppress duplicates |
| Conversation text, files, or commands | Not collected or transmitted by the extension |
| Audio | Synthesized with Web Audio; no audio files or remote media requests |
| Settings and accounts | No settings storage, account system, or sign-in |
| Analytics and tracking | None |
| Network access | No remote requests; host access is limited to the two local Harness origins in `manifest.json` |
| Background activity | None; there is no background service worker |

The content script runs at `http://127.0.0.1:3080/*` and `http://localhost:3080/*`. A `MutationObserver` watches the documented state attributes. Interaction keys are discarded when their elements disappear, and all page memory disappears on reload.

The source is intentionally small enough to audit. `npm run validate` also checks manifest restrictions and verifies that the content script contains no network, storage, or remote-code APIs.

## 中文

DeepSeek Harness Sound Alerts 只完成一个本地任务：把特定的 DeepSeek Harness DOM 状态变化转换成声音。

| 数据或能力 | 处理方式 |
|---|---|
| 审批 / 提问 / 计划评审 key | 从本地 DOM 属性读取，暂时保存在页面内存中用于去重 |
| 会话文本、文件或命令 | 扩展不收集，也不传输 |
| 音频 | 使用 Web Audio 本地合成，不请求音频文件或远程媒体 |
| 设置与账号 | 不使用设置存储，没有账号系统或登录功能 |
| 分析统计与跟踪 | 无 |
| 网络访问 | 无远程请求；主机访问仅限 `manifest.json` 中的两个本地 Harness 源 |
| 后台活动 | 无后台 Service Worker |

内容脚本只运行于 `http://127.0.0.1:3080/*` 和 `http://localhost:3080/*`。`MutationObserver` 监听文档中说明的状态属性；元素消失后，对应交互 key 会被清理，刷新页面后全部页面内存都会消失。

扩展源码保持精简，便于审查。`npm run validate` 还会检查清单限制，并验证内容脚本不包含网络、存储或远程代码 API。
