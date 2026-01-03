// Premium BGM Logic
const scripts = [
    { name: 'Pure Dark', desc: 'Deep invert filter', code: 'document.body.style.filter = "invert(1) hue-rotate(180deg)";' },
    { name: 'Nuke UI', desc: 'Remove ads & sidebars', code: 'document.querySelectorAll("aside, nav, .ads, [class*=\'sidebar\']").forEach(el => el.remove());' },
    { name: 'Freeze Page', desc: 'Stop all scripts', code: 'window.stop();' },
    { name: 'X-Ray Mode', desc: 'Highlight all elements', code: 'document.querySelectorAll("*").forEach(el => el.style.outline = "1px solid red");' },
];

console.log("[BGM] Script loaded");

// 1. Immediate UI Setup
function setupUI() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const views = document.querySelectorAll('.tab-view');
    const popoutBtn = document.getElementById('popout-btn');
    const popoutBtnAlt = document.getElementById('open-popout-btn-alt');
    const settingsBtn = document.getElementById('open-settings-btn');

    console.log(`[BGM] Found ${navItems.length} nav items and ${views.length} views`);

    const doSwitch = (tabId: string) => {
        console.log(`[BGM] Tab Transition -> ${tabId}`);
        navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-tab') === tabId));
        views.forEach(view => view.classList.toggle('active', view.id === `tab-${tabId}`));
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            if (tab) doSwitch(tab);
        });
    });

    const openInTab = () => {
        try {
            const url = chrome.runtime.getURL('popup.html');
            chrome.tabs.create({ url });
        } catch (e) {
            window.open(window.location.href, '_blank');
        }
    };

    popoutBtn?.addEventListener('click', openInTab);
    popoutBtnAlt?.addEventListener('click', openInTab);
    settingsBtn?.addEventListener('click', () => chrome.runtime.openOptionsPage());

    // Fallback sync
    const active = document.querySelector('.nav-item.active')?.getAttribute('data-tab');
    if (active) doSwitch(active);
}

// 2. Heavy Logic
async function loadState() {
    const input = document.getElementById('script-input') as HTMLTextAreaElement;
    const library = document.getElementById('script-library');
    const injectBtn = document.getElementById('inject-btn');
    const clearBtn = document.getElementById('clear-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('script-upload') as HTMLInputElement;

    try {
        const data = await chrome.storage.local.get(['bgm_editor']);
        if (data.bgm_editor && input) input.value = data.bgm_editor;

        input?.addEventListener('input', () => {
            chrome.storage.local.set({ bgm_editor: input.value });
        });

        injectBtn?.addEventListener('click', async () => {
            const code = input?.value;
            if (!code) return;
            injectBtn.textContent = '...';
            chrome.runtime.sendMessage({ type: 'inject-request', tabId: 'active', script: code }, (res) => {
                injectBtn.textContent = (res && res.success) ? 'Success!' : 'Error';
                setTimeout(() => injectBtn.textContent = 'Execute Protocol', 1000);
            });
        });

        clearBtn?.addEventListener('click', () => {
            if (input) input.value = '';
            chrome.storage.local.set({ bgm_editor: '' });
        });

        uploadBtn?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const content = ev.target?.result as string;
                if (content && input) {
                    input.value = content;
                    chrome.storage.local.set({ bgm_editor: content });
                }
            };
            reader.readAsText(file);
        });

        // Load Library Cards
        if (library) {
            library.innerHTML = '';
            scripts.forEach(s => {
                const c = document.createElement('div');
                c.className = 'script-card';
                c.innerHTML = `<span class="script-name">${s.name}</span><span class="script-desc">${s.desc}</span>`;
                c.onclick = () => {
                    if (input) {
                        input.value = s.code;
                        chrome.storage.local.set({ bgm_editor: s.code });
                    }
                };
                library.appendChild(c);
            });
        }
    } catch (e) {
        console.warn("[BGM] Background sync issues:", e);
    }
}

// 3. API Tab Logic
function setupAPITab() {
    const statusText = document.getElementById('api-status-text');
    const portInput = document.getElementById('api-port-input') as HTMLInputElement;
    const reconnectBtn = document.getElementById('api-reconnect-btn');
    const commandLog = document.getElementById('api-command-log');

    const updateStatus = async () => {
        chrome.storage.local.get(['bgm_api_connected', 'bgm_api_port', 'bgm_last_commands'], (res) => {
            if (statusText) {
                statusText.innerText = res.bgm_api_connected ? 'CONNECTED' : 'DISCONNECTED';
                statusText.style.color = res.bgm_api_connected ? '#4caf50' : '#ff4d4d';
            }
            if (portInput && res.bgm_api_port) {
                portInput.value = res.bgm_api_port;
            }
            if (commandLog && res.bgm_last_commands) {
                commandLog.innerHTML = res.bgm_last_commands.map((c: any) =>
                    `<div style="margin-bottom: 5px;"><span style="color: #666;">[${new Date(c.time).toLocaleTimeString()}]</span> ${c.type}</div>`
                ).join('') || '<div style="color: #666;">Waiting for commands...</div>';
            }
        });
    };

    reconnectBtn?.addEventListener('click', () => {
        const port = portInput?.value;
        if (port) {
            chrome.storage.local.set({ bgm_api_port: port }, () => {
                // Signal background to reconnect
                chrome.runtime.sendMessage({ type: 'api-reconnect-trigger' });
            });
        }
    });

    setInterval(updateStatus, 1000);
    updateStatus();
}

// Global Init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupUI();
        loadState();
        setupAPITab();
    });
} else {
    setupUI();
    loadState();
    setupAPITab();
}
