# Changelog / 更新日志

All notable changes to DeepSeek Harness Sound Alerts are documented here.
DeepSeek Harness Sound Alerts 的重要变更会记录在这里。

## [1.3.3] - 2026-11-05

### English

- Added ESP32-C3 and WS2812B light effects for interaction and completion states.
- Added orange/cyan interaction pulses, a green completion breathing light, and automatic clear behavior.
- Added mDNS and configurable LAN discovery with queued device commands and duplicate-clear suppression.
- Added four hardware photos and an MP4 demonstration.
- Added a credential-free firmware configuration template; real `wifi_config.h` files are ignored and scanned as forbidden release files.
- Preserved interaction-key replacement handling, live-run completion confirmation, and history false-positive protection.
- Added automated tests for light command ordering, multiple pending panels, and clear deduplication.

### 中文

- 新增 ESP32-C3 与 WS2812B 灯光联动，覆盖待处理与完成状态。
- 新增橙青交替脉冲、绿色完成呼吸灯，以及处理完成后的自动关灯。
- 新增 mDNS 与可配置网段发现，灯光命令串行发送，并抑制重复关灯请求。
- 新增四张实物图片和 MP4 演示视频。
- 新增不含真实凭据的固件配置模板；真实 `wifi_config.h` 被 Git 忽略，并作为禁止发布文件检查。
- 保留交互 key 替换处理、真实运行完成确认与历史防误报能力。
- 新增灯光命令顺序、多待处理面板与关灯去重自动化测试。

## [1.2.3] - 2026-10-27

### English

- Added five locally synthesized 880 Hz beeps for approval requests.
- Added the same clear interaction cue for user questions and plan-review choices.
- Added a distinct five-note ascending chime for completed turns.
- Prevented duplicate alerts during React re-renders with interaction-key tracking.
- Required live-run confirmation for completion, preventing delayed history rendering from triggering false chimes.
- Added bilingual installation, customization, privacy, and troubleshooting documentation.
- Handled in-place interaction-key changes and fast same-key DOM replacements reliably.
- Added automated syntax, manifest, behavior, documentation-link, and secret-pattern checks.

### 中文

- 新增审批请求的五声 880 Hz 本地合成提示音。
- 用户提问与计划评审/方案选择使用同样清晰的交互提醒。
- 新增本轮完成时播放的上行五音铃声，与交互提醒明确区分。
- 通过交互 key 跟踪，避免 React 重渲染造成重复提醒。
- 完成铃声必须具有真实运行确认，避免历史节点延迟加载造成误报。
- 新增中英双语安装、自定义、隐私和故障排查文档。
- 支持面板原地更换交互 key，以及同 key 节点快速替换时的可靠提醒。
- 新增自动化语法、清单、行为、文档链接与敏感信息模式检查。

[1.3.3]: https://github.com/sl92983/deepseek-harness-sound-alerts/releases/tag/v1.3.3
[1.2.3]: https://github.com/sl92983/deepseek-harness-sound-alerts/releases/tag/v1.2.3
