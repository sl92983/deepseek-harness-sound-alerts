# Security Policy / 安全政策

## Supported version / 支持版本

| Version | Status |
|---|---|
| 1.2.3 | Current release / 当前版本 |

Only the latest release receives compatibility and security updates. Source archives and release ZIPs should be obtained from this repository's GitHub Releases page.
仅最新 Release 接收兼容性与安全更新。请从本仓库的 GitHub Releases 页面获取源码或发布 ZIP。

## Reporting a vulnerability / 报告漏洞

Please use GitHub's private vulnerability reporting for this repository when available. If that is unavailable, contact the repository owner through GitHub rather than posting sensitive details publicly.
如仓库已开启 GitHub 私密漏洞报告，请优先使用该功能；如不可用，请通过 GitHub 联系仓库所有者，不要公开发布敏感细节。

Include reproduction steps, affected version, browser and DeepSeek Harness versions, and potential impact. Do not include real passwords, tokens, cookies, private conversation content, or personal files.
请提供复现步骤、受影响版本、浏览器与 DeepSeek Harness 版本以及潜在影响；不要附带真实密码、令牌、Cookie、私人会话内容或个人文件。

## Security design / 安全设计

- The extension has an empty `permissions` array. / 扩展的 `permissions` 为空数组。
- Access is restricted to the two documented local Harness origins. / 访问仅限文档列出的两个本地 Harness 源。
- There is no background worker, storage, analytics, remote code, or remote network request. / 无后台 Worker、存储、分析统计、远程代码或远程网络请求。
- Sounds are synthesized locally with Web Audio. / 声音通过 Web Audio 在本地合成。

The repository includes an automated secret-pattern scan, but no scanner can prove that every possible secret is absent. Review changes before publishing.
仓库提供自动化敏感信息模式扫描，但任何扫描器都无法证明绝对不存在所有类型的秘密；发布前仍应人工审查变更。
