import { BGMBridge } from '../utils/bridge';

interface Rule {
  id: string;
  pattern: string; // URL regex
  script: string;
  enabled: boolean;
}

export default defineBackground(() => {
  const bridge = new BGMBridge();
  let rules: Rule[] = [];

  // Load rules from storage
  chrome.storage.local.get(['bgm_rules'], (result) => {
    if (result.bgm_rules) rules = result.bgm_rules;
  });

  bridge.onMessage(async (msg) => {
    if (msg.type === 'inject') {
      const { tabId, script } = msg;
      if (tabId === 'all') {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id) tryInject(tab.id, script);
        }
      } else {
        tryInject(Number(tabId), script);
      }
    } else if (msg.type === 'navigate') {
      const { tabId, url } = msg;
      if (tabId === 'new') {
        chrome.tabs.create({ url });
      } else {
        chrome.tabs.update(Number(tabId), { url });
      }
    } else if (msg.type === 'scroll') {
      const { tabId, x, y } = msg;
      const script = `window.scrollTo(${x || 0}, ${y || 0})`;
      tryInject(Number(tabId), script, 'scroll');
    } else if (msg.type === 'resize') {
      const { width, height } = msg;
      chrome.windows.getCurrent((win) => {
        if (win.id) chrome.windows.update(win.id, { width, height });
      });
    } else if (msg.type === 'click') {
      const { tabId, selector } = msg;
      const script = `document.querySelector('${selector}')?.click()`;
      tryInject(Number(tabId), script, 'click');
    } else if (msg.type === 'type') {
      const { tabId, selector, text } = msg;
      const script = `
        (function() {
          const el = document.querySelector('${selector}');
          if (el) {
            el.value = '${text}';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()
      `;
      tryInject(Number(tabId), script, 'type');
    } else if (msg.type === 'capture') {
      const { tabId } = msg;
      chrome.tabs.captureVisibleTab((dataUrl) => {
        bridge.sendMessage({ type: 'capture_result', tabId, dataUrl });
      });
    } else if (msg.type === 'get_html') {
      const { tabId } = msg;
      const script = `document.documentElement.outerHTML`;
      try {
        const result = await bridge.inject(Number(tabId), script);
        bridge.sendMessage({ type: 'html_result', tabId, html: result });
      } catch (e: any) {
        bridge.sendMessage({ type: 'html_result', tabId, error: e.message });
      }
    } else if (msg.type === 'set_rules') {
      rules = msg.rules;
      chrome.storage.local.set({ bgm_rules: rules });
      console.log('[BGM] Rules updated:', rules.length);
    }
  });

  async function logAudit(type: string, details: any) {
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Error().stack, // Just for time info or use new Date().toISOString()
      time: new Date().toISOString(),
      type,
      ...details
    };

    chrome.storage.local.get(['audit_logs'], (result) => {
      const logs = [logEntry, ...(result.audit_logs || [])].slice(0, 100);
      chrome.storage.local.set({ audit_logs: logs });
    });

    // Also notify controller
    bridge.sendMessage({ type: 'audit_log', log: logEntry });
  }

  async function tryInject(tabId: number, script: string, source: string = 'remote') {
    try {
      const result = await bridge.inject(tabId, script);
      await logAudit('injection', { tabId, script: script.substring(0, 100), result, source, success: true });
      bridge.sendMessage({ type: 'injection_result', tabId, success: true, result });
    } catch (e: any) {
      console.error(`[BGM] Injection failed for tab ${tabId}:`, e);
      await logAudit('injection', { tabId, script: script.substring(0, 100), error: e.message, source, success: false });
      bridge.sendMessage({ type: 'injection_result', tabId, success: false, error: e.message });
    }
  }

  // Auto-injection based on rules
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      for (const rule of rules) {
        if (rule.enabled && new RegExp(rule.pattern).test(tab.url)) {
          console.log(`[BGM] Auto-injecting rule ${rule.id} into ${tab.url}`);
          tryInject(tabId, rule.script, `rule:${rule.id}`);
        }
      }
    }
    updateTabs();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'inject-request') {
      tryInject(message.tabId, message.script, 'popup')
        .then((result) => sendResponse({ success: true, result }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    } else if (message.type === 'update-rules-broadcast') {
      chrome.storage.local.get(['bgm_rules'], (result) => {
        if (result.bgm_rules) {
          rules = result.bgm_rules;
          bridge.sendMessage({ type: 'set_rules', rules: rules });
        }
      });
    }
  });

  const updateTabs = async () => {
    const tabs = await chrome.tabs.query({});
    bridge.sendMessage({
      type: 'tabs',
      tabs: tabs.map(t => ({ id: t.id, url: t.url, title: t.title }))
    });
  };

  chrome.tabs.onCreated.addListener(updateTabs);
  chrome.tabs.onRemoved.addListener(updateTabs);

  // Initial tab broadcast and periodic heartbeat
  setTimeout(updateTabs, 2000);
  setInterval(updateTabs, 30000);
});
