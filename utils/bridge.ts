export class BGMBridge {
    private ws: WebSocket | null = null;
    private onMessageCallbacks: ((msg: any) => void)[] = [];

    private portNum: number = 58421;

    constructor() {
        this.connect();
    }

    public setPort(port: number) {
        if (this.portNum === port) return;
        this.portNum = port;
        console.log(`[BGM] Switching port to ${port}...`);
        if (this.ws) {
            this.ws.onclose = null; // Prevent old onclose retry
            this.ws.close();
        }
        this.connect();
    }

    private connect() {
        console.log(`[BGM] Connecting to WebSocket controller (localhost:${this.portNum})...`);
        this.ws = new WebSocket(`ws://localhost:${this.portNum}/ws`);

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                console.log('[BGM] Received:', msg);
                this.onMessageCallbacks.forEach(cb => cb(msg));
            } catch (e) {
                console.error('[BGM] Message parse error:', e);
            }
        };

        this.ws.onclose = () => {
            console.warn('[BGM] WebSocket disconnected, retrying in 5s...');
            setTimeout(() => this.connect(), 5000);
        };

        this.ws.onerror = (err) => {
            console.error('[BGM] WebSocket error:', err);
        };
    }

    public isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    public sendMessage(msg: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        } else {
            console.error('[BGM] Cannot send, WebSocket not open');
        }
    }

    public onMessage(cb: (msg: any) => void) {
        this.onMessageCallbacks.push(cb);
    }

    public async inject(tabId: number, script: string) {
        return new Promise<any>((resolve, reject) => {
            const debuggee = { tabId };
            chrome.debugger.attach(debuggee, '1.3', () => {
                const err = chrome.runtime.lastError;
                if (err) {
                    if (err.message?.includes('already attached')) {
                        // Continue
                    } else {
                        return reject(err);
                    }
                }

                chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
                    expression: script,
                    userGesture: true,
                    awaitPromise: true,
                    returnByValue: true
                }, (result: any) => {
                    const sendErr = chrome.runtime.lastError;
                    chrome.debugger.detach(debuggee, () => {
                        if (sendErr) reject(sendErr);
                        else if (result?.exceptionDetails) reject(new Error(result.exceptionDetails.text));
                        else resolve(result?.result?.value);
                    });
                });
            });
        });
    }

    public onEvent(cb: (method: string, params: any) => void) {
        chrome.debugger.onEvent.addListener((_source, method, params) => {
            cb(method, params);
        });
    }
}
