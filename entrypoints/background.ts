import { BGMBridge } from '../utils/bridge';

export default defineBackground(() => {
  const bridge = new BGMBridge();

  bridge.onMessage(async (msg) => {
    if (msg.type === 'inject') {
      try {
        await bridge.inject(msg.tabId, msg.script);
      } catch (e) {
        console.error('[BGM] Injection failed:', e);
      }
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'inject-request') {
      bridge.inject(message.tabId, message.script)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // Keep channel open for async response
    }
  });

  const updateTabs = async () => {
    const tabs = await chrome.tabs.query({});
    bridge.sendMessage({
      type: 'tabs',
      tabs: tabs.map(t => ({ id: t.id, url: t.url, title: t.title }))
    });
  };

  chrome.tabs.onUpdated.addListener(updateTabs);
  chrome.tabs.onCreated.addListener(updateTabs);
  chrome.tabs.onRemoved.addListener(updateTabs);

  // Initial tab broadcast after connection delay
  setTimeout(updateTabs, 2000);
});
