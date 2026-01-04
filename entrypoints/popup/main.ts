import { Sidebar } from '../../components/Sidebar';
import { Editor } from '../../components/Editor';
import { APIView } from '../../components/APIView';

class BGMApp {
    private appRoot: HTMLElement;
    private sidebar: Sidebar;
    private currentView: HTMLElement | null = null;

    constructor() {
        this.appRoot = document.getElementById('app')!;
        this.sidebar = new Sidebar((tab) => this.switchView(tab));
        this.init();
    }

    private init() {
        this.appRoot.appendChild(this.sidebar.getElement());
        const mainArea = document.createElement('main');
        mainArea.className = 'main-layout';
        mainArea.id = 'main-content-area';
        this.appRoot.appendChild(mainArea);

        // Default view
        this.switchView('protocol');
        this.watchState();
    }

    private switchView(tabId: string) {
        const mainArea = document.getElementById('main-content-area')!;
        mainArea.innerHTML = '';

        switch (tabId) {
            case 'protocol':
                this.currentView = new Editor().getElement();
                this.bindEditorEvents(this.currentView);
                break;
            case 'api':
                this.currentView = new APIView().getElement();
                this.bindAPIEvents(this.currentView);
                break;
            case 'vault':
                this.currentView = this.renderPlaceholder('Vault', 'Access stored God-Mode scripts.');
                break;
        }

        if (this.currentView) mainArea.appendChild(this.currentView);
    }

    private bindEditorEvents(view: HTMLElement) {
        const input = view.querySelector('#bgm-code-input') as HTMLTextAreaElement;
        const executeBtn = view.querySelector('#btn-execute') as HTMLButtonElement;
        const clearBtn = view.querySelector('#btn-clear-code') as HTMLButtonElement;

        chrome.storage.local.get(['bgm_editor'], (res) => {
            if (res.bgm_editor) input.value = res.bgm_editor;
        });

        input.addEventListener('input', () => {
            chrome.storage.local.set({ bgm_editor: input.value });
        });

        executeBtn.addEventListener('click', () => {
            const code = input.value;
            if (!code) return;
            executeBtn.innerText = 'EXECUTING...';
            chrome.runtime.sendMessage({ type: 'inject-request', tabId: 'active', script: code }, (res) => {
                executeBtn.innerText = (res && res.success) ? 'PROTOCOL SUCCESS' : 'FAILURE';
                setTimeout(() => executeBtn.innerText = 'EXECUTE PROTOCOL', 2000);
            });
        });

        clearBtn.addEventListener('click', () => {
            input.value = '';
            chrome.storage.local.set({ bgm_editor: '' });
        });
    }

    private bindAPIEvents(view: HTMLElement) {
        const portInput = view.querySelector('#port-setting') as HTMLInputElement;
        const saveBtn = view.querySelector('#btn-save-port') as HTMLButtonElement;

        saveBtn.addEventListener('click', () => {
            const port = portInput.value;
            if (port) {
                chrome.storage.local.set({ bgm_api_port: port }, () => {
                    chrome.runtime.sendMessage({ type: 'api-reconnect-trigger' });
                    saveBtn.innerText = 'SYNCED';
                    setTimeout(() => saveBtn.innerText = 'SYNC', 2000);
                });
            }
        });

        // We'll update stats via the watcher
    }

    private watchState() {
        const update = () => {
            chrome.storage.local.get(['bgm_api_connected', 'bgm_api_port', 'bgm_last_commands', 'bgm_synced_scripts'], (res) => {
                // Render Synced Scripts
                const scriptList = document.getElementById('synced-scripts-list');
                if (scriptList && res.bgm_synced_scripts) {
                    const scripts = Object.values(res.bgm_synced_scripts) as any[];
                    if (scripts.length > 0) {
                        scriptList.innerHTML = scripts.map(s => `
                            <div class="script-item view-animate">
                                <div class="script-item-header">
                                    <span class="script-name">${s.metadata.name || s.id}</span>
                                    <span class="script-tag">LIVE</span>
                                </div>
                                <div class="script-meta">${s.path}</div>
                                ${s.metadata.match ? `<div class="script-meta" style="color:var(--accent)">MATCH: ${s.metadata.match}</div>` : ''}
                            </div>
                        `).join('');
                    } else {
                        scriptList.innerHTML = '<div class="empty-state">No scripts synced from Brain.</div>';
                    }
                }

                // Global sidebar status
                const globalStatus = document.getElementById('global-status');
                if (globalStatus) {
                    globalStatus.innerText = res.bgm_api_connected ? 'SYNCING' : 'OFFLINE';
                    const dot = globalStatus.previousElementSibling as HTMLElement;
                    if (dot) dot.style.background = res.bgm_api_connected ? '#10b981' : '#ef4444';
                }

                // Specific API View status
                const connDisplay = document.getElementById('connection-display');
                if (connDisplay) {
                    connDisplay.innerText = res.bgm_api_connected ? 'CONNECTED' : 'DISCONNECTED';
                    connDisplay.className = `status-value ${res.bgm_api_connected ? 'connected' : 'disconnected'}`;
                }

                const stream = document.getElementById('command-stream');
                if (stream && res.bgm_last_commands) {
                    stream.innerHTML = res.bgm_last_commands.map((c: any) => `
                <div class="log-line">
                    <span class="log-time">[${new Date(c.time).toLocaleTimeString()}]</span>
                    <span class="log-cmd">${c.type.toUpperCase()}</span>
                    <span class="log-details">${JSON.stringify(c.tab_id || 'active')}</span>
                </div>
            `).join('');
                }
            });
        };

        setInterval(update, 1000);
        update();
    }

    private renderPlaceholder(title: string, desc: string) {
        const div = document.createElement('div');
        div.className = 'view-animate placeholder-view';
        div.style.padding = '40px';
        div.innerHTML = `
      <h2 class="view-title">${title}</h2>
      <p class="view-subtitle">${desc}</p>
      <div style="margin-top: 40px; padding: 40px; border: 1px dashed var(--border); border-radius: var(--radius-lg); text-align: center; color: var(--text-muted);">
        Encryption protocols pending for this module.
      </div>
    `;
        return div;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BGMApp();
});
