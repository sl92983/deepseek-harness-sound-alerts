# Contributing / 参与贡献

Thank you for helping more DeepSeek Harness users notice approvals, questions, plan choices, and completed turns.
感谢你帮助更多 DeepSeek Harness 用户及时发现审批、提问、方案选择与回合完成。

## Ways to contribute / 贡献方式

- Report reproducible bugs or DOM compatibility changes. / 报告可复现的 Bug 或 DOM 兼容性变化。
- Improve bilingual documentation and translations. / 改进双语文档与翻译。
- Fix compatibility issues while keeping the extension small and local-only. / 在保持轻量、纯本地的前提下修复兼容性问题。
- Add focused tests for alert, deduplication, and completion behavior. / 为提醒、去重与完成检测添加针对性测试。

## Before submitting / 提交前

1. Keep changes scoped; discuss large feature ideas in an issue first. / 保持变更聚焦，大型功能请先通过 Issue 讨论。
2. Preserve the empty `permissions` array and local-only host access unless a proposal explicitly explains why a change is necessary. / 除非提案明确说明必要性，否则保持空 `permissions` 与仅本地主机访问。
3. Do not add analytics, remote code, tracking, or remote audio dependencies. / 不添加分析统计、远程代码、跟踪或远程音频依赖。
4. Update both English and Chinese documentation when user-facing behavior changes. / 用户可见行为变化时，同步更新中英文文档。
5. Run the checks without installing dependencies: / 无需安装依赖，运行：

   ```bash
   npm run validate
   ```

## Bug reports / Bug 报告

Include the DeepSeek Harness version, browser and version, operating system, exact page origin, reproduction steps, expected behavior, and actual behavior. Relevant extension console messages are useful.
请提供 DeepSeek Harness 版本、浏览器及版本、操作系统、完整页面源（origin）、复现步骤、预期行为与实际行为；相关扩展 Console 日志也很有帮助。

**Never attach credentials, access tokens, private conversation content, or personal workspace files.**
**不要附带账号密码、访问令牌、私人会话内容或个人工作区文件。**

## Security / 安全问题

Do not disclose vulnerabilities or sensitive findings in a public issue. See [SECURITY.md](SECURITY.md).
请不要在公开 Issue 中披露漏洞或敏感发现，请参阅 [SECURITY.md](SECURITY.md)。
