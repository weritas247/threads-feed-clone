const appUrlInput = document.getElementById('appUrl');
const countEl = document.getElementById('count');
const statusEl = document.getElementById('status');
const addProfileBtn = document.getElementById('addProfile');
const acctStatusEl = document.getElementById('acctStatus');

const DEFAULT_URL = 'http://localhost:4242';

chrome.storage.local.get(['appUrl'], (r) => {
  appUrlInput.value = r.appUrl || DEFAULT_URL;
});
appUrlInput.addEventListener('change', () => {
  chrome.storage.local.set({ appUrl: appUrlInput.value.trim() });
});

function activeTab() {
  return chrome.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]);
}

function send(tabId, msg) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, (resp) => {
      void chrome.runtime.lastError; // swallow "no receiver" when not on Threads
      resolve(resp);
    });
  });
}

// 'threads' | 'x' | null for the tab's site.
function siteOf(tab) {
  const url = tab?.url || '';
  if (/https:\/\/www\.threads\.(com|net)\//.test(url)) return 'threads';
  if (/https:\/\/(x|twitter)\.com\//.test(url)) return 'x';
  return null;
}

async function refresh() {
  const tab = await activeTab();
  if (!siteOf(tab)) {
    countEl.textContent = 'Open your Threads Saved or X Bookmarks page first.';
    return;
  }
  const resp = await send(tab.id, { type: 'TSAVED_STATUS' });
  if (resp) {
    countEl.textContent =
      `${resp.count} data block(s) captured` + (resp.scrolling ? ' · scrolling…' : '');
  }

  const info = await send(tab.id, { type: 'TSAVED_ACCOUNTS_INFO' });
  if (info && info.profile) {
    addProfileBtn.textContent = `Add @${info.profile}`;
    addProfileBtn.disabled = false;
  } else {
    addProfileBtn.textContent = 'Add this profile';
    addProfileBtn.disabled = true;
  }
}

function addAccounts(usernames, platform) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'TSAVED_ADD_ACCOUNTS', appUrl: appUrlInput.value.trim(), usernames, platform },
      resolve,
    );
  });
}

function reportAccounts(resp, attempted) {
  if (!resp || !resp.ok) {
    const why = (resp && (resp.error || (resp.data && resp.data.error) || resp.status)) || 'no response';
    acctStatusEl.style.color = '#d1242f';
    acctStatusEl.textContent = 'Add failed: ' + why;
    return;
  }
  const d = resp.data || {};
  acctStatusEl.style.color = '#1a7f37';
  acctStatusEl.textContent = `Added ${d.added} new (from ${attempted}); ${d.total} total accounts.`;
}

addProfileBtn.addEventListener('click', async () => {
  const tab = await activeTab();
  const info = await send(tab.id, { type: 'TSAVED_ACCOUNTS_INFO' });
  if (!info || !info.profile) {
    acctStatusEl.style.color = '#d1242f';
    acctStatusEl.textContent = 'Open a profile page first.';
    return;
  }
  acctStatusEl.style.color = '#666';
  acctStatusEl.textContent = `Adding @${info.profile}…`;
  reportAccounts(await addAccounts([info.profile], info.platform), 1);
});

document.getElementById('addAll').addEventListener('click', async () => {
  const tab = await activeTab();
  if (!siteOf(tab)) {
    acctStatusEl.style.color = '#d1242f';
    acctStatusEl.textContent = 'Not on Threads/X — open a list or profile page first.';
    return;
  }
  const info = await send(tab.id, { type: 'TSAVED_ACCOUNTS_INFO' });
  const handles = (info && info.handles) || [];
  if (handles.length === 0) {
    acctStatusEl.style.color = '#d1242f';
    acctStatusEl.textContent = 'No handles found on this page.';
    return;
  }
  acctStatusEl.style.color = '#666';
  acctStatusEl.textContent = `Adding ${handles.length} account(s)…`;
  reportAccounts(await addAccounts(handles, info.platform), handles.length);
});

document.getElementById('open').addEventListener('click', async () => {
  const tab = await activeTab();
  // Go to whichever saved page matches the current site (default Threads).
  const url = siteOf(tab) === 'x' ? 'https://x.com/i/bookmarks' : 'https://www.threads.com/saved';
  chrome.tabs.update(tab.id, { url });
  statusEl.textContent = 'Opening saved/bookmarks page…';
});

document.getElementById('scroll').addEventListener('click', async () => {
  const tab = await activeTab();
  if (!siteOf(tab)) {
    statusEl.textContent = 'Not on Threads/X — open the saved/bookmarks page first.';
    return;
  }
  await send(tab.id, { type: 'TSAVED_SCROLL' });
  statusEl.textContent = 'Auto-scrolling… keep this tab focused.';
});

document.getElementById('import').addEventListener('click', async () => {
  const tab = await activeTab();
  if (!siteOf(tab)) {
    statusEl.textContent = 'Not on Threads/X — open the saved/bookmarks page first.';
    return;
  }
  statusEl.textContent = 'Importing…';
  const resp = await send(tab.id, { type: 'TSAVED_SEND', appUrl: appUrlInput.value.trim() });
  if (!resp || !resp.ok) {
    const why = (resp && (resp.error || (resp.data && resp.data.error) || resp.status)) || 'no response';
    statusEl.style.color = '#d1242f';
    statusEl.textContent = 'Import failed: ' + why;
    return;
  }
  const d = resp.data || {};
  statusEl.style.color = '#1a7f37';
  statusEl.textContent = `Imported ${d.found} posts (${d.added} new, ${d.total} total).`;
});

refresh();
setInterval(refresh, 1000);
