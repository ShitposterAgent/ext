export class Editor {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'view-animate protocol-editor';
    this.render();
  }

  public getElement() {
    return this.container;
  }

  private render() {
    this.container.innerHTML = `
      <div class="view-header">
        <h2 class="view-title">Reactive Script Engine</h2>
        <p class="view-subtitle">Live-streaming logic from your local disk.</p>
      </div>

      <div class="monitor-grid">
        <div class="active-scripts-panel">
          <div class="panel-header">SYNCED SCRIPTS</div>
          <div id="synced-scripts-list" class="script-stack">
            <div class="empty-state">No scripts synced from Brain.</div>
          </div>
        </div>

        <div class="live-monitor">
          <div class="panel-header">REAL-TIME CONSOLE</div>
          <div id="internal-log" class="console-body">
            <div class="log-entry">System ready for deployment.</div>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .protocol-editor {
        flex: 1;
        padding: 40px;
        display: flex;
        flex-direction: column;
        gap: 32px;
        height: 100vh;
        overflow-y: auto;
      }
      .monitor-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        flex: 1;
      }
      .panel-header {
        font-size: 10px;
        font-weight: 900;
        color: var(--text-muted);
        letter-spacing: 1.5px;
        margin-bottom: 16px;
      }
      .script-stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .script-item {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        animation: fadeIn 0.3s ease;
      }
      .script-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .script-name {
        font-weight: 700;
        font-size: 14px;
        color: var(--accent);
      }
      .script-meta {
        font-size: 10px;
        font-family: var(--font-mono);
        color: var(--text-muted);
      }
      .script-tag {
        background: rgba(99, 102, 241, 0.1);
        color: var(--accent);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 800;
      }
      .console-body {
        background: #000;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        flex: 1;
        padding: 20px;
        font-family: var(--font-mono);
        font-size: 11px;
        min-height: 400px;
      }
      .log-entry { margin-bottom: 6px; color: #52525b; }
      .empty-state {
        padding: 40px;
        text-align: center;
        border: 1px dashed var(--border);
        border-radius: var(--radius-lg);
        color: var(--text-muted);
        font-size: 12px;
      }

      @media (max-aspect-ratio: 1/1) {
        .protocol-editor { padding: 16px 16px 80px; }
        .monitor-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }
}
