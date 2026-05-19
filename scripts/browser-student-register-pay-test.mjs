import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , matrixNumber = "AI220385", password = "123456aA", eventTitle = "ITC Coding Challenge"] = process.argv;
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debugPort = 9333;
const userDataDir = join(tmpdir(), `itc-browser-test-${Date.now()}`);
const useExistingBrowser = process.env.USE_EXISTING_BROWSER === "1";

let chrome = null;
if (!useExistingBrowser) {
  mkdirSync(userDataDir, { recursive: true });
  chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--disable-gpu",
    "about:blank",
  ], { stdio: "ignore" });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url, timeoutMs = 15000, options = undefined) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();
    } catch {}
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function createCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }

    const callbacks = listeners.get(message.method) || [];
    callbacks.forEach((callback) => callback(message.params));
  });

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  return {
    ready,
    on(method, callback) {
      listeners.set(method, [...(listeners.get(method) || []), callback]);
    },
    send(method, params = {}) {
      const messageId = ++id;
      ws.send(JSON.stringify({ id: messageId, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject });
      });
    },
    close() {
      ws.close();
    },
  };
}

async function main() {
  await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
  console.log("Connected to visible browser debugger.");
  const target = useExistingBrowser
    ? (await waitForJson(`http://127.0.0.1:${debugPort}/json/list`)).find((item) => item.type === "page")
    : await waitForJson(
        `http://127.0.0.1:${debugPort}/json/new?about:blank`,
        15000,
        { method: "PUT" }
      );
  if (!target?.webSocketDebuggerUrl) throw new Error("No controllable browser tab found.");
  const cdp = createCdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  console.log("Attached to browser tab.");

  cdp.on("Page.javascriptDialogOpening", async () => {
    await cdp.send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
  });

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const evaluate = async (expression) => {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
    }

    return result.result?.value;
  };

  const waitFor = async (expression, timeoutMs = 20000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const value = await evaluate(expression).catch(() => false);
      if (value) return value;
      await sleep(300);
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  };

  const navigate = async (url) => {
    await cdp.send("Page.navigate", { url });
    await waitFor("document.readyState === 'complete' || document.readyState === 'interactive'");
  };

  await navigate("http://localhost:3000/login?role=student");
  console.log("Opened student login page.");
  await waitFor("Boolean(document.querySelector('#matrixNumber') && document.querySelector('#password'))");

  await evaluate(`(() => {
    const setValue = (selector, value) => {
      const input = document.querySelector(selector);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setValue('#matrixNumber', ${JSON.stringify(matrixNumber)});
    setValue('#password', ${JSON.stringify(password)});
    document.querySelector('form').requestSubmit();
    return true;
  })()`);

  await waitFor("location.pathname.startsWith('/student')", 30000);
  console.log("Logged in as student.");

  await navigate("http://localhost:3000/student/events");
  console.log("Opened student events page.");
  await waitFor("document.body.innerText.includes('Discover Events')");

  const registerResult = await evaluate(`(async () => {
    const title = ${JSON.stringify(eventTitle)};
    const started = Date.now();
    while (Date.now() - started < 15000) {
      const cards = [...document.querySelectorAll('a, div')].filter((el) => el.textContent.includes(title));
      const card = cards.find((el) => [...el.querySelectorAll('button')].some((button) => button.textContent.includes('Register')));
      const button = card && [...card.querySelectorAll('button')].find((item) => item.textContent.includes('Register'));
      if (button) {
        button.click();
        return 'clicked-register';
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return 'register-button-not-found';
  })()`);

  console.log(`Register action: ${registerResult}`);
  await waitFor("document.body.innerText.includes('Registration started') || document.body.innerText.includes('already registered') || document.body.innerText.includes('Registered successfully')", 20000)
    .catch(() => null);

  await navigate("http://localhost:3000/student/registered-events");
  await waitFor("document.body.innerText.includes('My Registered Events')");
  const registeredText = await waitFor(`document.body.innerText.includes(${JSON.stringify(eventTitle)})`, 20000);
  console.log(`Registered event visible: ${Boolean(registeredText)}`);

  const checkoutResult = await evaluate(`(async () => {
    const title = ${JSON.stringify(eventTitle)};
    const cards = [...document.querySelectorAll('div')].filter((el) => el.textContent.includes(title) && el.textContent.includes('Pay Now'));
    const card = cards.sort((a, b) => a.textContent.length - b.textContent.length)[0];
    const button = card && [...card.querySelectorAll('button')].find((item) => item.textContent.includes('Pay Now'));
    if (!button) return { status: 'pay-button-not-found', url: location.href, text: document.body.innerText.slice(0, 1200) };
    button.click();
    const started = Date.now();
    while (Date.now() - started < 30000) {
      if (!location.href.includes('localhost:3000')) {
        return { status: 'redirected', url: location.href };
      }
      if (document.body.innerText.includes('Unable to start') || document.body.innerText.includes('already paid')) {
        return { status: 'message', url: location.href, text: document.body.innerText.slice(0, 1200) };
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return { status: 'timeout-waiting-for-checkout', url: location.href, text: document.body.innerText.slice(0, 1200) };
  })()`);

  console.log("Checkout result:", JSON.stringify(checkoutResult, null, 2));

  cdp.close();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (chrome) {
      chrome.kill();
      await sleep(500);
      rmSync(userDataDir, { recursive: true, force: true });
    }
  });
