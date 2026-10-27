// DeepSeek Harness Sound Alerts - content script
// Sounds for approval requests, user questions, and completed turns.

(() => {
  "use strict";

  const APPROVAL_SELECTOR = "[data-approval-key]";
  const QUESTION_SELECTOR = "[data-question-key], [data-plan-review-key]";
  const INTERACTION_SELECTOR = `${APPROVAL_SELECTOR}, ${QUESTION_SELECTOR}`;
  const INTERACTION_ATTRIBUTES = new Set([
    "data-approval-key",
    "data-question-key",
    "data-plan-review-key"
  ]);
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

  // Number of beeps for approval and user-question requests.
  const BEEP_COUNT = 5;


  let audioCtx = null;
  let unlocked = false;

  // Approval/question keys already beeped for, mapped to elements for cleanup.
  const seen = new Map(); // typed key -> Element
  // A tail completes only a turn confirmed by a live running control.
  const runningTurns = new Set();

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
      // A root can be reused with a new key, or replaced before the next prune.
      for (const [otherKey, element] of seen) {
        if (element === c) seen.delete(otherKey);
      }
      seen.set(key, c);
      beeped = true;
    }

    if (beeped) void playBeeps();
  }

  function elementsIn(node, selector) {
    if (node.nodeType !== 1) return [];
    const matches = [];
    if (node.matches?.(selector)) matches.push(node);
    if (node.querySelectorAll) matches.push(...node.querySelectorAll(selector));
    return matches;
  }

  function latestTurn(selector, attribute) {
    const elements = document.querySelectorAll(selector);
    const latest = elements.item(elements.length - 1);
    return latest?.getAttribute(attribute);
  }

  function armVisibleRunningTurn(force = false) {
    if (!force && !document.querySelector(RUNNING_CONTROL_SELECTOR)) return;
    // Prefer generic activity so completion also works without foldable process UI.
    const activityTurn = latestTurn(TURN_ACTIVITY_SELECTOR, "data-chat-turn");
    const processTurn = latestTurn(TURN_PROCESS_SELECTOR, "data-turn-process");
    const turn = activityTurn || processTurn;
    if (turn) runningTurns.add(turn);
  }

  function handleCompletionNode(node) {
    for (const tail of elementsIn(node, TURN_TAIL_SELECTOR)) {
      const turn = tail.getAttribute("data-turn-tail");
      if (!turn) continue;

      const confirmedByControl = runningTurns.has(turn);
      runningTurns.delete(turn);
      if (!confirmedByControl) continue;
      void playCompletionSound();
    }
  }

  // Prune entries whose element is gone, so a reused key could re-beep.
  function prune() {
    for (const [key, el] of seen) {
      if (!el.isConnected) seen.delete(key);
    }
  }

  const observer = new MutationObserver((mutations) => {
    const nodesToCheck = new Set();
    let sawRunningControl = false;
    for (const m of mutations) {
      if (m.type === "attributes") {
        nodesToCheck.add(m.target);
        if (INTERACTION_ATTRIBUTES.has(m.attributeName)) {
          if (m.oldValue) seen.delete(`${m.attributeName}:${m.oldValue}`);
          handleNode(m.target);
        }
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

    // Arm the live turn before checking any tail added in the same batch.
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
        "data-approval-key",
        "data-question-key",
        "data-plan-review-key",
        "data-chat-turn",
        "data-chat-flow-kind",
        "data-turn-process",
        "data-turn-tail"
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
