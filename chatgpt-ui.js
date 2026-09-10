/**
 * ChatGPT UI Library — adapted for MAIN world (no ES modules)
 *
 * Source: step-022/code/chatgpt-ui.js
 * Changes:
 *   - Added: setInlineStatus / updateInlineStatus / hideInlineStatus
 *     Inline status text in header, after model selector dropdown
 *
 * Clean API for extending ChatGPT interface:
 * - addMessageAction(messageEl, options) - add button to message actions bar
 * - addHeaderButton(options) - add button to top header area
 * - addTopHeaderButton(options) - add button next to Share
 * - addChatBadge(chatEl, count) - add badge to sidebar chat item
 * - setComposerText(text) - set the current composer text and focus it
 * - getComposerText() - get the current composer text
 * - waitForComposerReady(options) - wait until composer text and Send readiness are stable
 * - submitComposer() - click the enabled send control for the current composer
 * - submitComposerWhenReady(options) - wait for stable composer readiness, click once, and verify submit started
 * - waitForAssistantResponse(options) - wait for a new assistant message to finish streaming
 * - showToast(text, options) - show fixed toast notification
 * - onNewMessage(callback) - observe new messages
 * - onSidebarChange(callback) - observe sidebar changes
 */

(function() {
  'use strict';

  const ChatGPTUI = {
    // Selectors for ChatGPT DOM elements
    selectors: {
      assistantMessage: '[data-message-author-role="assistant"]',
      userMessage: '[data-message-author-role="user"]',
      messageActions: '.flex.items-center.gap-1, .text-token-text-tertiary.flex.items-center',
      headerLeft: 'header .flex.items-center.gap-2, nav .flex.items-center.gap-2',
      headerRight: 'header .flex.items-center.justify-end, nav .flex.items-center.justify-end',
      inputArea: 'form.w-full, [data-testid="composer"]',
      sidebar: 'nav[aria-label="Chat history"]',
      chatList: 'nav ol, nav ul',
      chatItem: 'nav li a[href^="/c/"]',
      stopGeneratingButton: '[data-testid="stop-button"], button[aria-label="Stop generating"], button[aria-label="Stop streaming"], button[aria-label="Stop response"]',
    },

    // ============================================
    // Toast / Indicator
    // ============================================

    _toasts: {},

    /**
     * Show a toast notification (fixed position)
     * @param {string} text - Toast message
     * @param {Object} options
     * @param {string} options.id - Unique ID (default: 'cgq-toast')
     * @param {string} options.position - 'bottom-right' | 'top-center' | 'bottom-left'
     * @param {number} options.duration - Auto-hide after ms (0 = manual)
     * @param {Object} options.style - Extra CSS properties
     * @returns {Element}
     */
    showToast(text, options = {}) {
      const {
        id = 'cgq-toast',
        position = 'bottom-right',
        duration = 0,
        style = {},
      } = options;

      let el = this._toasts[id];
      if (!el) {
        el = document.createElement('div');
        el.dataset.cgqId = id;

        const positions = {
          'bottom-right': 'bottom: 16px; right: 16px;',
          'bottom-left': 'bottom: 16px; left: 16px;',
          'top-center': 'top: 12px; left: 50%; transform: translateX(-50%);',
        };

        el.style.cssText = [
          'position: fixed',
          positions[position] || positions['bottom-right'],
          'background: #1f2937',
          'color: white',
          'font-size: 14px',
          'padding: 12px 20px',
          'border-radius: 8px',
          'box-shadow: 0 4px 12px rgba(0,0,0,0.15)',
          'z-index: 10000',
          'opacity: 0',
          'pointer-events: none',
          'transition: opacity 0.3s, transform 0.3s',
          'transform: translateY(10px)',
        ].join(';');

        Object.assign(el.style, style);
        this._toasts[id] = el;
      }

      el.textContent = text;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';

      if (!el.parentNode) {
        (document.body || document.documentElement).appendChild(el);
      }

      if (duration > 0) {
        this.hideToast(id, duration);
      }

      return el;
    },

    /**
     * Update text of an existing toast
     * @param {string} id - Toast ID
     * @param {string} text - New text
     */
    updateToast(id, text) {
      const el = this._toasts[id];
      if (el) el.textContent = text;
    },

    /**
     * Hide a toast with fade
     * @param {string} id - Toast ID
     * @param {number} delay - Delay before fade starts (ms)
     */
    hideToast(id, delay = 0) {
      const el = this._toasts[id];
      if (!el) return;

      const doHide = () => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
        setTimeout(() => {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 400);
      };

      if (delay > 0) {
        setTimeout(doHide, delay);
      } else {
        doHide();
      }
    },

    // ============================================
    // Inline Status (inline, after model selector)
    // ============================================

    _inlineStatus: {},

    /**
     * Show inline status text in header, after model selector dropdown
     * @param {string} text - Status text
     * @param {Object} options
     * @param {string} options.id - Unique ID (default: 'cgq-inline-status')
     * @returns {Element|null}
     */
    setInlineStatus(text, options = {}) {
      const { id = 'cgq-inline-status' } = options;

      let el = this._inlineStatus[id];

      if (!el) {
        el = document.createElement('span');
        el.dataset.cgqId = id;
        el.style.cssText = [
          'font-size: 13px',
          'color: var(--text-tertiary, #999)',
          'margin-left: 8px',
          'opacity: 0',
          'transition: opacity 0.3s',
          'white-space: nowrap',
          'pointer-events: none',
        ].join(';');
        this._inlineStatus[id] = el;
      }

      el.textContent = text;
      el.style.opacity = '1';

      if (!el.parentNode) {
        // Find header left area (where model selector lives)
        const headerLeft =
          document.querySelector('main .sticky .flex.items-center.gap-0')
          || document.querySelector('main .sticky .flex.items-center:first-child')
          || document.querySelector('header .flex.items-center:first-child');

        if (headerLeft) {
          headerLeft.appendChild(el);
        } else {
          // Retry after DOM is ready
          setTimeout(() => {
            if (!el.parentNode) this.setInlineStatus(text, options);
          }, 500);
          return null;
        }
      }

      return el;
    },

    /**
     * Update inline status text
     * @param {string} id - Status ID
     * @param {string} text - New text
     */
    updateInlineStatus(id, text) {
      const el = this._inlineStatus[id];
      if (el) el.textContent = text;
    },

    /**
     * Hide inline status with fade
     * @param {string} id - Status ID
     * @param {number} delay - Delay before fade (ms)
     */
    hideInlineStatus(id, delay = 0) {
      const el = this._inlineStatus[id];
      if (!el) return;

      const doHide = () => {
        el.style.opacity = '0';
      };

      if (delay > 0) {
        setTimeout(doHide, delay);
      } else {
        doHide();
      }
    },

    // ============================================
    // Element Management
    // ============================================

    /**
     * Remove any ChatGPTUI-created element by ID
     * @param {string} id - The cgq ID
     */
    removeElement(id) {
      const el = document.querySelector(`[data-cgq-id="${id}"]`);
      if (el?.parentNode) {
        el.parentNode.removeChild(el);
      }
      // Clean up toast registry too
      if (this._toasts[id]) {
        delete this._toasts[id];
      }
    },

    // ============================================
    // Message Actions
    // ============================================

    addMessageAction(messageEl, options) {
      const { id, icon, title, onClick, className = '' } = options;

      if (id && messageEl.querySelector(`[data-cgq-id="${id}"]`)) {
        return null;
      }

      const actionsContainer = messageEl.querySelector(this.selectors.messageActions);
      if (!actionsContainer) return null;

      const btn = document.createElement('button');
      btn.innerHTML = icon;
      btn.title = title || '';
      if (id) btn.dataset.cgqId = id;
      btn.className = `cgq-action-btn ${className}`.trim();
      btn.style.cssText = `
        background: none; border: none; cursor: pointer;
        padding: 4px 8px; opacity: 0.5; transition: opacity 0.2s;
        font-size: 16px; display: flex; align-items: center; justify-content: center;
      `;

      btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
      btn.addEventListener('mouseleave', () => btn.style.opacity = '0.5');

      if (onClick) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick(messageEl, e);
        });
      }

      actionsContainer.appendChild(btn);
      return btn;
    },

    addActionToAllMessages(options) {
      const messages = document.querySelectorAll(this.selectors.assistantMessage);
      const buttons = [];
      messages.forEach((msg, index) => {
        const btn = this.addMessageAction(msg, {
          ...options,
          onClick: options.onClick ? (el, e) => options.onClick(el, e, index) : null,
        });
        if (btn) buttons.push(btn);
      });
      return buttons;
    },

    // ============================================
    // Header Buttons
    // ============================================

    addHeaderButton(options) {
      const { id, icon, title, position = 'right', onClick, style = {} } = options;

      if (id && document.querySelector(`[data-cgq-id="${id}"]`)) {
        return null;
      }

      const headerContainer = document.querySelector('main .sticky .flex.items-center.gap-2')
        || document.querySelector('main .sticky .flex.items-center')
        || document.querySelector('header .flex.items-center.gap-2');

      const btn = document.createElement('button');
      btn.innerHTML = icon;
      btn.title = title || '';
      if (id) btn.dataset.cgqId = id;
      btn.className = 'cgq-header-btn';

      Object.assign(btn.style, {
        background: '#10b981', color: 'white', border: 'none',
        borderRadius: '50%', width: '36px', height: '36px',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'transform 0.2s, background 0.2s', flexShrink: '0',
        ...style,
      });

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.background = '#059669';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.background = '#10b981';
      });

      if (onClick) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick(e);
        });
      }

      if (headerContainer) {
        if (position === 'left') {
          headerContainer.insertBefore(btn, headerContainer.firstChild);
        } else {
          headerContainer.appendChild(btn);
        }
      } else {
        btn.style.position = 'fixed';
        btn.style.top = '12px';
        btn.style.zIndex = '1000';
        btn.style[position === 'left' ? 'left' : 'right'] = '80px';
        document.body.appendChild(btn);
      }

      return btn;
    },

    addTopHeaderText(options) {
      const { id, text } = options;

      if (id && document.querySelector(`[data-cgq-id="${id}"]`)) {
        const el = document.querySelector(`[data-cgq-id="${id}"]`);
        el.textContent = text;
        return el;
      }

      const actionsContainer = document.querySelector('#conversation-header-actions');
      if (!actionsContainer) {
        setTimeout(() => this.addTopHeaderText(options), 1000);
        return null;
      }

      const el = document.createElement('span');
      if (id) el.dataset.cgqId = id;
      el.textContent = text;
      el.style.cssText = 'font-size: 13px; color: var(--text-tertiary, #999); white-space: nowrap; padding: 0 4px;';

      const shareBtn = actionsContainer.querySelector('[data-testid="share-chat-button"]');
      if (shareBtn) {
        actionsContainer.insertBefore(el, shareBtn);
      } else {
        actionsContainer.insertBefore(el, actionsContainer.firstChild);
      }

      return el;
    },

    addTopHeaderButton(options) {
      const { id, icon, label, title, onClick } = options;

      if (id && document.querySelector(`[data-cgq-id="${id}"]`)) {
        return null;
      }

      const actionsContainer = document.querySelector('#conversation-header-actions');
      if (!actionsContainer) {
        setTimeout(() => this.addTopHeaderButton(options), 1000);
        return null;
      }

      const btn = document.createElement('button');
      btn.title = title || '';
      if (id) btn.dataset.cgqId = id;
      btn.className = 'btn relative btn-ghost text-token-text-primary hover:bg-token-surface-hover rounded-lg';
      btn.innerHTML = `
        <div class="flex w-full items-center justify-center gap-1.5">
          <span style="font-size: 16px;">${icon}</span>
          ${label ? `<span>${label}</span>` : ''}
        </div>
      `;

      if (onClick) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick(e);
        });
      }

      // ChatGPT wraps share-chat-button in nested divs now, so it's not a
      // direct child of actionsContainer — insertBefore(btn, shareBtn) would
      // throw NotFoundError. Walk up to the direct child that contains it.
      const shareBtn = actionsContainer.querySelector('[data-testid="share-chat-button"]');
      let anchor = shareBtn;
      while (anchor && anchor.parentNode !== actionsContainer) {
        anchor = anchor.parentNode;
      }
      if (anchor) {
        actionsContainer.insertBefore(btn, anchor);
      } else {
        actionsContainer.insertBefore(btn, actionsContainer.firstChild);
      }

      return btn;
    },

    addSelectionPopupButton(options) {
      const { id, icon, label, onClick } = options;

      const observer = new MutationObserver(() => {
        // Late-2026 the selection popup switched from position:fixed to a
        // translate3d'd absolute container (the "Create Note" rollout). The
        // .aria-live=polite class (literal '=', tailwind arbitrary class)
        // is still the stable handle; the .fixed filter no longer matches.
        // Tighten the inner selector to .shadow-long.flex.overflow-hidden
        // so we don't accidentally grab any other .flex.overflow-hidden.
        const popup = document.querySelector('.aria-live\\=polite');
        if (!popup) return;
        const container = popup.querySelector('.shadow-long.flex.overflow-hidden');
        if (!container) return;
        if (container.querySelector(`[data-cgq-id="${id}"]`)) return;

        const btn = document.createElement('button');
        btn.dataset.cgqId = id;
        // Mirror native popup buttons — radius lives on the wrapper, each
        // button is rounded-none with a left border acting as the separator
        // from its left neighbour.
        btn.className =
          'btn relative btn-secondary rounded-none active:opacity-1 '
          + 'border-y-0 border-e-0 border-s border-solid border-token-border-heavy';
        btn.innerHTML = `
          <div class="flex items-center justify-center">
            <span class="flex items-center gap-1.5 select-none">
              <span style="font-size: 14px;">${icon}</span>
              <span class="whitespace-nowrap select-none">${label}</span>
            </span>
          </div>
        `;

        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const selection = window.getSelection();
          const text = selection?.toString() || '';
          const range = selection?.rangeCount > 0 ? selection.getRangeAt(0) : null;
          let html = '';
          if (range) {
            const div = document.createElement('div');
            div.appendChild(range.cloneContents());
            html = div.innerHTML;
          }
          onClick({ text, html, range });
        });

        container.appendChild(btn);
      });

      observer.observe(document.body, { childList: true, subtree: true });
      return observer;
    },

    // ============================================
    // Context Menus
    // ============================================

    addChatMenuItem(options) {
      const { id, icon, label, onClick } = options;

      const observer = new MutationObserver(() => {
        const menu = document.querySelector('[data-radix-popper-content-wrapper] [role="menu"]');
        if (!menu) return;
        if (menu.querySelector(`[data-cgq-id="${id}"]`)) return;

        const existingItem = menu.querySelector('[role="menuitem"]');
        if (!existingItem) return;

        const chatLink = document.querySelector('nav li a:hover, nav li a:focus-within, nav li:has(button[aria-expanded="true"]) a');
        const chatUrl = chatLink?.href || '';
        const chatTitle = chatLink?.textContent?.trim() || '';

        const menuItem = document.createElement('div');
        menuItem.setAttribute('role', 'menuitem');
        menuItem.dataset.cgqId = id;
        menuItem.tabIndex = -1;
        menuItem.className = existingItem.className;
        menuItem.innerHTML = `<span style="margin-right: 8px;">${icon}</span><span>${label}</span>`;

        menuItem.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick({ chatUrl, chatTitle, menuEl: menu });
          document.body.click();
        });
        menuItem.addEventListener('mouseenter', () => menuItem.style.backgroundColor = 'var(--surface-tertiary)');
        menuItem.addEventListener('mouseleave', () => menuItem.style.backgroundColor = '');

        menu.appendChild(menuItem);
      });

      observer.observe(document.body, { childList: true, subtree: true });
      return observer;
    },

    addHeaderMenuItem(options) {
      const { id, icon, label, menuSelector, onClick } = options;

      const observer = new MutationObserver(() => {
        const selector = menuSelector || '[data-radix-popper-content-wrapper] [role="menu"], [data-radix-popper-content-wrapper] [role="listbox"]';
        const menu = document.querySelector(selector);
        if (!menu) return;
        if (menu.querySelector(`[data-cgq-id="${id}"]`)) return;

        const existingItem = menu.querySelector('[role="menuitem"], [role="option"]');
        if (!existingItem) return;

        const menuItem = document.createElement('div');
        menuItem.setAttribute('role', existingItem.getAttribute('role') || 'menuitem');
        menuItem.dataset.cgqId = id;
        menuItem.tabIndex = -1;
        menuItem.className = existingItem.className;
        menuItem.innerHTML = `<span style="margin-right: 8px;">${icon}</span><span>${label}</span>`;

        menuItem.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick({ menuEl: menu });
          document.body.click();
        });
        menuItem.addEventListener('mouseenter', () => menuItem.style.backgroundColor = 'var(--surface-tertiary)');
        menuItem.addEventListener('mouseleave', () => menuItem.style.backgroundColor = '');

        menu.appendChild(menuItem);
      });

      observer.observe(document.body, { childList: true, subtree: true });
      return observer;
    },

    removeMenuItem(observer) {
      if (observer) observer.disconnect();
    },

    // ============================================
    // Sidebar
    // ============================================

    getSidebarChats() {
      const links = document.querySelectorAll('nav a[href^="/c/"], nav a[href^="/g/"]');
      return Array.from(links)
        .filter(link => {
          const href = link.getAttribute('href');
          if (href.endsWith('/project')) return false;
          if (href.startsWith('/g/') && !href.includes('/c/')) return false;
          return true;
        })
        .map(link => {
          const href = link.getAttribute('href');
          const match = href.match(/\/c\/([a-f0-9-]+)/);
          const conversationId = match ? match[1] : null;
          return {
            element: link, link, href, conversationId,
            url: `https://chatgpt.com${href}`,
            simpleUrl: conversationId ? `https://chatgpt.com/c/${conversationId}` : null,
            title: link.textContent?.trim() || '',
          };
        });
    },

    filterSidebarChats(predicate) {
      const chats = this.getSidebarChats();
      const highlighted = [];
      const highlightedSet = new Set();

      chats.forEach(chat => {
        const isHighlighted = predicate(chat);
        chat.element.style.opacity = isHighlighted ? '' : '0.35';
        if (!chat.element.dataset.originalIndex) {
          chat.element.dataset.originalIndex = Array.from(chat.element.parentElement.children).indexOf(chat.element);
        }
        if (isHighlighted) {
          highlighted.push(chat.element);
          highlightedSet.add(chat.element);
        }
      });

      if (highlighted.length > 0 && chats.length > 0) {
        const parent = chats[0].element.parentElement;
        const anchor = chats.find(c => !highlightedSet.has(c.element))?.element;
        if (anchor) {
          highlighted.forEach(el => parent.insertBefore(el, anchor));
        }
      }
    },

    showAllSidebarChats() {
      const chats = this.getSidebarChats();
      if (chats.length === 0) return;

      const withIndex = [];
      chats.forEach(chat => {
        chat.element.style.opacity = '';
        if (chat.element.dataset.originalIndex !== undefined) {
          withIndex.push({ element: chat.element, index: parseInt(chat.element.dataset.originalIndex, 10) });
        }
      });

      withIndex.sort((a, b) => a.index - b.index);
      if (withIndex.length < 2) return;

      const lastChat = withIndex[withIndex.length - 1].element;
      const parent = lastChat.parentElement;
      for (let i = withIndex.length - 2; i >= 0; i--) {
        parent.insertBefore(withIndex[i].element, withIndex[i + 1].element);
      }
    },

    // ============================================
    // Badges
    // ============================================

    addChatBadge(chatEl, count, options = {}) {
      const { color = '#3b82f6', textColor = 'white' } = options;

      const existingBadge = chatEl.querySelector('.cgq-chat-badge');
      if (existingBadge) existingBadge.remove();
      if (!count || count === 0) return null;

      const badge = document.createElement('span');
      badge.className = 'cgq-chat-badge';
      badge.textContent = count;
      badge.style.cssText = `
        background: ${color}; color: ${textColor}; font-size: 10px;
        font-weight: 600; padding: 2px 6px; border-radius: 10px;
        margin-left: auto; flex-shrink: 0;
      `;

      if (!chatEl.style.display) {
        chatEl.style.display = 'flex';
        chatEl.style.alignItems = 'center';
      }

      chatEl.appendChild(badge);
      return badge;
    },

    updateAllChatBadges(counts) {
      const chatLinks = document.querySelectorAll(this.selectors.chatItem);
      chatLinks.forEach(link => {
        const href = link.getAttribute('href');
        const fullUrl = `https://chatgpt.com${href}`;
        this.addChatBadge(link, counts[fullUrl] || 0);
      });
    },

    // ============================================
    // Observers
    // ============================================

    onNewMessage(callback) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            const messages = node.matches?.(this.selectors.assistantMessage)
              ? [node]
              : node.querySelectorAll?.(this.selectors.assistantMessage) || [];
            messages.forEach(msg => callback(msg));
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
      return observer;
    },

    onSidebarChange(callback, debounceMs = 500) {
      let timeout = null;
      let isUpdating = false;

      const observer = new MutationObserver(() => {
        if (isUpdating) return;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          isUpdating = true;
          callback();
          setTimeout(() => { isUpdating = false; }, 100);
        }, debounceMs);
      });

      const startObserving = () => {
        const sidebar = document.querySelector(this.selectors.sidebar);
        if (sidebar) {
          observer.observe(sidebar, { childList: true, subtree: true });
          callback();
        } else {
          setTimeout(startObserving, 1000);
        }
      };

      startObserving();
      return observer;
    },

    // ============================================
    // Utilities
    // ============================================

    getAssistantMessages() {
      return document.querySelectorAll(this.selectors.assistantMessage);
    },

    isGenerating() {
      return !!document.querySelector(this.selectors.stopGeneratingButton);
    },

    getConversationTitle() {
      return document.title?.replace(' | ChatGPT', '').replace(' - ChatGPT', '') || 'Untitled';
    },

    getConversationUrl() {
      return window.location.href;
    },

    findParentMessage(node) {
      let current = node;
      while (current && current !== document.body) {
        if (current.matches?.(this.selectors.assistantMessage)) return current;
        current = current.parentNode;
      }
      return null;
    },

    getMessageContent(messageEl) {
      const markdownEl = messageEl.querySelector('.markdown');
      return {
        text: markdownEl?.textContent || messageEl.textContent || '',
        html: markdownEl?.innerHTML || messageEl.innerHTML || '',
      };
    },

    waitForAssistantResponse(options = {}) {
      const {
        afterCount = this.getAssistantMessages().length,
        timeout = 1800000,
        quietPeriod = 2000,
      } = options;

      return new Promise((resolve) => {
        let observer = null;
        let intervalId = null;
        let timeoutId = null;
        let settled = false;
        let candidateEl = null;
        let candidateText = '';
        let stableSince = 0;

        const cleanup = () => {
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        };

        const finish = (result) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(result);
        };

        const inspect = () => {
          if (settled) return;

          const messages = Array.from(this.getAssistantMessages());
          const message = messages[afterCount] || null;
          if (!message) {
            candidateEl = null;
            candidateText = '';
            stableSince = 0;
            return;
          }

          const { text } = this.getMessageContent(message);
          const normalizedText = text.trim();
          if (!normalizedText || this.isGenerating()) {
            candidateEl = message;
            candidateText = normalizedText;
            stableSince = 0;
            return;
          }

          if (candidateEl !== message || candidateText !== normalizedText) {
            candidateEl = message;
            candidateText = normalizedText;
            stableSince = Date.now();
            return;
          }

          if (!stableSince) {
            stableSince = Date.now();
            return;
          }

          if (stableSince && Date.now() - stableSince >= quietPeriod) {
            finish(message);
          }
        };

        observer = new MutationObserver(inspect);
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
        });

        intervalId = setInterval(inspect, 250);
        timeoutId = setTimeout(() => finish(null), timeout);
        inspect();
      });
    },

    // ============================================
    // Composer
    // ============================================

    _getComposerRoot() {
      const explicitRoot = document.querySelector('[data-testid="composer"]')
        || document.querySelector('form[data-type="unified-composer"]');
      if (explicitRoot) return explicitRoot;

      const field = this._getComposerField(document);
      return this._getOwningForm(field) || document.querySelector('form');
    },

    _isUsableComposerField(field) {
      if (!field || field.hidden || field.disabled) return false;
      if (field.getAttribute?.('aria-hidden') === 'true') return false;
      if (field.getAttribute?.('aria-disabled') === 'true') return false;

      const style = window.getComputedStyle?.(field);
      if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;

      if (typeof field.getBoundingClientRect === 'function') {
        const rect = field.getBoundingClientRect();
        if (rect && rect.width === 0 && rect.height === 0) return false;
      }
      return true;
    },

    _getComposerField(root) {
      const scope = root || document;
      const selectors = [
        '#prompt-textarea[contenteditable="true"]',
        '[contenteditable="true"][data-testid]',
        '[contenteditable="true"][role="textbox"]',
        '[contenteditable="true"][aria-label]',
        'textarea[data-testid]',
        'textarea[aria-label]',
        'textarea[placeholder]',
      ];
      const candidates = [];
      const seen = new Set();

      for (const selector of selectors) {
        for (const field of scope.querySelectorAll(selector)) {
          if (seen.has(field)) continue;
          seen.add(field);
          candidates.push(field);
        }
      }

      return candidates.find(field => this._isUsableComposerField(field))
        || candidates.find(field => !field.disabled && field.getAttribute?.('aria-disabled') !== 'true')
        || null;
    },

    _getOwningForm(node) {
      return node?.form || node?.closest?.('form') || null;
    },

    _getSendButton(root, field = null) {
      const scope = root || document;
      const candidates = [
        'button[data-composer-submit]:not([disabled])',
        '[data-testid="send-button"]:not([disabled])',
        'button[aria-label="Send message"]:not([disabled])',
        'button[aria-label="Send prompt"]:not([disabled])',
        'button[type="submit"]:not([disabled])',
        'form button[type="submit"]:not([disabled])',
        'button[data-testid="fruitjuice-send-button"]:not([disabled])',
      ];
      const broadAriaSendSelector = 'button[aria-label*="Send" i]:not([disabled])';
      try {
        document.createDocumentFragment().querySelector(broadAriaSendSelector);
        candidates.push(broadAriaSendSelector);
      } catch (_err) {}

      for (const selector of candidates) {
        const button = scope.querySelector(selector) || document.querySelector(selector);
        if (button && button.getAttribute('aria-disabled') !== 'true') {
          return button;
        }
      }

      return null;
    },

    _getUserMessageCount() {
      return document.querySelectorAll(this.selectors.userMessage).length;
    },

    _delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Set the active composer text and dispatch React-compatible input events
     * @param {string} text - Text to place into the composer
     * @returns {boolean}
     */
    setComposerText(text) {
      const root = this._getComposerRoot();
      const field = this._getComposerField(root);
      if (!field) return false;

      const value = String(text ?? '');
      const isTextarea = field.tagName === 'TEXTAREA';

      if (isTextarea) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (setter) {
          setter.call(field, value);
        } else {
          field.value = value;
        }
      } else {
        field.textContent = value;
      }

      field.focus();

      if (!isTextarea) {
        const selection = window.getSelection?.();
        if (selection && document.createRange) {
          const range = document.createRange();
          range.selectNodeContents(field);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      field.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: value,
        inputType: 'insertText',
      }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },

    /**
     * Get the active composer text
     * @returns {string}
     */
    getComposerText() {
      const root = this._getComposerRoot();
      const field = this._getComposerField(root);
      if (!field) return '';
      return field.tagName === 'TEXTAREA' ? field.value : (field.textContent || '');
    },

    /**
     * Wait until the active composer and enabled send control are stable
     * @param {Object} options
     * @param {string} options.expectedText - Required composer text before resolving
     * @param {number} options.timeout - Max wait in ms (default: 60000)
     * @param {number} options.quietPeriod - Stable period in ms (default: 750)
     * @param {number} options.pollInterval - Poll interval in ms (default: 250)
     * @returns {Promise<boolean>}
     */
    waitForComposerReady(options = {}) {
      const {
        expectedText,
        timeout = 60000,
        quietPeriod = 750,
        pollInterval = 250,
      } = options;
      const hasExpectedText = Object.prototype.hasOwnProperty.call(options, 'expectedText');

      return new Promise((resolve) => {
        let observer = null;
        let intervalId = null;
        let timeoutId = null;
        let settled = false;
        let lastSignature = '';
        let stableSince = 0;

        const cleanup = () => {
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        };

        const finish = (result) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(result);
        };

        const inspect = () => {
          if (settled) return;

          const root = this._getComposerRoot();
          const field = this._getComposerField(root);
          const text = field
            ? (field.tagName === 'TEXTAREA' ? field.value : (field.textContent || ''))
            : '';
          const button = this._getSendButton(root, field);
          const buttonReady = !!button;
          const textReady = !hasExpectedText || text === String(expectedText ?? '');
          const ready = !!field && textReady && buttonReady;
          const signature = [
            field ? 'field' : 'no-field',
            text,
            buttonReady ? 'send-ready' : 'send-not-ready',
          ].join('\n');
          const now = Date.now();

          if (!ready) {
            lastSignature = signature;
            stableSince = 0;
            return;
          }

          if (signature !== lastSignature) {
            lastSignature = signature;
            stableSince = now;
            return;
          }

          if (!stableSince) {
            stableSince = now;
            return;
          }

          if (now - stableSince >= quietPeriod) {
            finish(true);
          }
        };

        observer = new MutationObserver(inspect);
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
        });

        intervalId = setInterval(inspect, pollInterval);
        timeoutId = setTimeout(() => finish(false), timeout);
        inspect();
      });
    },

    /**
     * Submit the active composer by clicking the enabled send control once
     * @returns {boolean}
     */
    submitComposer() {
      const root = this._getComposerRoot();
      const field = this._getComposerField(root);
      const button = this._getSendButton(root, field);
      if (!button) return false;

      try {
        button.click();
        return true;
      } catch (_err) {
        return false;
      }
    },

    /**
     * Wait for stable composer readiness, click Send once, and verify submission started
     * @param {Object} options
     * @param {string} options.expectedText - Required composer text before submitting
     * @param {number} options.timeout - Max readiness wait in ms (default: 60000)
     * @param {number} options.quietPeriod - Stable readiness period in ms (default: 750)
     * @param {number} options.settleDelay - Delay after first stable readiness before final recheck, using setTimeout (default: 1500)
     * @param {number} options.pollInterval - Poll interval in ms (default: 250)
     * @param {number} options.verifyTimeout - Max submit verification wait in ms (default: 15000)
     * @param {Function} options.onBeforeSubmit - Optional callback just before the one-shot submit
     * @returns {Promise<boolean>}
     */
    async submitComposerWhenReady(options = {}) {
      const ready = await this.waitForComposerReady(options);
      if (!ready) return false;

      const {
        expectedText,
        pollInterval = 250,
        quietPeriod = 750,
        settleDelay = 1500,
        verifyTimeout = 15000,
        onBeforeSubmit,
      } = options;
      const hasExpectedText = Object.prototype.hasOwnProperty.call(options, 'expectedText');
      const expected = String(expectedText ?? '');

      if (settleDelay > 0) {
        await this._delay(settleDelay);
      }

      const secondQuietPeriod = Math.min(quietPeriod, 500);
      const secondTimeout = Math.max(2000, secondQuietPeriod + (pollInterval * 3));
      const readyAfterSettle = await this.waitForComposerReady({
        ...options,
        timeout: secondTimeout,
        quietPeriod: secondQuietPeriod,
        pollInterval,
      });
      if (!readyAfterSettle) return false;
      if (hasExpectedText && this.getComposerText() !== expected) return false;

      const userMessageCount = this._getUserMessageCount();
      const composerText = this.getComposerText();
      if (typeof onBeforeSubmit === 'function') {
        try {
          onBeforeSubmit();
        } catch (_err) {}
      }
      const submitted = this.submitComposer();
      if (!submitted) return false;

      return new Promise((resolve) => {
        let observer = null;
        let intervalId = null;
        let timeoutId = null;
        let settled = false;

        const cleanup = () => {
          if (observer) {
            observer.disconnect();
            observer = null;
          }
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        };

        const finish = (result) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(result);
        };

        const inspect = () => {
          if (settled) return;
          if (this._getUserMessageCount() > userMessageCount) {
            finish(true);
            return;
          }
          if (composerText !== '' && this.getComposerText() === '') {
            finish(true);
            return;
          }
          if (this.isGenerating()) {
            finish(true);
            return;
          }
        };

        observer = new MutationObserver(inspect);
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
        });

        intervalId = setInterval(inspect, pollInterval);
        timeoutId = setTimeout(() => finish(false), verifyTimeout);
        inspect();
      });
    },

    // ============================================
    // Footer
    // ============================================

    /**
     * Add text after the "ChatGPT can make mistakes" disclaimer
     * @param {string} text - Text to append
     * @returns {Element|null}
     */
    setFooterText(text) {
      const id = 'cgq-footer-text';
      let el = document.querySelector(`[data-cgq-id="${id}"]`);

      if (el) {
        el.textContent = text;
        return el;
      }

      // Find the disclaimer div
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let disclaimerEl = null;
      while (walker.nextNode()) {
        if (walker.currentNode.textContent?.includes('ChatGPT can make mistakes')) {
          disclaimerEl = walker.currentNode.parentElement;
          break;
        }
      }
      if (!disclaimerEl) return null;

      el = document.createElement('div');
      el.dataset.cgqId = id;
      el.textContent = text;
      disclaimerEl.parentElement.appendChild(el);
      return el;
    },

    /**
     * Remove appended footer text
     */
    clearFooterText() {
      const el = document.querySelector('[data-cgq-id="cgq-footer-text"]');
      if (el) el.remove();
    },
  };

  window.ChatGPTUI = ChatGPTUI;
})();
