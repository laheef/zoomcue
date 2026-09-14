// Only relays messages on ZoomCue-owned origins; page code never receives cookies directly.
window.addEventListener('message', event => {
  if (event.source !== window || event.data?.source !== 'zoomcue-app') return;
  chrome.runtime.sendMessage(event.data.payload, response => window.postMessage({source:'zoomcue-extension', response}, '*'));
});
