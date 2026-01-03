export class APIView {
    private container: HTMLElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'view-animate api-view';
        this.render();
    }

    public getElement() {
        return this.container;
    }

    private render() {
        this.container.innerHTML = `
      <div class="view-header">
        <h2 class="view-title">Neural Link Status</h2>
        <p class="view-subtitle">Monitor and configure the bridge to the Rust Brain.</p>
      </div>

      <div class="grid-layout">
        <div class="status-box">
          <div class="label">CONNECTION STATUS</div>
          <div class="status-value disconnected" id="connection-display">OFFLINE</div>
          <div class="pulse-ring"></div>
        </div>

        <div class="config-box">
          <div class="label">CONFIG PORT</div>
          <div class="port-input-wrapper">
            <input type="number" id="port-setting" value="58421" spellcheck="false">
            <button id="btn-save-port">SYNC</button>
          </div>
        </div>
      </div>

      <div class="terminal-box">
        <div class="terminal-header">
          <div class="dots"><span></span><span></span><span></span></div>
          <div class="term-title">REMOTE COMMANDS QUEUE</div>
        </div>
        <div class="terminal-body" id="command-stream">
          <div class="log-line empty">Waiting for instructions...</div>
        </div>
      </div>
    `;

        this.addStyles();
    }

    private addStyles() {
        const style = document.createElement('style');
        style.textContent = `
      .api-view {
        flex: 1;
        padding: 40px;
        display: flex;
        flex-direction: column;
        gap: 32px;
      }
      .grid-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .status-box, .config-box {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 24px;
        position: relative;
        overflow: hidden;
      }
      .label {
        font-size: 10px;
        font-weight: 800;
        color: var(--text-muted);
        letter-spacing: 1px;
        margin-bottom: 12px;
      }
      .status-value {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -1px;
      }
      .status-value.connected { color: #10b981; }
      .status-value.disconnected { color: #ef4444; }
      
      .port-input-wrapper {
        display: flex;
        gap: 12px;
      }
      #port-setting {
        background: #09090b;
        border: 1px solid var(--border);
        color: white;
        padding: 8px 12px;
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        width: 100px;
        outline: none;
      }
      #btn-save-port {
        background: var(--accent);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: var(--radius-sm);
        font-weight: 700;
        font-size: 11px;
        cursor: pointer;
      }

      .terminal-box {
        background: #000;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 200px;
      }
      .terminal-header {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .dots { display: flex; gap: 6px; }
      .dots span { width: 8px; height: 8px; border-radius: 50%; }
      .dots span:nth-child(1) { background: #ff5f56; }
      .dots span:nth-child(2) { background: #ffbd2e; }
      .dots span:nth-child(3) { background: #27c93f; }
      .term-title { font-size: 10px; font-weight: 800; color: #3f3f46; letter-spacing: 1px; }
      .terminal-body {
        padding: 16px;
        font-family: var(--font-mono);
        font-size: 11px;
        overflow-y: auto;
      }
      .log-line { margin-bottom: 8px; animation: fadeIn 0.3s ease; }
      .log-time { color: #52525b; margin-right: 12px; }
      .log-cmd { color: #fbbf24; font-weight: 700; }
      
      @media (max-aspect-ratio: 1/1) {
        .api-view { padding: 16px; padding-bottom: 80px; }
        .grid-layout { grid-template-columns: 1fr; }
        .status-value { font-size: 20px; }
      }
    `;
        document.head.appendChild(style);
    }
}
