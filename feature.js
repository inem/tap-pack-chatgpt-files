(() => {
  'use strict';

  const stateKey = '__tapChatgptFiles';
  window[stateKey]?.dispose?.();

  let stopped = false;
  let timer = 0;

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
      icon: '📂',
      label: 'md',
      title: "Reveal this chat's Markdown in Finder",
      onClick: () => run('reveal'),
    });
    window.ChatGPTUI.addTopHeaderButton({
      id: 'tap-chatgpt-files-copy-path',
      icon: '📋',
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
