export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
        window.addEventListener('message', (event) => {
            // Only accept messages from our SDK
            if (event.data && event.data.source === 'bgm-sdk') {
                chrome.runtime.sendMessage({
                    type: 'sdk-relay',
                    data: event.data
                });
            }
        });
    },
});
