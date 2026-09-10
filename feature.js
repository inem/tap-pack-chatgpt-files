(() => {
  'use strict';

  const stateKey = '__tapChatgptFiles';
  window[stateKey]?.dispose?.();

  let stopped = false;
  let timer = 0;
  const icons = Object.freeze({
    reveal: '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M3.75 6.75A2.75 2.75 0 0 1 6.5 4h3.1l2 2.25h5.9a2.75 2.75 0 0 1 2.75 2.75v1.25"/><path d="M4.5 10.25h15.7a1.3 1.3 0 0 1 1.23 1.72l-2.2 6.4A2.4 2.4 0 0 1 16.96 20H6.15a2.4 2.4 0 0 1-2.38-2.07L2.8 12.65a2.05 2.05 0 0 1 1.7-2.4Z"/></svg>',
    copy: '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  });

  function conversationId() {
    const match = location.pathname.match(/^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i);
    return match?.[1] || null;
  }

  function notify(message) {
    if (window.ChatGPTUI?.showDisclaimerNote?.(message, {duration: 3500})) return;
    window.ChatGPTUI?.showToast?.(message, {id: 'tap-chatgpt-files-status', duration: 3500});
  }

  async function run(action) {
    const conversation_id = conversationId();
    if (!conversation_id) {
      notify('Open a conversation first');
      return;
    }
    try {
      const result = await window.TapBridge.request('chatgpt.files', {action, conversation_id});
      notify(result?.message || (action === 'copy_path' ? 'Path copied' : 'Opened in Finder'));
    } catch (error) {
      const code = error?.code || 'unavailable';
      notify(code === 'not_connected' ? 'Local TAP is not connected' : 'Local file action failed');
    }
  }

  function mount() {
    if (stopped || !window.ChatGPTUI || !window.TapBridge) return;
    window.ChatGPTUI.addTopHeaderButton({
      id: 'tap-chatgpt-files-reveal',
      icon: icons.reveal,
      label: 'md',
      title: "Reveal this chat's Markdown in Finder",
      onClick: () => run('reveal'),
    });
    window.ChatGPTUI.addTopHeaderButton({
      id: 'tap-chatgpt-files-copy-path',
      icon: icons.copy,
      label: 'path',
      title: "Copy this chat's local Markdown path",
      onClick: () => run('copy_path'),
    });
  }

  const observer = new MutationObserver(mount);
  function start() {
    observer.observe(document.documentElement, {childList: true, subtree: true});
    mount();
    timer = window.setInterval(mount, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();

  window[stateKey] = Object.freeze({
    dispose() {
      stopped = true;
      observer.disconnect();
      window.clearInterval(timer);
      document.querySelectorAll('[data-cgq-id^="tap-chatgpt-files-"]').forEach(element => element.remove());
    },
  });
})();
