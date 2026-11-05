// ============================================================
// DSH 发光提示灯 v3 — ESP32-C3 SuperMini + WS2812B
// ------------------------------------------------------------
// 端点：
//   GET /alert    -> 橙青交替脉冲（等待授权/审批/提问/选择），直到 /clear
//                    单个脉冲约 0.9 秒，包含明确熄灭段
//   GET /complete -> 绿灯呼吸 5%~25%（完成），直到 /clear
//   GET /clear    -> 关灯，回到待机
//   GET /         -> 返回状态与当前 IP
// 状态：
//   WiFi 异常   -> 红灯快闪（明确闪烁）
//   连网中     -> 红灯呼吸
//   连上       -> 绿灯快闪 3 下
// 发现机制：mDNS 主机名 dsh-light（http://dsh-light.local/）
// 接线（3V 版 WS2812B，线色反常规）：
//   黑 VCC->3V3  红 GND->GND  蓝 DIN->GPIO4  绿 DOUT->不接
// ============================================================

#include <FastLED.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <math.h>

#include "wifi_config.h"

#define LED_PIN    4
#define NUM_LEDS   1
#define MDNS_NAME  "dsh-light"

CRGB leds[NUM_LEDS];
WiFiMulti wifiMulti;
WebServer server(80);

enum Mode { MODE_IDLE, MODE_ALERT, MODE_COMPLETE };
Mode mode = MODE_IDLE;

uint32_t breathTimer = 0;
uint16_t breathPhase = 0;
uint8_t  rainbowHue  = 0;

// 呼吸亮度映射：相位 0~255 -> 区间 [lo, hi]
static uint8_t mapBrightness(uint16_t phase, uint8_t lo, uint8_t hi) {
  float angle = phase * (M_PI * 2.0f / 256.0f);
  float sine = 0.5f - 0.5f * cosf(angle);
  return (uint8_t)(lo + (hi - lo) * sine + 0.5f);
}

// 彩虹渐变的颜色相关亮度上限：
//   绿色（hue≈96）感知最亮 -> 上限 25%
//   其他颜色 -> 上限 50%
//   用 cos 插值让亮度随 hue 平滑过渡（无跳变）
static uint8_t rainbowBrightnessCap(uint8_t hue) {
  // 以绿色为中心（96），距离越远上限越高
  // dist: 0（正绿）~128（绿色对面）
  int dist = (int)hue - 96;
  if (dist < 0) dist = -dist;
  if (dist > 128) dist = 256 - dist;  // 环形距离
  // t: 0（正绿）~1（远离绿色）
  float t = (float)dist / 96.0f;      // 96° 内渐变
  if (t > 1.0f) t = 1.0f;
  // cos 插值：绿色处 25%，96° 外 50%
  float cap = 25.0f + (50.0f - 25.0f) * (0.5f - 0.5f * cosf(t * M_PI));
  return (uint8_t)(cap * 255.0f / 100.0f + 0.5f);  // 转为 0~255
}

// 彩虹呼吸波形：周期约 1.2 秒，亮度在低点（约5%）停顿约0.2秒再回升
// phase 0~149（150 步 * 8ms = 1.2s）
static uint8_t rainbowBreath(uint16_t phase) {
  uint16_t p = phase % 150;
  // 波形分段：
  //   0~24   : 低点停顿（约5%）
  //   25~74  : 上升（5%->100%）
  //   75~124 : 下降（100%->5%）
  //   125~149: 低点停顿（约5%）
  float v;
  if (p < 25) {
    v = 0.0f;                                   // 低点停顿（0%）
  } else if (p < 75) {
    float t = (p - 25) / 50.0f;                 // 0~1
    v = 0.5f - 0.5f * cosf(t * M_PI);                    // 平滑上升 0->100%
  } else if (p < 125) {
    float t = (p - 75) / 50.0f;
    v = 0.5f + 0.5f * cosf(t * M_PI);                    // 平滑下降 100%->0
  } else {
    v = 0.0f;                                   // 低点停顿（0%）
  }
  return (uint8_t)(v * 255.0f + 0.5f);
}
void triggerAlert()    { mode = MODE_ALERT;    breathTimer = millis(); breathPhase = 0; rainbowHue = 0; }
void triggerComplete() { mode = MODE_COMPLETE; breathTimer = millis(); breathPhase = 0; }
void clearLights()     { mode = MODE_IDLE;     leds[0] = CRGB::Black; }

