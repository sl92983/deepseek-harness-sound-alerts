# Security Policy / 安全政策

## Supported version / 支持版本

| Version | Status |
|---|---|
| 1.3.3 | Current release / 当前版本 |

Only the latest release receives compatibility and security updates. Source archives and release ZIPs should be obtained from this repository's GitHub Releases page.
仅最新 Release 接收兼容性与安全更新。请从本仓库的 GitHub Releases 页面获取源码或发布 ZIP。

## Reporting a vulnerability / 报告漏洞

Please use GitHub's private vulnerability reporting for this repository when available. If that is unavailable, contact the repository owner through GitHub rather than posting sensitive details publicly.
如仓库已开启 GitHub 私密漏洞报告，请优先使用该功能；如不可用，请通过 GitHub 联系仓库所有者，不要公开发布敏感细节。

Include reproduction steps, affected version, browser and DeepSeek Harness versions, and potential impact. Do not include real passwords, tokens, cookies, private conversation content, or personal files.
请提供复现步骤、受影响版本、浏览器与 DeepSeek Harness 版本以及潜在影响；不要附带真实密码、令牌、Cookie、私人会话内容或个人文件。

## Security design / 安全设计

- The extension has an empty `permissions` array. / 扩展的 `permissions` 为空数组。
- Content scripts are restricted to the two documented local Harness origins. / 内容脚本仅注入文档列出的两个本地 Harness 源。
- Optional ESP32 support uses documented LAN discovery and plain-HTTP light commands. / 可选 ESP32 功能使用文档说明的局域网发现与 HTTP 灯光命令。
- There is no background worker, storage, analytics, remote code, or cloud service. / 无后台 Worker、存储、分析统计、远程代码或云服务。
- Sounds are synthesized locally with Web Audio. / 声音通过 Web Audio 在本地合成。
- Real Wi-Fi values belong only in the ignored `wifi_config.h`; release artifacts must not contain them. / 真实 Wi-Fi 名称和密码只能放在被忽略的 `wifi_config.h`，发布产物不得包含这些值。
- Firmware endpoints are unauthenticated and must not be exposed outside a trusted LAN. / 固件接口没有身份认证，不得暴露到可信局域网之外。

The repository includes an automated secret-pattern scan, but no scanner can prove that every possible secret is absent. Review changes before publishing.
仓库提供自动化敏感信息模式扫描，但任何扫描器都无法证明绝对不存在所有类型的秘密；发布前仍应人工审查变更。
