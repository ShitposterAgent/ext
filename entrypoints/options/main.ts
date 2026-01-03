import './style.css';

interface UserScript {
    id: string;
    name: string;
    pattern: string;
    code: string;
    enabled: boolean;
}

document.addEventListener('DOMContentLoaded', async () => {
    const navItems = document.querySelectorAll('.nav-item');
    const tabs = document.querySelectorAll('.content-tab');
    const scriptsList = document.getElementById('scripts-list');
    const addBtn = document.getElementById('add-script-btn');
    const overlay = document.getElementById('script-editor-overlay');
    const saveBtn = document.getElementById('save-script-btn');
    const closeBtns = document.querySelectorAll('.close-overlay');

    let userScripts: UserScript[] = [];
    let editingId: string | null = null;

    // Tab Switching
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-tab');
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            tabs.forEach(t => {
                t.classList.toggle('active', t.id === `tab-${target}`);
            });
        });
    });

    const loadScripts = async () => {
        const data = await chrome.storage.local.get(['user_scripts', 'bgm_rules']);
        userScripts = data.user_scripts || [];
        renderScripts();

        // Update stats
        const tabsData = await chrome.tabs.query({});
        document.getElementById('stat-tabs')!.textContent = String(tabsData.length);
        document.getElementById('stat-rules')!.textContent = String(userScripts.filter(s => s.enabled).length);
    };

    const renderScripts = () => {
        if (!scriptsList) return;
        scriptsList.innerHTML = '';
        userScripts.forEach(script => {
            const card = document.createElement('div');
            card.className = 'script-card';
            card.innerHTML = `
                <div class="script-card-header">
                    <div>
                        <div class="script-card-title">${script.name}</div>
                        <div class="script-card-pattern">${script.pattern}</div>
                    </div>
                    <label class="switch">
                        <input type="checkbox" ${script.enabled ? 'checked' : ''} data-id="${script.id}">
                        <span class="slider round"></span>
                    </label>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-secondary edit-script" data-id="${script.id}">Edit</button>
                    <button class="btn-secondary delete-script" style="color: #ff4d4d" data-id="${script.id}">Delete</button>
                </div>
            `;
            scriptsList.appendChild(card);
        });

        // Add event listeners to toggle switches
        scriptsList.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', async (e) => {
                const id = (e.target as HTMLInputElement).getAttribute('data-id');
                const enabled = (e.target as HTMLInputElement).checked;
                userScripts = userScripts.map(s => s.id === id ? { ...s, enabled } : s);
                await syncScripts();
            });
        });

        // Edit/Delete handlers
        scriptsList.querySelectorAll('.edit-script').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const script = userScripts.find(s => s.id === id);
                if (script) openEditor(script);
            });
        });

        scriptsList.querySelectorAll('.delete-script').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                userScripts = userScripts.filter(s => s.id !== id);
                await syncScripts();
                renderScripts();
            });
        });
    };

    const syncScripts = async () => {
        await chrome.storage.local.set({ user_scripts: userScripts });
        // Also update the 'bgm_rules' used by the background script
        const rules = userScripts.map(s => ({
            id: s.id,
            pattern: s.pattern,
            script: s.code,
            enabled: s.enabled
        }));
        await chrome.storage.local.set({ bgm_rules: rules });

        // Notify controller via background
        chrome.runtime.sendMessage({ type: 'update-rules-broadcast' });
    };

    const openEditor = (script?: UserScript) => {
        const nameInput = document.getElementById('edit-name') as HTMLInputElement;
        const patternInput = document.getElementById('edit-pattern') as HTMLInputElement;
        const codeInput = document.getElementById('edit-code') as HTMLTextAreaElement;
        const modalTitle = document.getElementById('modal-title');

        if (script) {
            editingId = script.id;
            nameInput.value = script.name;
            patternInput.value = script.pattern;
            codeInput.value = script.code;
            modalTitle!.textContent = 'Edit User Script';
        } else {
            editingId = null;
            nameInput.value = '';
            patternInput.value = '';
            codeInput.value = '';
            modalTitle!.textContent = 'New User Script';
        }
        overlay!.style.display = 'flex';
    };

    addBtn?.addEventListener('click', () => openEditor());
    closeBtns.forEach(btn => btn.addEventListener('click', () => overlay!.style.display = 'none'));

    saveBtn?.addEventListener('click', async () => {
        const nameInput = document.getElementById('edit-name') as HTMLInputElement;
        const patternInput = document.getElementById('edit-pattern') as HTMLInputElement;
        const codeInput = document.getElementById('edit-code') as HTMLTextAreaElement;

        const scriptData: UserScript = {
            id: editingId || Date.now().toString(),
            name: nameInput.value || 'Untitled Script',
            pattern: patternInput.value || '.*',
            code: codeInput.value,
            enabled: true
        };

        if (editingId) {
            userScripts = userScripts.map(s => s.id === editingId ? scriptData : s);
        } else {
            userScripts.push(scriptData);
        }

        await syncScripts();
        renderScripts();
        overlay!.style.display = 'none';
    });

    loadScripts();
});
