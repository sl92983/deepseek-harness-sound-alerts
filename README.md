# DeepSeek Harness Sound Alerts

### DeepSeek Harness 声音提醒 · Approval / Question / Completion Sounds

**English** · **[简体中文](README.zh-CN.md)**

[![Validate](https://github.com/sl92983/deepseek-harness-sound-alerts/actions/workflows/validate.yml/badge.svg)](https://github.com/sl92983/deepseek-harness-sound-alerts/actions/workflows/validate.yml)
[![Latest release](https://img.shields.io/github/v/release/sl92983/deepseek-harness-sound-alerts)](https://github.com/sl92983/deepseek-harness-sound-alerts/releases/latest)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-5b67d8)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Stop checking the tab. Hear when your agent needs you.

AI coding agents often **pause silently for an approval, an answer, or a plan choice** while you are in another window or away from your desk. The agent waits; you lose time. Even a completed turn can go unnoticed until you remember to check the page.

**DeepSeek Harness Sound Alerts** turns those silent states into clear, distinct audio cues: **five beeps when your input is needed, and an ascending chime when the turn is done**. Step away from the page without repeatedly coming back just to check its status.

> **中文简介：** DeepSeek Harness 需要审批、回答提问或选择方案时，插件会响五声提示音；本轮完成时响一段不同的上行铃声。声音都在本地生成，不用一直盯着页面也能及时知道「该你处理了」或「已经跑完了」。[查看完整中文文档](README.zh-CN.md)。

This is a lightweight **Manifest V3 Chrome extension for DeepSeek Harness Web GUI**. All sounds are synthesized locally with Web Audio—no audio files, cloud service, analytics, or remote network calls.


## Why it helps

- **Know when you are needed** — Approval requests, user questions, and plan-review panels play five short **880 Hz** beeps.
- **Recognize completion immediately** — Finished turns play a clearly different **five-note ascending chime** (C5–E5–G5–B5–C6).
- **Avoid repeated alerts** — Interaction keys are deduplicated, so React re-renders do not replay the same prompt.
- **Avoid history false positives** — Completion detection distinguishes real runs from turns loaded from history.
- **Stay lightweight** — No background worker, no storage, no build step, and no entries in the manifest's `permissions` array.
- **Keep everything local** — Page access is limited to `127.0.0.1:3080` and `localhost:3080`; sounds are generated in your browser.

## What you will hear

| DeepSeek Harness state | Sound | Meaning |
|---|---|---|
| Approval request | Five 880 Hz beeps | The agent is waiting for your allow/deny decision |
| User question or plan review | Five 880 Hz beeps | The agent needs an answer or choice |
| Turn completed | Ascending five-note chime | The current run has finished |
| History loaded without an active run | No completion chime | Prevents old turns from triggering false alerts |

## Quick start — ready in 4 steps

### 1. Check the requirements

- DeepSeek Harness Web GUI running at `http://127.0.0.1:3080` or `http://localhost:3080`.
- Chrome or another Chromium-based browser with Manifest V3 support.

### 2. Download and extract

1. Open the **[latest release](https://github.com/sl92983/deepseek-harness-sound-alerts/releases/latest)**.
2. Download `deepseek-harness-sound-alerts-v1.2.3.zip`.
3. **Extract the ZIP first.** Chrome cannot load it directly as a ZIP file.

### 3. Load the extension

1. Open `chrome://extensions/` in Chrome (`edge://extensions/` in Edge).
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the extracted folder that contains `manifest.json`.

### 4. Enable sound in the Harness tab

1. Open or reload your DeepSeek Harness tab.
2. **Click anywhere in the page or press a key once.** Browsers require a real user gesture before Web Audio can play.
3. Leave the tab unmuted and your system audio on.

Repeat the click/key gesture after a full page reload because each loaded page has its own audio context.

**That's it—use Harness normally.** No Console, test command, account, or additional configuration is needed. Approval/question alerts and the completion chime play automatically.

<details>
<summary><strong>Alternative: install from source</strong></summary>

```bash
git clone https://github.com/sl92983/deepseek-harness-sound-alerts.git
```

Then choose the cloned repository root in **Load unpacked**. It already contains `manifest.json`; there is no installation or build step.

</details>

## How it works

A `MutationObserver` watches only the local DeepSeek Harness page:

- `[data-approval-key]` identifies approval requests.
- `[data-question-key]` and `[data-plan-review-key]` identify questions and plan choices.
- Non-tail `[data-chat-turn]` activity followed by the same turn's `[data-turn-tail]` identifies completion; `[data-turn-process]` is an additional compatibility signal.

The extension remembers interaction keys only in page memory and removes them when their elements disappear. Completion requires a turn confirmed by an observed live running control, so delayed history rendering does not become a completion cue merely because time passed. All audio is produced on demand with the Web Audio API—there are no sound files to download.

## Customize

Edit `content.js`, then reload the extension at `chrome://extensions/` and refresh the Harness tab:

| Change | Location |
|---|---|
| Number of approval/question beeps | `BEEP_COUNT` (default: `5`) |
| Approval/question pitch | `freq` in `playBeeps()` (default: `880` Hz) |
| Completion melody | `completionNote(...)` calls in `playCompletionSound()` |

To use a different Harness port, update both `matches` and `host_permissions` in `manifest.json`. The extension intentionally has no remote or arbitrary-site access.

## Troubleshooting

### No sound at all

- Click or press a key inside the Harness page once after every full reload.
- Check that the browser tab is not muted and system volume is audible.
- Confirm the address is exactly an allowed local origin, including port `3080`.
- Reload the extension, then reload the Harness tab.
- Open DevTools Console and look for `[DeepSeek Harness Sound Alerts]` messages.

### Approval alerts work, but completion does not

- Confirm this was a real run rather than a previously saved conversation.
- DeepSeek Harness updates can change DOM attributes. Compare the current page with the selectors in `content.js` and report reproducible changes in an issue.

### Alerts repeat unexpectedly

The same interaction key should play only once while its element remains mounted. If a Harness update causes repeated mounting with new keys, include the Harness version and reproduction steps in a bug report—without posting private conversation content.

## Privacy and permissions

- `permissions` is an empty array.
- Host access covers only `http://127.0.0.1:3080/*` and `http://localhost:3080/*`.
- No background service worker, storage, cookies, analytics, tracking, or remote code.
- No remote network requests; audio is synthesized locally.
- No conversation content is transmitted. Interaction keys exist only in memory to prevent duplicate sounds.

See [SECURITY.md](SECURITY.md) for security reporting and [docs/PRIVACY.md](docs/PRIVACY.md) for a concise data-flow explanation.

## Development and validation

Using the extension requires no Node.js or dependencies. To run the contributor checks, use Node.js 18 or newer:

```bash
npm run validate
```

This runs JavaScript syntax checks, behavioral tests for both cues and duplicate/history suppression, manifest restrictions, and a secret-pattern scan. No `npm install` is required.

On Windows, build the release ZIP with:

```powershell
npm run package
```

The archive is written to `dist/` and includes only the extension runtime, icons, documentation, and license.

## Contributing

Bug reports, compatibility fixes, translations, and documentation improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), keep the extension lightweight, and never include credentials or private conversation content in an issue or commit.

If this project saves you time, a GitHub star or a share with another DeepSeek Harness user helps others discover it.

## FAQ

### Can I test the sounds manually?

**Only if you are diagnosing an audio problem—this is not part of installation or normal use.** After completing step 4, open DevTools Console in the Harness tab and optionally run:

```js
document.dispatchEvent(new Event("dsh-approval-alert-test"));
document.dispatchEvent(new Event("dsh-completion-alert-test"));
```

The first command plays the approval/question beeps; the second plays the completion chime.

## License

[MIT](LICENSE) © 2026 sl92983

DeepSeek and DeepSeek Harness are names of their respective project.
