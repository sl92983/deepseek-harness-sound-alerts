$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$manifest = Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json
$dist = Join-Path $root "dist"
New-Item -ItemType Directory -Path $dist -Force | Out-Null

$archive = Join-Path $dist "deepseek-harness-sound-alerts-v$($manifest.version).zip"
$files = @(
  "manifest.json",
  "content.js",
  "README.md",
  "README.zh-CN.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "icons",
  "docs"
) | ForEach-Object { Join-Path $root $_ }

Compress-Archive -Path $files -DestinationPath $archive -Force
Write-Output $archive