void updateLights() {
  uint32_t now = millis();

  switch (mode) {
    case MODE_ALERT: {
      // 双色交替脉冲：橙色 <-> 青色，每个颜色一次「亮->灭」脉冲
      // 单个脉冲约 0.9 秒（112 步 * 8ms），含明确熄灭段，醒目不刺眼
      if (now - breathTimer >= 8) {
        breathTimer = now;
        breathPhase++;
        // 脉冲波形（0~111）：
        //   0~9    : 熄灭（明确黑点）
        //   10~39  : 快速点亮（0->100%）
        //   40~79  : 缓慢衰减（100%->0）
        //   80~111 : 熄灭停顿
        uint16_t p = breathPhase % 112;
        float v;
        if (p < 10) {
          v = 0.0f;
        } else if (p < 40) {
          float t = (p - 10) / 30.0f;
          v = 0.5f - 0.5f * cosf(t * M_PI);       // 快上
        } else if (p < 80) {
          float t = (p - 40) / 40.0f;
          v = 0.5f + 0.5f * cosf(t * M_PI);       // 慢下
        } else {
          v = 0.0f;
        }
        // 每完成一个脉冲切换颜色：橙色(12) <-> 青色(128)
        uint8_t hue = ((breathPhase / 112) % 2 == 0) ? 12 : 128;
        uint8_t cap = rainbowBrightnessCap(hue);   // 复用亮度上限（这两色都非绿->50%）
        uint8_t vv = (uint8_t)(v * 255.0f + 0.5f);
        uint8_t out = (uint8_t)((uint16_t)cap * vv / 255);
        leds[0] = CHSV(hue, 255, out);
      }
      break;
    }
    case MODE_COMPLETE: {
      // 绿色呼吸 5%~25%，周期约 2 秒
      if (now - breathTimer >= 8) {
        breathTimer = now;
        breathPhase++;
        uint8_t v = mapBrightness(breathPhase, 13, 64);  // 5%~25%（0~255 标度）
        leds[0] = CHSV(96, 255, v);  // 绿色
      }
      break;
    }
    default:
      leds[0] = CRGB::Black;
      break;
  }
}

// 红灯快闪（WiFi 异常指示，持续不返回）
void wifiErrorFlash() {
  while (true) {
    leds[0] = CRGB::Red;    FastLED.show(); delay(150);
    leds[0] = CRGB::Black;  FastLED.show(); delay(150);
  }
}

void setup() {
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(255);  // 不再用全局缩放，亮度由 CHSV 的 V 直接控制
  FastLED.clear();
  FastLED.show();


  configureWiFiNetworks(wifiMulti);

  // 连接中：红灯呼吸；约 30 秒未连上 -> 红灯快闪指示异常
  uint32_t connStart = millis();
  uint32_t connTimer = 0;
  uint16_t connPhase = 0;
  while (wifiMulti.run() != WL_CONNECTED) {
    if (millis() - connStart >= 30000) wifiErrorFlash();
    if (millis() - connTimer >= 8) {
      connTimer = millis();
      connPhase++;
      uint8_t v = mapBrightness(connPhase, 76, 255);
      leds[0] = CHSV(0, 255, v);  // 红色
      FastLED.show();
    }
  }

  // 连上：绿灯快闪 3 下
  for (int i = 0; i < 3; i++) {
    leds[0] = CRGB::Green;  FastLED.show(); delay(150);
    leds[0] = CRGB::Black;  FastLED.show(); delay(150);
  }

  // 允许跨域（Chrome 扩展从 http://127.0.0.1:3080 fetch 内网 IP 需要 CORS 头）
  server.enableCORS(true);
  server.on("/alert", []()    { triggerAlert();    server.send(200, "text/plain", "ok"); });
  server.on("/complete", []() { triggerComplete(); server.send(200, "text/plain", "ok"); });
  server.on("/clear", []()    { clearLights();     server.send(200, "text/plain", "ok"); });
  server.on("/", []() {
    String msg = "dsh-light\nIP: " + WiFi.localIP().toString() + "\nmode: ";
    msg += (mode == MODE_ALERT) ? "alert" : (mode == MODE_COMPLETE) ? "complete" : "idle";
    server.send(200, "text/plain", msg);
  });

  server.begin();
  MDNS.begin(MDNS_NAME);
}

void loop() {
  wifiMulti.run();
  server.handleClient();
  updateLights();
  FastLED.show();
}