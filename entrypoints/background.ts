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
            func: (code: string, scriptId: string) => {
              // The God-Mode SDK
              const win = window as any;
              if (!win.bgm) {
                win.bgm = {
                  id: scriptId,
                  emit: (type: string, payload: any) => {
                    window.postMessage({ source: 'bgm-sdk', type, payload, scriptId }, '*');
                  },
                  log: (msg: string) => {
                    window.postMessage({ source: 'bgm-sdk', type: 'log', payload: msg, scriptId }, '*');
                  },
                  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
                };
                console.log("%c[BGM SDK] Initialized", "color: #6366f1; font-weight: bold;");
              }

              const id = `bgm-script-${scriptId}-${Date.now()}`;
              const scriptEl = document.createElement('script');
              scriptEl.id = id;
              scriptEl.textContent = `(function() { 
                const bgm = (window as any).bgm;
                ${code} 
              })();`;
              document.documentElement.appendChild(scriptEl);
              scriptEl.remove();
            },
            args: [s.content, s.id]
          }).catch(e => console.error(`[BGM] Failed to inject ${s.id}:`, e));
        }
      }
    }
  }

  // Auto-re-inject on navigation
  chrome.tabs.onUpdated.addListener((_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
    if (changeInfo.status === 'complete') {
      reRunScripts();
    }
    updateTabs();
  });

  const updateTabs = async () => {
    const tabs = await chrome.tabs.query({});
    bridge.sendMessage({
      type: 'tabs',
      tabs: tabs.map((t: chrome.tabs.Tab) => ({ id: t.id, url: t.url, title: t.title }))
    });
  };

  chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender) => {
    if (message.type === 'api-reconnect-trigger') {
      chrome.storage.local.get(['bgm_api_port'], (res: any) => {
        if (res.bgm_api_port) bridge.setPort(Number(res.bgm_api_port));
      });
    }

    if (message.type === 'sdk-relay') {
      const { data } = message;
      bridge.sendMessage({
        type: 'sdk_event',
        tabId: sender.tab?.id,
        tabUrl: sender.tab?.url,
        ...data
      });
    }
  });

  chrome.tabs.onCreated.addListener(updateTabs);
  chrome.tabs.onRemoved.addListener(updateTabs);

  setInterval(updateTabs, 10000);
});
