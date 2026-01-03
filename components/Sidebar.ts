export class Sidebar {
    private container: HTMLElement;
    private activeTab: string = 'protocol';
    private onTabChange: (tabId: string) => void;

    constructor(onTabChange: (tabId: string) => void) {
        this.container = document.createElement('nav');
        this.container.className = 'bgm-sidebar';
        this.onTabChange = onTabChange;
        this.render();
    }

    public getElement() {
        return this.container;
    }

    private render() {
        this.container.innerHTML = `
      <div class="sidebar-header">
        <div class="logo-icon"></div>
        <span class="logo-text">BGM BRAIN</span>
      </div>
      <div class="sidebar-links">
        ${this.renderLink('protocol', 'Protocol', `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
        `)}
        ${this.renderLink('vault', 'Vault', `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        `)}
        ${this.renderLink('api', 'API', `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
          </svg>
        `)}
      </div>
      <div class="sidebar-footer">
        <div class="status-indicator">
          <div class="dot"></div>
          <span id="global-status">LINKED</span>
        </div>
      </div>
    `;

        this.container.querySelectorAll('.nav-item').forEach(el => {
            el.addEventListener('click', () => {
                const tab = el.getAttribute('data-tab')!;
                this.updateActive(tab);
            });
        });

        this.addStyles();
    }

    private renderLink(id: string, label: string, icon: string) {
        const active = this.activeTab === id ? 'active' : '';
        return `
      <div class="nav-item ${active}" data-tab="${id}">
        ${icon}
        <span class="nav-label">${label}</span>
      </div>
    `;
    }

    private updateActive(tabId: string) {
        this.activeTab = tabId;
        this.container.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-tab') === tabId);
        });
        this.onTabChange(tabId);
    }

    private addStyles() {
        const style = document.createElement('style');
        style.textContent = `
      .bgm-sidebar {
        width: 240px;
        background: #111114;
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        padding: 24px 0;
        transition: width 0.3s ease;
      }
      .sidebar-header {
        padding: 0 24px 32px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .logo-icon {
        width: 28px;
        height: 28px;
        background: var(--accent);
        border-radius: 8px;
        box-shadow: 0 0 20px var(--accent-glow);
      }
      .logo-text {
        font-weight: 700;
        letter-spacing: 1px;
        font-size: 14px;
      }
      .sidebar-links {
        flex: 1;
        padding: 0 12px;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: var(--radius-md);
        margin-bottom: 4px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .nav-item:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text);
      }
      .nav-item.active {
        background: rgba(99, 102, 241, 0.1);
        color: var(--accent);
      }
      .nav-label {
        font-size: 13px;
        font-weight: 600;
      }
      .sidebar-footer {
        padding: 24px;
        border-top: 1px solid var(--border);
      }
      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .status-indicator .dot {
        width: 6px;
        height: 6px;
        background: #10b981;
        border-radius: 50%;
        box-shadow: 0 0 8px #10b981;
      }

      @media (max-aspect-ratio: 1/1) {
        .bgm-sidebar {
          width: 100%;
          height: 64px;
          flex-direction: row;
          position: fixed;
          bottom: 0;
          left: 0;
          padding: 0 12px;
          border-right: none;
          border-top: 1px solid var(--border);
          justify-content: space-around;
          align-items: center;
          z-index: 100;
          background: rgba(17, 17, 20, 0.95);
          backdrop-filter: blur(10px);
        }
        .sidebar-header, .sidebar-footer { display: none; }
        .sidebar-links { display: flex; width: 100%; gap: 8px; padding: 0; }
        .nav-item { flex: 1; flex-direction: column; gap: 4px; padding: 8px; margin: 0; }
        .active { background: transparent !important; border-bottom: 2px solid var(--accent); border-radius: 0; }
        .nav-label { font-size: 10px; }
      }
    `;
        document.head.appendChild(style);
    }
}
