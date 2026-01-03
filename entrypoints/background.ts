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
        tryInject(tabId, script);
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
