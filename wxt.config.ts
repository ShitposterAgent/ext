import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest: {
        permissions: ['debugger', 'tabs', 'storage'],
        host_permissions: ['http://localhost:58421/*', 'ws://localhost:58421/*'],
        name: 'BGM Bridge',
        description: 'Browser God-Mode Bridge for Chrome',
        version: '0.1.0',
    },
});
