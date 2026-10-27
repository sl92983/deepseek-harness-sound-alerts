# Changelog / 更新日志

All notable changes to DeepSeek Harness Sound Alerts are documented here.
DeepSeek Harness Sound Alerts 的重要变更会记录在这里。

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

[1.2.3]: https://github.com/sl92983/deepseek-harness-sound-alerts/releases/tag/v1.2.3
