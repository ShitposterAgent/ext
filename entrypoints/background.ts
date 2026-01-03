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

  async function tryInject(tabId: number, script: string) {
    try {
      const result = await bridge.inject(tabId, script);
      bridge.sendMessage({ type: 'injection_result', tabId, success: true, result });
    } catch (e: any) {
      console.error(`[BGM] Injection failed for tab ${tabId}:`, e);
      bridge.sendMessage({ type: 'injection_result', tabId, success: false, error: e.message });
    }
  }

  // Auto-injection based on rules
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      for (const rule of rules) {
        if (rule.enabled && new RegExp(rule.pattern).test(tab.url)) {
          console.log(`[BGM] Auto-injecting rule ${rule.id} into ${tab.url}`);
          tryInject(tabId, rule.script);
        }
      }
    }
    updateTabs();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'inject-request') {
      bridge.inject(message.tabId, message.script)
        .then((result) => sendResponse({ success: true, result }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
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
