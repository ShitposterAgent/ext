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
    const auditSearch = document.getElementById('log-search') as HTMLInputElement;
    const auditTypeFilter = document.getElementById('log-filter-type') as HTMLSelectElement;
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    const importBtn = document.getElementById('import-script-btn');
    const importInput = document.getElementById('script-import-input') as HTMLInputElement;

    let allLogs: any[] = [];
    let userScripts: UserScript[] = [];
    let editingId: string | null = null;

    // Import Logic
    importBtn?.addEventListener('click', () => importInput.click());
    importInput?.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            if (content) {
                const newScript: UserScript = {
                    id: Date.now().toString(),
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    pattern: ".*",
                    code: content,
                    enabled: true
                };
                userScripts.push(newScript);
                await syncScripts();
                renderScripts();
            }
        };
        reader.readAsText(file);
    });

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

    // Settings Logic
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const densityBtns = document.querySelectorAll('.density-btn');

    const loadSettings = async () => {
        const settings = await chrome.storage.local.get([
            'setting_default_tab_mode',
            'setting_injection_toast',
            'setting_editor_theme',
            'setting_interface_density',
            'setting_controller_url',
            'setting_sync_freq',
            'setting_log_retention',
            'setting_dev_mode',
            'setting_bypass_csp'
        ]);

        (document.getElementById('setting-default-tab-mode') as HTMLSelectElement).value = settings.setting_default_tab_mode || 'active';
        (document.getElementById('setting-injection-toast') as HTMLInputElement).checked = settings.setting_injection_toast !== false;
        (document.getElementById('setting-editor-theme') as HTMLSelectElement).value = settings.setting_editor_theme || 'dracula';
        (document.getElementById('setting-controller-url') as HTMLInputElement).value = settings.setting_controller_url || 'http://localhost:3000';
        (document.getElementById('setting-sync-freq') as HTMLInputElement).value = settings.setting_sync_freq || '1000';
        (document.getElementById('setting-log-retention') as HTMLSelectElement).value = settings.setting_log_retention || '500';
        (document.getElementById('setting-dev-mode') as HTMLInputElement).checked = !!settings.setting_dev_mode;
        (document.getElementById('setting-bypass-csp') as HTMLInputElement).checked = !!settings.setting_bypass_csp;

        const density = settings.setting_interface_density || 'normal';
        densityBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-density') === density));
        document.body.classList.toggle('compact-mode', density === 'compact');
    };

    densityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            densityBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const density = btn.getAttribute('data-density');
            document.body.classList.toggle('compact-mode', density === 'compact');
        });
    });

    saveSettingsBtn?.addEventListener('click', async () => {
        const settings = {
            setting_default_tab_mode: (document.getElementById('setting-default-tab-mode') as HTMLSelectElement).value,
            setting_injection_toast: (document.getElementById('setting-injection-toast') as HTMLInputElement).checked,
            setting_editor_theme: (document.getElementById('setting-editor-theme') as HTMLSelectElement).value,
            setting_interface_density: document.querySelector('.density-btn.active')?.getAttribute('data-density'),
            setting_controller_url: (document.getElementById('setting-controller-url') as HTMLInputElement).value,
            setting_sync_freq: (document.getElementById('setting-sync-freq') as HTMLInputElement).value,
            setting_log_retention: (document.getElementById('setting-log-retention') as HTMLSelectElement).value,
            setting_dev_mode: (document.getElementById('setting-dev-mode') as HTMLInputElement).checked,
            setting_bypass_csp: (document.getElementById('setting-bypass-csp') as HTMLInputElement).checked
        };

        await chrome.storage.local.set(settings);
        saveSettingsBtn.textContent = 'Changes Applied!';
        setTimeout(() => saveSettingsBtn.textContent = 'Apply Global Changes', 2000);
    });

    document.getElementById('export-all-btn')?.addEventListener('click', async () => {
        const data = await chrome.storage.local.get(null);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bgm-infrastructure-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });

    document.getElementById('factory-reset-btn')?.addEventListener('click', async () => {
        if (confirm('🚨 PROTOCOL EMERGENCY: This will wipe all scripts, logs, and settings. Are you absolutely sure?')) {
            await chrome.storage.local.clear();
            window.location.reload();
        }
    });

    const loadScripts = async () => {
        const data = await chrome.storage.local.get(['user_scripts', 'audit_logs']);
        userScripts = data.user_scripts || [];
        allLogs = data.audit_logs || [];
        renderScripts();
        applyLogFiltering();
        await loadSettings();

        const tabsData = await chrome.tabs.query({});
        document.getElementById('stat-tabs')!.textContent = String(tabsData.length);
        document.getElementById('stat-rules')!.textContent = String(userScripts.filter(s => s.enabled).length);
        document.getElementById('stat-injections')!.textContent = String(allLogs.filter((l: any) => l.type === 'injection').length);
    };

    const applyLogFiltering = () => {
        const query = auditSearch.value.toLowerCase();
        const type = auditTypeFilter.value;
        const filtered = allLogs.filter(log => {
            const matchesType = type === 'all' || (type === 'injection' && log.success) || (type === 'error' && !log.success);
            const matchesQuery = !query || (log.source?.toLowerCase().includes(query)) || (log.script?.toLowerCase().includes(query));
            return matchesType && matchesQuery;
        });
        renderLogs(filtered);
    };

    auditSearch.addEventListener('input', applyLogFiltering);
    auditTypeFilter.addEventListener('change', applyLogFiltering);
    clearLogsBtn?.addEventListener('click', async () => {
        if (confirm('Delete all audit logs?')) {
            await chrome.storage.local.set({ audit_logs: [] });
            allLogs = [];
            applyLogFiltering();
        }
    });

    const renderLogs = (logs: any[]) => {
        const tbody = document.getElementById('audit-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="white-space: nowrap; color: var(--text-dim)">${new Date(log.time).toLocaleTimeString()}</td>
                <td><span style="font-weight: 600">${log.type}</span></td>
                <td><span class="script-card-pattern" style="font-size: 10px">${log.source || 'N/A'}</span></td>
                <td><span class="status-tag ${log.success ? 'success' : 'error'}">${log.success ? 'Success' : 'Failed'}</span></td>
                <td><div class="log-details">${log.error || log.result || log.script || ''}</div></td>
            `;
            tbody.appendChild(tr);
        });
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
                        <span class="slider"></span>
                    </label>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-secondary edit-script" data-id="${script.id}">Edit</button>
                    <button class="btn-secondary delete-script" style="color: #ff4d4d;" data-id="${script.id}">Delete</button>
                </div>
            `;
            scriptsList.appendChild(card);
        });

        scriptsList.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', async (e) => {
                const id = (e.target as HTMLInputElement).getAttribute('data-id');
                const enabled = (e.target as HTMLInputElement).checked;
                userScripts = userScripts.map(s => s.id === id ? { ...s, enabled } : s);
                await syncScripts();
            });
        });

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
        const rules = userScripts.map(s => ({ id: s.id, pattern: s.pattern, script: s.code, enabled: s.enabled }));
        await chrome.storage.local.set({ bgm_rules: rules });
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
