// Only relays messages on Signal-owned origins; page code never receives cookies directly.
window.addEventListener('message', event => {
  if (event.source !== window || event.data?.source !== 'signal-app') return;
  chrome.runtime.sendMessage(event.data.payload, response => window.postMessage({source:'signal-extension', response}, '*'));
});
