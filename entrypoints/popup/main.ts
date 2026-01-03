// Premium BGM Logic

const scripts = [
    { name: 'Pure Dark', desc: 'Deep invert filter', code: 'document.body.style.filter = "invert(1) hue-rotate(180deg)";' },
    { name: 'Nuke UI', desc: 'Remove ads & sidebars', code: 'document.querySelectorAll("aside, nav, .ads, [class*=\'sidebar\']").forEach(el => el.remove());' },
    { name: 'Freeze Page', desc: 'Stop all scripts', code: 'window.stop();' },
    { name: 'X-Ray Mode', desc: 'Highlight all elements', code: 'document.querySelectorAll("*").forEach(el => el.style.outline = "1px solid red");' },
];

async function init() {
    const input = document.getElementById('script-input') as HTMLTextAreaElement;
    const injectBtn = document.getElementById('inject-btn');
    const clearBtn = document.getElementById('clear-btn');
    const popoutBtn = document.getElementById('popout-btn');
    const library = document.getElementById('script-library');
    const tabsList = document.getElementById('tabs-preview');
    const tabSelect = document.getElementById('tab-select') as HTMLSelectElement;

    console.log("[BGM] Popup initialized. Popout button found:", !!popoutBtn);

    // Persistence: Load State
    const state = await chrome.storage.local.get(['bgm_editor', 'bgm_tab_mode']);
    if (state.bgm_editor) input.value = state.bgm_editor;
    if (state.bgm_tab_mode) tabSelect.value = state.bgm_tab_mode;

    // Persistence: Save State on change
    input.addEventListener('input', () => {
        chrome.storage.local.set({ bgm_editor: input.value });
    });

    tabSelect.addEventListener('change', () => {
        chrome.storage.local.set({ bgm_tab_mode: tabSelect.value });
    });

    // Load Library
    scripts.forEach(script => {
        const card = document.createElement('div');
        card.className = 'script-card';
        card.innerHTML = `
      <span class="script-name">${script.name}</span>
      <span class="script-desc">${script.desc}</span>
    `;
        card.onclick = () => {
            input.value = script.code;
            chrome.storage.local.set({ bgm_editor: input.value });
        };
        library?.appendChild(card);
    });

    // Fetch and display tabs
    const refreshTabs = async () => {
        const tabs = await chrome.tabs.query({});
        if (tabsList) {
            tabsList.innerHTML = '';
            tabs.forEach(tab => {
                const item = document.createElement('div');
                item.className = 'tab-item';
                item.innerHTML = `
          <span>${tab.title || 'Untitled'}</span>
          <span class="tab-url">${tab.url ? new URL(tab.url).hostname : ''}</span>
        `;
                item.onclick = () => {
                    tabSelect.innerHTML = `<option value="${tab.id}">${tab.title}</option>` + tabSelect.innerHTML;
                    tabSelect.value = String(tab.id);
                    chrome.storage.local.set({ bgm_tab_mode: tabSelect.value });
                };
                tabsList.appendChild(item);
            });
        }
    };

    refreshTabs();

    // Popout Functionality
    chrome.windows.getCurrent((w) => {
        if (w.type === 'popup' && popoutBtn) {
            popoutBtn.style.display = 'none';
        }
    });

    popoutBtn?.addEventListener('click', () => {
        const url = window.location.href;
        chrome.windows.create({
            url: url,
            type: 'popup',
            width: 440,
            height: 620
        }, (win) => {
            if (chrome.runtime.lastError || !win) {
                console.error("Popout failed, falling back to tab:", chrome.runtime.lastError);
                chrome.tabs.create({ url: url });
            }
        });
    });

    injectBtn?.addEventListener('click', async () => {
        const code = input.value;
        if (!code) return;

        let targetId: number | 'all' = 'all';
        const val = tabSelect.value;

        if (val === 'active') {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            targetId = tab?.id || 'all';
        } else if (val !== 'all') {
            targetId = parseInt(val);
        }

        if (injectBtn) {
            injectBtn.textContent = 'Executing...';
            injectBtn.style.opacity = '0.7';
        }

        chrome.runtime.sendMessage({
            type: 'inject-request',
            tabId: targetId,
            script: code
        }, (response) => {
            if (injectBtn) {
                injectBtn.style.opacity = '1';
                if (response?.success) {
                    injectBtn.textContent = 'Success!';
                    setTimeout(() => injectBtn.textContent = 'Execute Protocol', 2000);
                } else {
                    injectBtn.textContent = 'Error';
                    setTimeout(() => injectBtn.textContent = 'Execute Protocol', 2000);
                }
            }
        });
    });

    // Tab Switching Logic
    const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
    const tabViews = document.querySelectorAll('.tab-view');

    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-tab');
            bottomNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            tabViews.forEach(v => {
                v.classList.toggle('active', v.id === `tab-${target}`);
            });
        });
    });

    // Portal Actions
    const openSettingsBtn = document.getElementById('open-settings-btn');
    const openPopoutBtnAlt = document.getElementById('open-popout-btn-alt');

    openSettingsBtn?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    openPopoutBtnAlt?.addEventListener('click', () => {
        popoutBtn?.click();
    });

    clearBtn?.addEventListener('click', () => {
        input.value = '';
        chrome.storage.local.set({ bgm_editor: '' });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
