import { BGMBridge } from '../utils/bridge';

interface UserScript {
  id: string;
  content: string;
  path: string;
  metadata: {
    name?: string;
    match?: string;
    tabs?: number[];
    enabled: boolean;
  };
}

export default defineBackground(() => {
  const bridge = new BGMBridge();
  let scripts = new Map<string, UserScript>();

  // Script parser for Headers
  function parseMetadata(content: string): UserScript['metadata'] {
    const meta: UserScript['metadata'] = { enabled: true };
    const header = content.match(/\/\/ ==BGM==([\s\S]*?)\/\/ ==\/BGM==/);
    if (!header) return meta;

    const lines = header[1].split('\n');
    for (const line of lines) {
      const match = line.match(/@(\w+)\s+(.*)/);
      if (match) {
        const [, key, value] = match;
        if (key === 'name') meta.name = value.trim();
        if (key === 'match') meta.match = value.trim();
        if (key === 'tabs') meta.tabs = value.split(',').map(Number);
      }
    }
    return meta;
  }

  bridge.onMessage(async (msg: any) => {
    if (msg.type === 'sync_script') {
      const { script } = msg;
      const metadata = parseMetadata(script.content);
      const userScript: UserScript = { ...script, metadata };
      scripts.set(script.id, userScript);

      // Persist for UI
      chrome.storage.local.get(['bgm_synced_scripts'], (res) => {
        const stored = res.bgm_synced_scripts || {};
        stored[script.id] = userScript;
        chrome.storage.local.set({ bgm_synced_scripts: stored });
      });

      console.log(`[BGM] Script synced: ${userScript.metadata.name || script.id}`);

      // Immediate execution check
      reRunScripts(userScript);
    }
  });

  async function reRunScripts(script?: UserScript) {
    const tabs = await chrome.tabs.query({});
    const scriptList = script ? [script] : Array.from(scripts.values());

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;

      for (const s of scriptList) {
        let shouldInject = false;

        // Match by pattern
        if (s.metadata.match) {
          const regex = new RegExp(s.metadata.match.replace(/\*/g, '.*'));
          if (regex.test(tab.url)) shouldInject = true;
        }

        // Match by explicit IDs
        if (s.metadata.tabs && s.metadata.tabs.includes(tab.id)) {
          shouldInject = true;
        }

        if (shouldInject) {
          console.log(`[BGM] Injecting ${s.id} into tab ${tab.id}`);
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN', // Run in page context for full control
            func: (code) => {
              // Create a unique container/script tag to avoid collisions and allow cleanup
              const id = `bgm-script-${Date.now()}`;
              const scriptEl = document.createElement('script');
              scriptEl.id = id;
              scriptEl.textContent = `(function() { ${code} \n})();`;
              document.documentElement.appendChild(scriptEl);
              scriptEl.remove(); // Cleanup DOM but script stays running
            },
            args: [s.content]
          }).catch(e => console.error(`[BGM] Failed to inject ${s.id}:`, e));
        }
      }
    }
  }

  // Auto-re-inject on navigation
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      reRunScripts();
    }
    updateTabs();
  });

  const updateTabs = async () => {
    const tabs = await chrome.tabs.query({});
    bridge.sendMessage({
      type: 'tabs',
      tabs: tabs.map(t => ({ id: t.id, url: t.url, title: t.title }))
    });
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'api-reconnect-trigger') {
      chrome.storage.local.get(['bgm_api_port'], (res: any) => {
        if (res.bgm_api_port) bridge.setPort(Number(res.bgm_api_port));
      });
    }
  });

  chrome.tabs.onCreated.addListener(updateTabs);
  chrome.tabs.onRemoved.addListener(updateTabs);

  setInterval(updateTabs, 10000);
});
