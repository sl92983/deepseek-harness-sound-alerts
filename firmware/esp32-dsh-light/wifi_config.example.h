#pragma once

// Copy this file to wifi_config.h in the same directory, then replace the
// placeholders with your own network names and passwords. wifi_config.h is
// ignored by Git and must never be committed.
void configureWiFiNetworks(WiFiMulti &wifiMulti) {
  wifiMulti.addAP("YOUR_WIFI_SSID", "YOUR_WIFI_PASSWORD");
  // Optional: add a second known network.
  // wifiMulti.addAP("YOUR_SECOND_WIFI_SSID", "YOUR_SECOND_WIFI_PASSWORD");
}
