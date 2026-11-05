// DeepSeek Harness Sound Alerts - content script
// Sound and optional ESP32 light cues for interactions and completed turns.

(() => {
  "use strict";

  const APPROVAL_SELECTOR = "[data-approval-key]";
  const QUESTION_SELECTOR = "[data-question-key], [data-plan-review-key]";
  const INTERACTION_SELECTOR = `${APPROVAL_SELECTOR}, ${QUESTION_SELECTOR}`;
  const INTERACTION_ATTRIBUTES = [
    "data-approval-key",
    "data-question-key",
    "data-plan-review-key"
  ];
  const TURN_PROCESS_SELECTOR = "[data-turn-process]";
  const TURN_ACTIVITY_SELECTOR = '[data-chat-turn]:not([data-chat-flow-kind="turn-tail"])';
  const TURN_TAIL_SELECTOR = "[data-turn-tail]";
  const RUNNING_LABELS = new Set([
    "Stop generating",
    "停止生成",
    "Queue message",
    "排队发送",
    "Steer message",
    "插话发送"
  ]);
  const RUNNING_CONTROL_SELECTOR = [...RUNNING_LABELS]
    .map((label) => `[aria-label="${label}"]`)
    .join(", ");
  const UNLOCK_EVENTS = ["pointerdown", "keydown"];

  // ===================== 物理灯联动（ESP32 dsh-light） =====================
  // 设备发现：扫描配置的子网，查找根路径返回 dsh-light 的 ESP32 并缓存 IP。
  const LIGHT = {
    ip: null,            // 缓存的灯 IP
    base: null,          // http://<ip>
    discovering: false,
    discoveryPromise: null,
    lastDiscover: 0,
    enabled: true,
    active: false,       // 有灯效需要清除时才发送 /clear
    queue: Promise.resolve()
  };

  function lightLog(...a) { console.info("[DSH Light]", ...a); }

  // 通过 WebRTC 获取本机内网 IP（用于推断子网）
  function getLocalIP() {
    return new Promise((resolve) => {
      let resolved = false;
      const done = (ip) => { if (!resolved) { resolved = true; resolve(ip); } };
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel("");
        pc.onicecandidate = (e) => {
          if (!e.candidate) { done(null); return; }
          const m = /([0-9]{1,3}\.){3}[0-9]{1,3}/.exec(e.candidate.candidate);
          if (m) {
            const ip = m[0];
            if (/^(172\.31\.|192\.168\.|10\.)/.test(ip)) done(ip);
          }
        };
        pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => done(null));
        setTimeout(() => { try { pc.close(); } catch (e) {} done(null); }, 1500);
      } catch (e) { done(null); }
    });
  }

  // 按需修改常见候选网段；WebRTC 可获取本机内网 IP 时还会追加本机网段。
  // 如果设备位于独立无线网段，请在这里添加其 IPv4 前三段，例如 "192.168.2"。
  const FIXED_PREFIXES = ["192.168.1", "192.168.0"];
  async function getScanPrefixes() {
    const prefixes = [...FIXED_PREFIXES];
    const ip = await getLocalIP();
    if (ip) {
      const parts = ip.split(".");
      const local = parts.slice(0, 3).join(".");
      if (!prefixes.includes(local)) prefixes.push(local);
    }
    return prefixes;
  }

  // 探测单个 IP 是否是灯（根路径返回 dsh-light）
  async function probeLight(ip) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1200);
    try {
      const r = await fetch(`http://${ip}/`, { signal: ctrl.signal, cache: "no-store" });
      if (!r.ok) return false;
      const txt = await r.text();
      return txt.split(/\r?\n/, 1)[0].trim() === "dsh-light";
    } catch (e) {
      return false;
    } finally {
      clearTimeout(t);
    }
  }

  // 优先尝试 mDNS，再扫描子网；失败后的短时间内不重复扫描。
  const DISCOVERY_COOLDOWN_MS = 10000;
  async function discoverLight() {
    if (LIGHT.discovering) return LIGHT.discoveryPromise;
    if (!LIGHT.ip && Date.now() - LIGHT.lastDiscover < DISCOVERY_COOLDOWN_MS) return null;
    LIGHT.discovering = true;
    LIGHT.lastDiscover = Date.now();
    LIGHT.discoveryPromise = (async () => {
      try {
        if (await probeLight("dsh-light.local")) {
          LIGHT.ip = "dsh-light.local";
          LIGHT.base = "http://dsh-light.local";
          lightLog("找到灯:", LIGHT.ip);
          return LIGHT.ip;
        }
        const prefixes = await getScanPrefixes();
        lightLog("扫描子网", prefixes.map((p) => p + ".0/24").join(", "));
        const BATCH = 32;
        for (const prefix of prefixes) {
          if (LIGHT.ip) break;
          for (let start = 1; start <= 254 && !LIGHT.ip; start += BATCH) {
            const end = Math.min(start + BATCH - 1, 254);
            const tasks = [];
            for (let i = start; i <= end; i++) {
              const ip = `${prefix}.${i}`;
              tasks.push(probeLight(ip).then((ok) => {
                if (ok && !LIGHT.ip) {
                  LIGHT.ip = ip;
                  LIGHT.base = `http://${ip}`;
                  lightLog("找到灯:", ip);
                }
              }));
            }
            await Promise.all(tasks);
          }
        }
        if (!LIGHT.ip) lightLog("未发现灯");
        return LIGHT.ip;
      } finally {
        LIGHT.discovering = false;
      }
    })();
    return LIGHT.discoveryPromise;
  }

  // 串行发送灯效命令，确保 alert/complete/clear 不会因网络延迟而乱序。
  async function sendLightCommand(path) {
    if (!LIGHT.enabled) return false;
    if (!LIGHT.base) await discoverLight();
    if (!LIGHT.base) return false;

    const base = LIGHT.base;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    try {
      const response = await fetch(`${base}${path}`, { signal: ctrl.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`Light command failed: ${response.status}`);
      return true;
    } catch (e) {
      lightLog("命令失败，重新发现", path);
      if (LIGHT.base === base) {
        LIGHT.ip = null;
        LIGHT.base = null;
      }
      void discoverLight();
      return false;
    } finally {
      clearTimeout(t);
    }
  }

  function queueLightCommand(path) {
    const result = LIGHT.queue.then(() => sendLightCommand(path));
    LIGHT.queue = result.catch(() => false);
    return result;
  }

  const lightAlert = () => {
    LIGHT.active = true;
    return queueLightCommand("/alert");
  };
  const lightComplete = () => {
    LIGHT.active = true;
    return queueLightCommand("/complete");
  };
  const lightClear = () => {
    if (!LIGHT.active) return Promise.resolve(false);
    LIGHT.active = false;
    return queueLightCommand("/clear");
  };

  // 启动即后台发现一次
  setTimeout(() => { void discoverLight(); }, 800);
  // 是否有授权/问题/选择面板在场（有待处理项时不该关灯）
  const hasPendingInteraction = () =>
    !!document.querySelector("[data-approval-key], [data-question-key], [data-plan-review-key]");

  // 切回页面（可见）时关灯——但有待处理授权/选择时保持灯亮，等处理完由 prune 关灯
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !hasPendingInteraction()) lightClear();
  });
  // 窗口重新聚焦时关灯（覆盖切窗口/最小化还原）——同样跳过待处理情况
  window.addEventListener("focus", () => { if (!hasPendingInteraction()) lightClear(); }, true);
  // 用户与页面交互时关灯——同样跳过待处理情况（授权面板上的点击不该误灭）
  const clearOnInteract = () => { if (!hasPendingInteraction()) lightClear(); };
  window.addEventListener("pointerdown", clearOnInteract, true);
  window.addEventListener("keydown", clearOnInteract, true);
  // ===================== 物理灯联动结束 =====================
  // Number of beeps for approval and user-question requests.
  const BEEP_COUNT = 5;
  // History mounts activity and tail together; a real run keeps the turn open.
  const MIN_REAL_RUN_MS = 500;

  let audioCtx = null;
  let unlocked = false;

  // Approval/question keys already beeped for, mapped to elements for cleanup.
  const seen = new Map(); // typed key -> Element
  // Live controls explicitly confirm a run; generic turn-activity timestamps
  // provide the reliable path even when no foldable process UI is rendered.
  const runningTurns = new Set();
  const turnStartedAt = new Map(); // turn -> performance.now()

  async function unlock() {
    // AudioContext must be created/resumed while Chrome is handling a real
    // user gesture. Merely remembering that a click happened is insufficient.
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === "suspended") await ctx.resume();
      unlocked = ctx.state === "running";
    } catch (error) {
      console.warn("[DeepSeek Harness Sound Alerts] Could not unlock audio", error);
    }

    if (unlocked) {
      document.documentElement.dataset.dshApprovalAlert = "ready";
      for (const evt of UNLOCK_EVENTS) {
        window.removeEventListener(evt, unlock, true);
      }
      console.info("[DeepSeek Harness Sound Alerts] Audio ready");
    }
  }

  // Browsers block audio before any user gesture. A single interaction unlocks.
  for (const evt of UNLOCK_EVENTS) {
    window.addEventListener(evt, unlock, { capture: true, passive: true });
  }

  function getAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }

  // One short beep: a soft square-ish tone with a fast attack and decay.
  function beep(ctx, freq, startAt, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = freq;

    // Gentle envelope to avoid clicks.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.75, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }

  async function playBeeps() {
    if (!unlocked) {
      console.warn("[DeepSeek Harness Sound Alerts] Interaction detected, but audio is not unlocked yet");
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === "suspended") await ctx.resume();
    } catch (error) {
      console.warn("[DeepSeek Harness Sound Alerts] Could not resume audio", error);
      return;
    }
    if (ctx.state !== "running") return;

    const now = ctx.currentTime + 0.02;
    const freq = 880; // A5
    const beepLen = 0.12;
    const gap = 0.09;

    for (let i = 0; i < BEEP_COUNT; i++) {
      beep(ctx, freq, now + i * (beepLen + gap), beepLen);
    }
    console.info("[DeepSeek Harness Sound Alerts] Beeped");
  }

  function completionNote(ctx, freq, startAt, duration, volume) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startAt);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.025, startAt + duration);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.03);
  }

  async function playCompletionSound() {
    if (!unlocked) {
      console.warn("[DeepSeek Harness Sound Alerts] Turn completed, but audio is not unlocked yet");
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") await ctx.resume();
    } catch (error) {
      console.warn("[DeepSeek Harness Sound Alerts] Could not resume completion audio", error);
      return;
    }
    if (ctx.state !== "running") return;

    const now = ctx.currentTime + 0.02;
    // A five-note ascending chime, clearly different from approval beeps.
    completionNote(ctx, 523.25, now, 0.72, 0.42); // C5
    completionNote(ctx, 659.25, now + 0.34, 0.78, 0.46); // E5
    completionNote(ctx, 783.99, now + 0.70, 1.08, 0.50); // G5
    completionNote(ctx, 987.77, now + 1.12, 0.82, 0.53); // B5
    completionNote(ctx, 1046.50, now + 1.52, 1.10, 0.57); // C6
    console.info("[DeepSeek Harness Sound Alerts] Completion chime played");
  }

  // Manual diagnostics from DevTools Console.
  document.addEventListener("dsh-approval-alert-test", () => {
    void playBeeps();
  });
  document.addEventListener("dsh-completion-alert-test", () => {
    void playCompletionSound();
  });

  function handleNode(node) {
    if (node.nodeType !== 1) return; // elements only
    const el = node.matches
      ? node
      : node.querySelector
        ? node
        : null;
    if (!el) return;

    // Collect approval, question, and plan-review interaction roots.
    const candidates = [];
    if (el.matches && el.matches(INTERACTION_SELECTOR)) {
      candidates.push(el);
    }
    if (el.querySelectorAll) {
      candidates.push(...el.querySelectorAll(INTERACTION_SELECTOR));
    }

    let beeped = false;
    for (const c of candidates) {
      const attribute = c.hasAttribute("data-approval-key")
        ? "data-approval-key"
        : c.hasAttribute("data-question-key")
          ? "data-question-key"
          : "data-plan-review-key";
      const rawKey = c.getAttribute(attribute);
      if (!rawKey) continue;
      const key = `${attribute}:${rawKey}`;
      const existing = seen.get(key);
      if (existing?.isConnected) continue;
      if (existing) seen.delete(key);
      seen.set(key, c);
      beeped = true;
    }

    if (beeped) { void playBeeps(); lightAlert(); }
  }

  function elementsIn(node, selector) {
    if (node.nodeType !== 1) return [];
    const matches = [];
    if (node.matches?.(selector)) matches.push(node);
    if (node.querySelectorAll) matches.push(...node.querySelectorAll(selector));
    return matches;
  }

  function handleTurnActivityNode(node) {
    const turns = new Set();
    for (const activity of elementsIn(node, TURN_ACTIVITY_SELECTOR)) {
      const turn = activity.getAttribute("data-chat-turn");
      if (turn) turns.add(turn);
    }
    // Keep data-turn-process as an additional signal for compatibility.
    for (const process of elementsIn(node, TURN_PROCESS_SELECTOR)) {
      const turn = process.getAttribute("data-turn-process");
      if (turn) turns.add(turn);
    }
    const hasRunningControl = !!document.querySelector(RUNNING_CONTROL_SELECTOR);
    for (const turn of turns) {
      // The explicit running control is the strongest live-run signal. Keep
      // the process signal as a fallback for Harness versions that still
      // render it, but never infer a live run from time or DOM shape alone.
      const hasLiveProcess = elementsIn(node, TURN_PROCESS_SELECTOR)
        .some((process) => process.getAttribute("data-turn-process") === turn);
      if (!hasRunningControl && !hasLiveProcess) continue;
      if (!turnStartedAt.has(turn)) {
        turnStartedAt.set(turn, performance.now());
      }
      runningTurns.add(turn);
    }
  }

  function armVisibleRunningTurn(force = false) {
    if (!force && !document.querySelector(RUNNING_CONTROL_SELECTOR)) return;
    const processes = document.querySelectorAll(TURN_PROCESS_SELECTOR);
    const latest = processes.item(processes.length - 1);
    const turn = latest?.getAttribute("data-turn-process");
    if (turn) {
      runningTurns.add(turn);
      return;
    }

    // Current Harness may render only the foldable turn activity and running
    // control. Use the latest non-tail turn when no process signal exists.
    const activities = document.querySelectorAll(TURN_ACTIVITY_SELECTOR);
    for (let i = activities.length - 1; i >= 0; i--) {
      const activityTurn = activities.item(i)?.getAttribute("data-chat-turn");
      if (activityTurn) {
        runningTurns.add(activityTurn);
        return;
      }
    }
  }

  function handleCompletionNode(node) {
    for (const tail of elementsIn(node, TURN_TAIL_SELECTOR)) {
      const turn = tail.getAttribute("data-turn-tail");
      if (!turn) continue;

      const startedAt = turnStartedAt.get(turn);
      const confirmedByControl = runningTurns.has(turn);
      const livedLongEnough = startedAt !== undefined
        && performance.now() - startedAt >= MIN_REAL_RUN_MS;

      runningTurns.delete(turn);
      turnStartedAt.delete(turn);
      if (!confirmedByControl && !livedLongEnough) continue;
      void playCompletionSound(); lightComplete();
    }
  }

  // Prune entries whose element is gone, so a reused key could re-beep.
  function prune() {
    let removed = false;
    for (const [key, el] of seen) {
      const separator = key.indexOf(":");
      const attribute = key.slice(0, separator);
      const rawKey = key.slice(separator + 1);
      if (!el.isConnected || el.getAttribute(attribute) !== rawKey) {
        seen.delete(key);
        removed = true;
      }
    }
    // 只有所有待处理面板都消失后才关灯，避免处理一个面板时误灭另一个。
    if (removed && seen.size === 0 && !hasPendingInteraction()) lightClear();
  }

  const observer = new MutationObserver((mutations) => {
    const nodesToCheck = new Set();
    let sawRunningControl = false;
    for (const m of mutations) {
      if (m.type === "attributes") {
        nodesToCheck.add(m.target);
        if (INTERACTION_ATTRIBUTES.includes(m.attributeName)) handleNode(m.target);
        if (m.attributeName === "aria-label") {
          const currentLabel = m.target.getAttribute("aria-label");
          sawRunningControl = sawRunningControl
            || RUNNING_LABELS.has(m.oldValue)
            || RUNNING_LABELS.has(currentLabel);
        }
      }
      for (const added of m.addedNodes) {
        nodesToCheck.add(added);
        handleNode(added);
      }
    }

    // Record any non-tail activity for the turn before checking its tail.
    // History mounts activity and tail together and fails the duration threshold.
    for (const node of nodesToCheck) handleTurnActivityNode(node);
    armVisibleRunningTurn(sawRunningControl);
    for (const node of nodesToCheck) handleCompletionNode(node);

    if (seen.size > 0) prune();
  });

  function start() {
    // Scan anything already present, then watch for additions.
    document.documentElement.dataset.dshApprovalAlert = "loaded";
    handleNode(document.body);
    armVisibleRunningTurn();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        "aria-label",
        "data-chat-turn",
        "data-chat-flow-kind",
        "data-turn-process",
        "data-turn-tail",
        ...INTERACTION_ATTRIBUTES
      ]
    });
    console.info("[DeepSeek Harness Sound Alerts] Loaded; click the page once to enable audio");
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  }
})();
