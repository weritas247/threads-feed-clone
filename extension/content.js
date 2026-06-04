// Isolated-world content script. Accumulates the captured data blocks that the
// MAIN-world interceptor forwards, drives auto-scrolling of the Saved page, and
// relays import requests (via the background worker) to the local app.
const blocks = [];
let scrolling = false;

window.addEventListener('message', (e) => {
  if (e.source === window && e.data && e.data.__tsaved) {
    blocks.push(e.data.block);
  }
});

// Scroll to the bottom repeatedly until the page stops growing — this makes Threads
// lazy-load the entire saved list, and each loaded page triggers a captured request.
async function autoScroll() {
  if (scrolling) return;
  scrolling = true;
  let lastHeight = 0;
  let still = 0;
  while (still < 6) {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 1200));
    if (document.body.scrollHeight === lastHeight) {
      still++;
    } else {
      still = 0;
      lastHeight = document.body.scrollHeight;
    }
  }
  scrolling = false;
}

// Which site we're on — Threads uses /@handle paths, X uses bare /handle paths.
function platform() {
  return /(^|\.)(x|twitter)\.com$/.test(location.host) ? 'x' : 'threads';
}

// Non-account first-path segments on x.com that must never be treated as handles.
const X_RESERVED = new Set([
  'home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings',
  'compose', 'bookmarks', 'hashtag', 'lists', 'communities', 'jobs', 'login',
  'logout', 'signup', 'tos', 'privacy', 'about', 'intent', 'share', 'account',
  'following', 'followers', 'verified_followers', 'status', 'notifications',
]);

function handleFromPath(path) {
  if (platform() === 'x') {
    // /handle, /handle/with_replies, /handle/status/123 → handle (1–15 word chars)
    const m = path.match(/^\/([A-Za-z0-9_]{1,15})(\/.*)?$/);
    if (!m || X_RESERVED.has(m[1].toLowerCase())) return null;
    return m[1].toLowerCase();
  }
  const m = path.match(/^\/@([A-Za-z0-9._]+)(\/.*)?$/);
  return m ? m[1].toLowerCase() : null;
}

// The handle of the profile currently being viewed, if any.
function currentProfile() {
  return handleFromPath(location.pathname);
}

// Every distinct profile handle linked on the page (not /post|/status/ permalinks).
// On a Following/Followers list this is the whole list; elsewhere it's whoever is
// linked.
function collectHandles() {
  const set = new Set();
  document.querySelectorAll('a[href]').forEach((a) => {
    let path;
    try {
      path = new URL(a.href, location.origin).pathname;
    } catch (e) {
      return;
    }
    // Only bare profile links (single segment), not permalinks.
    if (!/^\/(@?[A-Za-z0-9._]+)\/?$/.test(path)) return;
    const h = handleFromPath(path);
    if (h) set.add(h);
  });
  return [...set];
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'TSAVED_STATUS') {
    sendResponse({ count: blocks.length, scrolling });
    return;
  }
  if (msg.type === 'TSAVED_ACCOUNTS_INFO') {
    sendResponse({ profile: currentProfile(), handles: collectHandles(), platform: platform() });
    return;
  }
  if (msg.type === 'TSAVED_SCROLL') {
    autoScroll();
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === 'TSAVED_SEND') {
    chrome.runtime.sendMessage(
      { type: 'TSAVED_UPLOAD', appUrl: msg.appUrl, payload: { source: 'threads-saved', blocks } },
      (resp) => sendResponse(resp),
    );
    return true; // keep the channel open for the async background response
  }
});
