import './style.css';

const scripts = [
    { name: 'Dark Mode Force', code: 'document.body.style.filter = "invert(1) hue-rotate(180deg)";' },
    { name: 'Remove Distractions', code: 'document.querySelectorAll("aside, nav, .ads").forEach(el => el.remove());' },
    { name: 'Spin Everything', code: 'document.body.style.transition = "transform 2s"; document.body.style.transform = "rotate(360deg)";' },
    { name: 'Edit Everything', code: 'document.body.contentEditable = "true";' },
];

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('script-input') as HTMLTextAreaElement;
    const injectBtn = document.getElementById('inject-btn');
    const clearBtn = document.getElementById('clear-btn');
    const library = document.getElementById('script-library');

    // Load library
    scripts.forEach(script => {
        const item = document.createElement('div');
        item.className = 'script-item';
        item.innerHTML = `
      <span class="script-name">${script.name}</span>
      <span class="script-tag">JS</span>
    `;
        item.onclick = () => {
            input.value = script.code;
        };
        library?.appendChild(item);
    });

    injectBtn?.addEventListener('click', async () => {
        const code = input.value;
        if (!code) return;

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        // Send to background to execute via debugger
        chrome.runtime.sendMessage({
            type: 'inject-request',
            tabId: tab.id,
            script: code
        }, (response) => {
            if (response?.success) {
                injectBtn.textContent = 'Injected!';
                setTimeout(() => injectBtn.textContent = 'Inject Script', 2000);
            } else {
                injectBtn.textContent = 'Failed';
                setTimeout(() => injectBtn.textContent = 'Inject Script', 2000);
            }
        });
    });

    clearBtn?.addEventListener('click', () => {
        input.value = '';
    });
});
