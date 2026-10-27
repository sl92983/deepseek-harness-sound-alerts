import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const INTERACTION_SELECTOR = "[data-approval-key], [data-question-key], [data-plan-review-key]";
const TURN_ACTIVITY_SELECTOR = '[data-chat-turn]:not([data-chat-flow-kind="turn-tail"])';
const TURN_PROCESS_SELECTOR = "[data-turn-process]";

class FakeElement {
  constructor(attributes = {}) {
    this.nodeType = 1;
    this.attributes = { ...attributes };
    this.isConnected = true;
  }

  matches(selector) {
    if (selector === INTERACTION_SELECTOR) {
      return ["data-approval-key", "data-question-key", "data-plan-review-key"]
        .some((key) => this.hasAttribute(key));
    }
    if (selector === TURN_ACTIVITY_SELECTOR) {
      return this.hasAttribute("data-chat-turn")
        && this.getAttribute("data-chat-flow-kind") !== "turn-tail";
    }
    if (selector === "[data-turn-tail]") return this.hasAttribute("data-turn-tail");
    return false;
  }

  querySelectorAll() { return []; }
  hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
  getAttribute(name) { return this.hasAttribute(name) ? this.attributes[name] : null; }
}

class FakeAudioParam {
  constructor() { this.value = 0; this.initialValue = null; }
  setValueAtTime(value) {
    this.value = value;
    if (this.initialValue === null) this.initialValue = value;
  }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

function createContent() {
  const oscillators = [];
  const windowListeners = new Map();
  const documentListeners = new Map();
  const observers = [];
  let runningControl = false;
  let activityElements = [];
  let processElements = [];

  class FakeAudioContext {
    constructor() {
      this.state = "suspended";
      this.currentTime = 0;
      this.destination = {};
    }
    async resume() { this.state = "running"; }
    createOscillator() {
      const oscillator = {
        type: "sine",
        frequency: new FakeAudioParam(),
        connect() {},
        start(startAt) { this.startAt = startAt; },
        stop(stopAt) { this.stopAt = stopAt; }
      };
      oscillators.push(oscillator);
      return oscillator;
    }
    createGain() {
      return { gain: new FakeAudioParam(), connect() {} };
    }
  }

  function addListener(registry, event, listener) {
    if (!registry.has(event)) registry.set(event, new Set());
    registry.get(event).add(listener);
  }

  function collection(elements) {
    const result = [...elements];
    result.item = (index) => result[index] || null;
    return result;
  }

  const body = new FakeElement();
  const document = {
    body,
    visibilityState: "visible",
    documentElement: { dataset: {} },
    addEventListener(event, listener) { addListener(documentListeners, event, listener); },
    querySelector(selector) {
      if (selector.includes("aria-label=") && runningControl) {
        return new FakeElement({ "aria-label": "Stop generating" });
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === TURN_ACTIVITY_SELECTOR) return collection(activityElements);
      if (selector === TURN_PROCESS_SELECTOR) return collection(processElements);
      return collection([]);
    }
  };
  const window = {
    AudioContext: FakeAudioContext,
    addEventListener(event, listener) { addListener(windowListeners, event, listener); },
    removeEventListener(event, listener) { windowListeners.get(event)?.delete(listener); }
  };

  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.options = null;
      observers.push(this);
    }
    observe(_target, options) { this.options = options; }
  }

  const context = vm.createContext({
    document,
    window,
    MutationObserver: FakeMutationObserver,
    console: { info() {}, warn() {} }
  });
  vm.runInContext(contentSource, context, { filename: "content.js" });

  return {
    oscillators,
    body,
    document,
    get observerOptions() { return observers[0].options; },
    setRunningControl(value) { runningControl = value; },
    setActivities(elements) { activityElements = elements; },
    setProcesses(elements) { processElements = elements; },
    added(...nodes) {
      observers[0].callback([{ type: "childList", target: body, addedNodes: nodes }]);
    },
    attribute(target, attributeName, oldValue) {
      observers[0].callback([{
        type: "attributes", target, attributeName, oldValue, addedNodes: []
      }]);
    },
    async triggerWindow(event) {
      for (const listener of windowListeners.get(event) || []) await listener();
    }
  };
}

function flushAsyncAudio() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function unlock(env) {
  await env.triggerWindow("pointerdown");
  assert.equal(env.document.documentElement.dataset.dshApprovalAlert, "ready");
}

test("browser audio stays silent before a real user gesture", async () => {
  const env = createContent();
  env.added(new FakeElement({ "data-approval-key": "approval:locked" }));
  await flushAsyncAudio();
  assert.equal(env.oscillators.length, 0);
});

