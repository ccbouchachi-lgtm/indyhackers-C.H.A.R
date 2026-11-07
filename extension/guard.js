// A cached or service-worker page can bypass network blocking. Check local rules too.
(() => {
  let checking = false;
  async function check() {
    if (checking) return;
    checking = true;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_SITE' });
      if (response?.blocked) location.replace(chrome.runtime.getURL('blocked.html'));
    } catch { /* Extension may have been reloaded or disabled. */ }
    finally { checking = false; }
  }
  check();
  window.addEventListener('pageshow', check);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  chrome.runtime.onMessage.addListener(message => { if (message.type === 'RECHECK') check(); });
})();
