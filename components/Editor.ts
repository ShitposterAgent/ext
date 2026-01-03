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
        <h2 class="view-title">Protocol Orchestrator</h2>
        <p class="view-subtitle">Inject reactive agents into active browser contexts.</p>
      </div>
      <div class="editor-main">
        <div class="editor-toolbar">
          <div class="status-badge">TARGET: ACTIVE</div>
          <button class="tool-btn" id="btn-clear-code">CLEAR</button>
        </div>
        <div class="code-wrapper">
          <div class="line-numbers" id="line-nums"></div>
          <textarea id="bgm-code-input" spellcheck="false" placeholder="// Initializing bridge..."></textarea>
        </div>
        <div class="action-bar">
          <button id="btn-execute" class="btn-glow">EXECUTE PROTOCOL</button>
        </div>
      </div>
    `;

        const textarea = this.container.querySelector('textarea') as HTMLTextAreaElement;
        textarea.addEventListener('input', () => this.updateLineNumbers());
        this.updateLineNumbers();
        this.addStyles();
    }

    private updateLineNumbers() {
        const textarea = this.container.querySelector('textarea') as HTMLTextAreaElement;
        const lineNums = this.container.querySelector('#line-nums') as HTMLElement;
        const lines = textarea.value.split('\n').length;
        lineNums.innerHTML = Array.from({ length: lines }, (_, i) => `<div>${i + 1}</div>`).join('');
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
      }
      .view-header {
      }
      .view-title {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 8px;
        background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .view-subtitle {
        color: var(--text-muted);
        font-size: 14px;
      }
      .editor-main {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        flex: 1;
      }
      .editor-toolbar {
        padding: 12px 20px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .status-badge {
        font-size: 10px;
        font-weight: 800;
        color: var(--accent);
        border: 1px solid var(--accent);
        padding: 2px 8px;
        border-radius: 4px;
      }
      .tool-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
      }
      .code-wrapper {
        display: flex;
        flex: 1;
        background: #0d0d0f;
      }
      .line-numbers {
        padding: 20px 12px;
        color: #3f3f46;
        font-family: var(--font-mono);
        font-size: 12px;
        text-align: right;
        user-select: none;
        background: #09090b;
        border-right: 1px solid var(--border);
      }
      #bgm-code-input {
        width: 100%;
        background: transparent;
        border: none;
        color: #818cf8;
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 20px;
        resize: none;
        outline: none;
        line-height: 1.6;
      }
      .action-bar {
        padding: 20px;
        display: flex;
        justify-content: flex-end;
      }
      .btn-glow {
        background: var(--accent);
        color: white;
        border: none;
        padding: 12px 32px;
        border-radius: var(--radius-md);
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px var(--accent-glow);
      }
      .btn-glow:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px var(--accent-glow);
      }
      
      @media (max-aspect-ratio: 1/1) {
        .protocol-editor { padding: 16px; padding-bottom: 80px; }
        .view-title { font-size: 18px; }
        .view-subtitle { font-size: 12px; }
        #bgm-code-input { font-size: 12px; padding: 12px; }
      }
    `;
        document.head.appendChild(style);
    }
}
