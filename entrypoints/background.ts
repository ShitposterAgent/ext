export default defineBackground(() => {
  console.log('BGM Bridge started');

  const hostName = 'com.nathfavour.bgm';
  let nativePort: chrome.runtime.Port | null = null;

  function connectNative() {
    nativePort = chrome.runtime.connectNative(hostName);
    console.log('Connected to native host:', hostName);

    nativePort.onMessage.addListener((message) => {
      console.log('Received from native host:', message);
      handleNativeMessage(message);
    });

    nativePort.onDisconnect.addListener(() => {
      console.log('Disconnected from native host:', chrome.runtime.lastError?.message);
      nativePort = null;
      // Reconnect after a delay
      setTimeout(connectNative, 5000);
    });
  }

  async function handleNativeMessage(message: any) {
    if (message.type === 'inject') {
      const { tabId, script } = message;
      try {
        await injectScript(tabId, script);
      } catch (error) {
        console.error('Injection failed:', error);
      }
    }
  }

  async function injectScript(tabId: number, script: string) {
    return new Promise<void>((resolve, reject) => {
      const debuggee = { tabId };
      chrome.debugger.attach(debuggee, '1.3', () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        chrome.debugger.sendCommand(
          debuggee,
          'Runtime.evaluate',
          {
            expression: script,
            userGesture: true,
            awaitPromise: true,
          },
          (result) => {
            const error = chrome.runtime.lastError;
            chrome.debugger.detach(debuggee, () => {
              if (error) reject(error);
              else if (result && (result as any).exceptionDetails) {
                reject(new Error((result as any).exceptionDetails.text));
              } else {
                resolve();
              }
            });
          }
        );
      });
    });
  }

  async function updateTabs() {
    if (!nativePort) return;
    const tabs = await chrome.tabs.query({});
    nativePort.postMessage({
      type: 'tabs',
      tabs: tabs.map(t => ({ id: t.id, url: t.url, title: t.title }))
    });
  }

  chrome.tabs.onUpdated.addListener(updateTabs);
  chrome.tabs.onCreated.addListener(updateTabs);
  chrome.tabs.onRemoved.addListener(updateTabs);

  connectNative();
  // Initial tab update after a connection delay
  setTimeout(updateTabs, 1000);
});
