# ESP32 DSH Light Firmware / ESP32 灯光固件

ESP32-C3 SuperMini + one WS2812B. Receives DeepSeek Harness state commands from the Chrome extension over LAN HTTP.
基于 ESP32-C3 SuperMini 和单颗 WS2812B，通过局域网 HTTP 接收 Chrome 扩展发出的状态命令。

## Files / 文件

- `esp32-dsh-light.ino` — firmware and light effects / 固件与灯效。
- `wifi_config.example.h` — safe configuration template / 安全配置模板。
- `wifi_config.h` — your local credentials; ignored by Git / 本地真实配置，已被 Git 忽略。

## 1. Wiring / 接线

| Wire in this build / 实物线色 | Connection / 连接 | Purpose / 用途 |
|---|---|---|
| Black / 黑线 | `3V3` | VCC |
| Red / 红线 | `GND` | Ground / 地线 |
| Blue / 蓝线 | `GPIO4` | DIN |
| Green / 绿线 | Not connected / 不接 | DOUT |

These colors are unusual. Verify the wire order and LED markings rather than relying on color alone.
这些线色并非常规定义，接线时必须核对实际线序与灯珠标识，不能只看颜色。

## 2. Configure Wi-Fi / 配置 Wi-Fi

Copy `wifi_config.example.h` to `wifi_config.h`, then replace the placeholders:
复制 `wifi_config.example.h` 为 `wifi_config.h`，再替换其中的占位符：

```cpp
void configureWiFiNetworks(WiFiMulti &wifiMulti) {
  wifiMulti.addAP("YOUR_WIFI_SSID", "YOUR_WIFI_PASSWORD");
  // Optional / 可选：
  // wifiMulti.addAP("YOUR_SECOND_WIFI_SSID", "YOUR_SECOND_WIFI_PASSWORD");
}
```

Multiple `addAP` entries are supported; `WiFiMulti` selects an available network. Keep `wifi_config.h` local and never commit it. The repository scanner also rejects real-looking `addAP` credentials.
支持配置多个网络，`WiFiMulti` 会选择可用网络。`wifi_config.h` 只能保留在本地，不得提交；仓库扫描器也会检查疑似真实凭据。

## 3. Build and flash / 编译与烧录

### Arduino IDE

1. Install ESP32 board support and the **FastLED** library / 安装 ESP32 开发板支持和 FastLED 库。
2. Open `esp32-dsh-light.ino` and keep `wifi_config.h` in the same directory / 打开主固件，并将配置文件放在同一目录。
3. Select an ESP32-C3 board and the correct serial port / 选择 ESP32-C3 开发板和正确串口。
4. Compile and upload / 编译并上传。

The verified firmware uses the `esp32:esp32:esp32c3` board target. No real Wi-Fi values are required to compile the public template.
已验证的开发板目标为 `esp32:esp32:esp32c3`，使用公开模板即可检查编译，不需要真实网络配置。

## 4. Behavior / 灯效与接口

| State / 状态 | Effect / 效果 |
|---|---|
| `/alert` | Orange/cyan alternating pulses / 橙青交替脉冲 |
| `/complete` | Green breathing, 5%–25% / 绿色呼吸，亮度 5%–25% |
| `/clear` | Off / 关灯 |
| `/` | Device identity, IP, and mode / 设备标识、IP 与当前模式 |
| Connecting / 连网中 | Red breathing / 红灯呼吸 |
| Connected / 连网成功 | Three green flashes / 绿灯闪三次 |
| Connection failure / 连网失败 | Fast red flashes / 红灯快闪 |

The mDNS hostname is `dsh-light.local`. The extension accepts a device only when the first response line at `/` is exactly `dsh-light`.
mDNS 主机名为 `dsh-light.local`。扩展只识别根路径首行严格返回 `dsh-light` 的设备。

## Security / 安全说明

The HTTP endpoints use wildcard CORS and have no authentication. They are intended for a small, trusted LAN, not for exposure to the internet or untrusted networks.
HTTP 接口允许跨域且没有身份认证，仅适用于可信的小型局域网，不应暴露到互联网或不可信网络。

Wi-Fi names and passwords are configuration secrets. Do not place them in the `.ino` file, documentation, screenshots, commits, issues, or release attachments.
Wi-Fi 名称和密码属于敏感配置，不得写入主固件、文档、截图、提交、Issue 或发布附件。