test("approval plays five 880 Hz beeps and duplicate keys stay silent", async () => {
  const env = createContent();
  await unlock(env);
  const approval = new FakeElement({ "data-approval-key": "approval:1" });
  env.added(approval);
  await flushAsyncAudio();
  assert.equal(env.oscillators.length, 5);
  assert.deepEqual(env.oscillators.map((oscillator) => oscillator.frequency.value), [880, 880, 880, 880, 880]);
  assert.equal(env.oscillators.every((oscillator) => oscillator.type === "square"), true);

  env.added(approval);
  await flushAsyncAudio();
  assert.equal(env.oscillators.length, 5);
});

test("questions and plan reviews use the same distinct alert", async () => {
  const env = createContent();
  await unlock(env);
  env.added(new FakeElement({ "data-question-key": "question:1" }));
  env.added(new FakeElement({ "data-plan-review-key": "plan:1" }));
  await flushAsyncAudio();
  assert.equal(env.oscillators.length, 10);
});

test("a disconnected same-key replacement alerts even before pruning", async () => {
  const env = createContent();
  await unlock(env);
  const first = new FakeElement({ "data-approval-key": "approval:reused" });
  env.added(first);
  first.isConnected = false;
  env.added(new FakeElement({ "data-approval-key": "approval:reused" }));
  await flushAsyncAudio();
  assert.equal(env.oscillators.length, 10);
});

test("an in-place interaction-key change produces a new alert", async () => {
  const env = createContent();
  await unlock(env);
  const panel = new FakeElement({ "data-approval-key": "approval:old" });
  env.added(panel);
  panel.attributes["data-approval-key"] = "approval:new";
  env.attribute(panel, "data-approval-key", "approval:old");
  await flushAsyncAudio();
  assert.equal(env.oscillators.length, 10);
});

test("interaction attributes are included in the real observer filter", () => {
  const env = createContent();
  for (const attribute of ["data-approval-key", "data-question-key", "data-plan-review-key"]) {
    assert.equal(env.observerOptions.attributeFilter.includes(attribute), true);
  }
  assert.equal(env.observerOptions.attributeOldValue, true);
});

test("a live activity turn still chimes when the running control disappears first", async () => {
  const env = createContent();
  await unlock(env);
  const activity = new FakeElement({ "data-chat-turn": "turn:1" });
  env.setActivities([activity]);
  env.setRunningControl(true);
  env.added(activity);
  env.setRunningControl(false);
  env.added(new FakeElement({ "data-turn-tail": "turn:1" }));
  await flushAsyncAudio();

  assert.equal(env.oscillators.length, 5);
  assert.equal(env.oscillators.every((oscillator) => oscillator.type === "sine"), true);
  const frequencies = env.oscillators.map((oscillator) => oscillator.frequency.initialValue);
  assert.deepEqual(frequencies, [523.25, 659.25, 783.99, 987.77, 1046.5]);
  assert.equal(frequencies.every((value, index) => index === 0 || value > frequencies[index - 1]), true);
});

test("the foldable process signal remains a live-run fallback", async () => {
  const env = createContent();
  await unlock(env);
  const process = new FakeElement({ "data-turn-process": "turn:process" });
  env.setActivities([]);
  env.setProcesses([process]);
  env.setRunningControl(true);
  env.added(process);
  env.setRunningControl(false);
  env.added(new FakeElement({ "data-turn-tail": "turn:process" }));
  await flushAsyncAudio();
  assert.equal(env.oscillators.length, 5);
});

test("history loaded in one batch does not produce a completion sound", async () => {
  const env = createContent();
  await unlock(env);
  env.added(
    new FakeElement({ "data-chat-turn": "history:1" }),
    new FakeElement({ "data-turn-tail": "history:1" })
  );
  await flushAsyncAudio();
  assert.equal(env.oscillators.length, 0);
});

test("delayed history activity and tail never gain live-run confirmation from time alone", async () => {
  const env = createContent();
  await unlock(env);
  const activity = new FakeElement({ "data-chat-turn": "history:slow" });
  env.setActivities([activity]);
  env.added(activity);
  await new Promise((resolve) => setTimeout(resolve, 510));
  env.added(new FakeElement({ "data-turn-tail": "history:slow" }));
  await flushAsyncAudio();
  assert.equal(env.oscillators.length, 0);
});

test("a tail for an unrelated historical turn cannot use the current live turn", async () => {
  const env = createContent();
  await unlock(env);
  const current = new FakeElement({ "data-chat-turn": "turn:current" });
  env.setActivities([current]);
  env.setRunningControl(true);
  env.added(current);
  env.setRunningControl(false);
  env.added(new FakeElement({ "data-turn-tail": "turn:other" }));
  await flushAsyncAudio();
  assert.equal(env.oscillators.length, 0);
});

test("content script contains no network, storage, cookie, or remote-code APIs", () => {
  assert.doesNotMatch(
    contentSource,
    /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|WebTransport|chrome\.storage|localStorage|sessionStorage|indexedDB|document\.cookie|\beval\s*\(|new\s+Function\b/
  );
});
