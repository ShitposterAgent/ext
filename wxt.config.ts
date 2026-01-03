import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest: {
        permissions: ['debugger', 'nativeMessaging', 'tabs'],
        name: 'BGM Bridge',
        description: 'Browser God-Mode Bridge for Chrome',
        version: '0.1.0',
    },
});
