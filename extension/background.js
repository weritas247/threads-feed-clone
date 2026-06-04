// The background service worker does the cross-origin POST to the local app. With
// the localhost host_permission it can call the app's API without CORS friction.
function postJson(appUrl, path, body, sendResponse) {
  const url = String(appUrl || '').replace(/\/+$/, '') + path;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => null);
      sendResponse({ ok: res.ok, status: res.status, data });
    })
    .catch((err) => sendResponse({ ok: false, error: String(err) }));
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'TSAVED_UPLOAD') {
    postJson(msg.appUrl, '/api/bookmarks', msg.payload, sendResponse);
    return true; // async sendResponse
  }
  if (msg.type === 'TSAVED_ADD_ACCOUNTS') {
    postJson(
      msg.appUrl,
      '/api/accounts/import',
      { usernames: msg.usernames, platform: msg.platform === 'x' ? 'x' : 'threads' },
      sendResponse,
    );
    return true; // async sendResponse
  }
});
