# DeepSeek Harness 声音提醒

### DeepSeek Harness Sound Alerts · 审批 / 提问 / 方案选择 / 完成提示音

**[English](README.md)** · **简体中文**

[![构建检查](https://github.com/sl92983/deepseek-harness-sound-alerts/actions/workflows/validate.yml/badge.svg)](https://github.com/sl92983/deepseek-harness-sound-alerts/actions/workflows/validate.yml)
[![最新版本](https://img.shields.io/github/v/release/sl92983/deepseek-harness-sound-alerts)](https://github.com/sl92983/deepseek-harness-sound-alerts/releases/latest)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-5b67d8)](manifest.json)
[![MIT 许可证](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 别再反复切回来看进度，需要你的时候会响，跑完了也会响

用 DeepSeek Harness 时，它经常会在**等你审批、回答提问、或者选一个方案**的地方停下来。这时候你要是正切在别的窗口，或者人已经离开电脑，很容易就错过——代理也就一直卡在那儿干等。就算这一轮已经跑完了，往往也要等你再切回页面才知道。

**DeepSeek Harness Sound Alerts（DeepSeek Harness 声音提醒）**就是把这些容易被错过的时刻，变成清晰、好分辨的声音：**该你处理了响五声提示音，跑完了响一段上行铃声**。你可以放心去忙别的，不用每隔一会儿就切回来瞄一眼。

> **English summary:** Clear local sound cues when DeepSeek Harness needs an approval, answer, or plan choice—and a different chime when the turn completes. [Read the full English documentation](README.md).

这是一款面向 **DeepSeek Harness Web GUI** 的非官方、轻量级 **Manifest V3 Chrome 扩展**。所有声音都用 Web Audio 在浏览器本地合成，不需要音频文件，也没有云服务、统计埋点或任何远程请求。

*非官方社区项目，与 DeepSeek 无隶属关系，也未获得其背书。*


## 能帮你什么

- **该你处理了，及时提醒** — 出现审批请求、用户提问或方案选择面板时，响五声短促的 **880 Hz** 提示音。
- **跑完有专门的声音** — 本轮执行完成后，响一段截然不同的**上行五音铃声**（C5–E5–G5–B5–C6），不会和审批提示音搞混。
- **同一件事不会反复响** — 按交互 key 去重，React 重新渲染也不会重复播放同一次提醒。
- **历史记录不误报** — 只认真实运行，加载旧会话时不会误触发完成铃声。
- **轻得几乎没有存在感** — 没有后台 Worker、不占存储、无需构建，`permissions` 数组里一个权限项都没有。
- **数据全留在本地** — 只访问 `127.0.0.1:3080` 和 `localhost:3080`，声音完全在你的浏览器里生成。

## 什么时候会响什么

| DeepSeek Harness 状态 | 声音 | 含义 |
|---|---|---|
| 等待审批 | 五声 880 Hz 提示音 | 代理在等你允许或拒绝 |
| 用户提问 / 方案选择 / 计划评审 | 五声 880 Hz 提示音 | 代理在等你回答或选择 |
| 本轮执行完成 | 上行五音铃声 | 这次运行已经结束 |
| 没有活动运行、只是加载历史 | 不响完成铃声 | 避免旧记录造成误报 |

## 快速安装（4 步搞定）

### 1. 确认环境

- DeepSeek Harness Web GUI 运行在 `http://127.0.0.1:3080` 或 `http://localhost:3080`。
- 使用 Chrome，或其他支持 Manifest V3 的 Chromium 浏览器。

### 2. 下载并解压

1. 打开 **[最新 Release](https://github.com/sl92983/deepseek-harness-sound-alerts/releases/latest)**。
2. 下载 `deepseek-harness-sound-alerts-v1.2.3.zip`。
3. **先解压**，Chrome 没法直接加载 ZIP 文件。

### 3. 加载扩展

1. 在 Chrome 地址栏打开 `chrome://extensions/`（Edge 用 `edge://extensions/`）。
2. 打开右上角的**开发者模式**。
3. 点**加载已解压的扩展程序**。
4. 选中解压后那个包含 `manifest.json` 的文件夹。

### 4. 在 Harness 页面放行声音

1. 打开或刷新 DeepSeek Harness 页面。
2. **在页面里点一下鼠标，或按一次键盘。** 浏览器要求先有一次真实的用户操作，才允许 Web Audio 出声。
3. 确认这个标签页没被静音，系统音量也正常。

每次整页刷新后都要重新点一下或按一下，因为新页面会重新创建音频上下文。

**装完就能直接用了。** 不用开 Console、不用跑测试命令、不用登录、也不用再做任何配置；以后出现审批、提问、方案选择或本轮完成时，插件会自动响对应的提示音。

<details>
<summary><strong>另一种装法：从源码加载</strong></summary>

```bash
git clone https://github.com/sl92983/deepseek-harness-sound-alerts.git
```

然后在**加载已解压的扩展程序**里直接选克隆下来的仓库根目录。根目录里已经有 `manifest.json`，不用装依赖，也不用构建。

</details>

## 工作原理

扩展用 `MutationObserver` 只盯着本地的 DeepSeek Harness 页面：

- `[data-approval-key]` 对应审批请求。
- `[data-question-key]` 和 `[data-plan-review-key]` 对应用户提问和方案选择。
- 同一轮里，先出现非尾部的 `[data-chat-turn]` 活动、再出现该轮的 `[data-turn-tail]`，就判为完成；`[data-turn-process]` 是额外的兼容信号。

交互 key 只记在页面内存里，对应元素消失后就会清掉。完成铃声只认「确实观察到活动运行控件」的轮次，所以历史节点即使延迟加载，也不会光凭时间间隔就被误判成完成。所有声音都由 Web Audio API 即时合成，不需要下载任何音频文件。

## 自定义

改 `content.js` 后，到 `chrome://extensions/` 重新加载扩展，再刷新 Harness 页面：

| 想改什么 | 位置 |
|---|---|
| 审批/提问提示音的次数 | `BEEP_COUNT`（默认 `5`） |
| 审批/提问提示音的音高 | `playBeeps()` 里的 `freq`（默认 `880` Hz） |
| 完成铃声的旋律 | `playCompletionSound()` 里的 `completionNote(...)` |

如果你的 Harness 换了端口，请同时改 `manifest.json` 里的 `matches` 和 `host_permissions`。插件不会主动索取远程网站或任意站点的访问权限。

## 故障排查

### 完全没声音

- 每次整页刷新后，先在 Harness 页面里点一下或按一下键盘。
- 看看标签页是不是静音了、系统音量是不是正常。
- 确认地址是允许的本地地址，而且带 `3080` 端口。
- 重新加载扩展，再刷新 Harness 页面。
- 打开开发者工具 Console，看看有没有 `[DeepSeek Harness Sound Alerts]` 的日志。

### 审批会响，完成不响

- 先确认这是本次真实运行，而不是之前保存的历史会话。
- DeepSeek Harness 更新可能会改动 DOM 属性。对照 `content.js` 里的选择器检查当前页面，并在 Issue 里提供能复现的变化。

### 同一提醒意外重复响

同一个交互 key 只要元素还在，就只会响一次。如果 Harness 更新导致元素反复重挂载或不断生成新 key，请在 Issue 里说明 Harness 版本和复现步骤，别附带私人会话内容。

## 隐私与权限

- `permissions` 是空数组。
- 只访问 `http://127.0.0.1:3080/*` 和 `http://localhost:3080/*`。
- 没有后台 Service Worker，不存储数据，不读 Cookie，不埋点、不追踪、不加载远程代码。
- 不发任何远程网络请求，声音在本地合成。
- 不上传任何会话内容；交互 key 只用于内存去重。

安全问题请见 [SECURITY.md](SECURITY.md)，数据流向的简明说明见 [docs/PRIVACY.md](docs/PRIVACY.md)。

## 开发与验证

日常使用不需要 Node.js，也不用装任何依赖。想跑贡献者检查的话，准备 Node.js 18 或更高版本：

```bash
npm run validate
```

它会做 JavaScript 语法检查、两种提示音与去重/历史过滤的行为测试、清单权限限制检查，以及敏感信息扫描。不用先 `npm install`。

在 Windows 上生成发布 ZIP：

```powershell
npm run package
```

压缩包会输出到 `dist/`，只含扩展运行文件、图标、文档和许可证。

## 参与贡献

欢迎提交兼容性修复、Bug 报告、翻译和文档改进。请先读 [CONTRIBUTING.md](CONTRIBUTING.md)，保持插件轻量，并确保 Issue 和提交里不含凭据或私人会话内容。

如果这个项目帮你省了时间，欢迎点个 Star，或者分享给其他 DeepSeek Harness 用户，让有需要的人更容易找到它。

## 常见问题

### 怎么手动测试提示音？

**只在排查声音问题时才需要，不属于安装步骤，正常使用也不用做。** 完成第 4 步后，如果想绕过 Harness 页面事件单独听一下声音，可以在 Harness 页面打开开发者工具 Console，运行：

```js
document.dispatchEvent(new Event("dsh-approval-alert-test"));
document.dispatchEvent(new Event("dsh-completion-alert-test"));
```

第一条响审批/提问提示音，第二条响完成铃声。

## 许可证

[MIT](LICENSE) © 2026 sl92983

DeepSeek 与 DeepSeek Harness 的名称归其相应项目所有。本社区扩展与 DeepSeek 无隶属关系，也未获得其背书。
