// ZoomCue companion — the two jobs deliberately mirror the server pipeline.
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'ssv:fetch-page') {
    try {
      const result = await chrome.scripting.executeScript({target: {tabId: message.tabId}, func: serializePage});
      const html = result?.[0]?.result;
      if (html) await chrome.downloads.download({url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html), filename: 'zoomcue-page.html'});
      sendResponse({ok: !!html, html});
    } catch (e) { sendResponse({ok: false, error: String(e)}); }
    return true;
  }
  if (message.type === 'ssv:sign-in') {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const tab = tabs[0];
    const state = {cookies: [], origins: []};
    const url = new URL(tab.url);
    const cookies = await chrome.cookies.getAll({url: url.origin});
    state.cookies = cookies.map(c => ({name:c.name, value:c.value, domain:c.domain, path:c.path, expires:c.expirationDate, httpOnly:c.httpOnly, secure:c.secure, sameSite:c.sameSite}));
    const result = await chrome.scripting.executeScript({target:{tabId:tab.id}, func: () => ({url: location.href, localStorage: Object.fromEntries(Object.entries(localStorage))})});
    state.origins.push({origin:url.origin, localStorage: result[0].result.localStorage});
    sendResponse({ok:true, storageState:state}); return true;
  }
});
function serializePage() {
  const clone=document.documentElement.cloneNode(true);
  clone.querySelectorAll('script').forEach(s=>s.remove());
  clone.querySelectorAll('img').forEach(img=>{if(img.currentSrc)img.setAttribute('src',img.currentSrc)});
  const styles=[...document.styleSheets].map(s=>{try{return [...s.cssRules].map(r=>r.cssText).join('\n')}catch(e){return ''}}).join('\n');
  const style=document.createElement('style');style.textContent=styles;clone.querySelector('head')?.append(style);
  return '<!doctype html>\n'+clone.outerHTML;
}
