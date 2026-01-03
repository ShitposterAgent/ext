export const HOST_NAME = 'com.nathfavour.bgm';

export class BGMBridge {
    private port: chrome.runtime.Port | null = null;
    private onMessageCallbacks: ((msg: any) => void)[] = [];

    constructor() {
        this.connect();
    }

    private connect() {
        console.log('[BGM] Connecting to native host...');
        this.port = chrome.runtime.connectNative(HOST_NAME);

        this.port.onMessage.addListener((msg) => {
            console.log('[BGM] Received:', msg);
            this.onMessageCallbacks.forEach(cb => cb(msg));
        });

        this.port.onDisconnect.addListener(() => {
            console.warn('[BGM] Disconnected:', chrome.runtime.lastError?.message);
            this.port = null;
            setTimeout(() => this.connect(), 5000);
        });
    }

    public sendMessage(msg: any) {
        if (this.port) {
            this.port.postMessage(msg);
        } else {
            console.error('[BGM] Cannot send, not connected');
        }
    }

    public onMessage(cb: (msg: any) => void) {
        this.onMessageCallbacks.push(cb);
    }

    public async inject(tabId: number, script: string) {
        return new Promise<void>((resolve, reject) => {
            const debuggee = { tabId };
            chrome.debugger.attach(debuggee, '1.3', () => {
                if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);

                chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
                    expression: script,
                    userGesture: true,
                    awaitPromise: true,
                }, (result) => {
                    const err = chrome.runtime.lastError;
                    chrome.debugger.detach(debuggee, () => {
                        if (err) reject(err);
                        else if ((result as any)?.exceptionDetails) reject(new Error((result as any).exceptionDetails.text));
                        else resolve();
                    });
                });
            });
        });
    }
}
