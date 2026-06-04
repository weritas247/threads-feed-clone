# Threads/X Saved → Feed Clone (Chrome extension)

Imports the posts you saved on **Threads** (Saved) and **X** (Bookmarks) into the
local Feed Clone app with one click — no file download/upload — and adds accounts
from either site. Your login/cookies never leave the browser; the extension only
reads the API responses the site already loads for you.

## How it works

- `interceptor.js` runs in the page's MAIN world on threads.com / x.com and patches
  `fetch`/`XMLHttpRequest`. Any response containing `thread_items` (Threads) or
  `tweet_results` (X) is forwarded to the content script. This avoids hard-coding a
  GraphQL id, so it survives the sites' internal-id churn.
- `content.js` accumulates those blocks and auto-scrolls the Saved page to lazy-load
  the whole list.
- `background.js` POSTs the collected blocks to the app's `/api/bookmarks`, which runs
  them through the same parser the crawler uses and stores them in the Saved feed.

## Install (load unpacked)

1. Start the app (`npm run dev`) and note its URL (`http://localhost:4242`).
2. Open `chrome://extensions`, enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this `extension/` folder.

## Use

Set **App URL** in the popup to your running app (default `http://localhost:4242`;
change it only if you ran the app on a different port).

### ① Import Saved posts

1. **Open Threads Saved page** (must be logged in), then **Auto-scroll & capture** —
   wait until the captured-block count stops rising.
2. **Import to app**, then open `/saved` in the app to see the bookmarks.

### ② Add accounts (from the Threads site)

- **Add @handle** — on any `/@handle` profile page, adds that account to the app's
  managed crawl list (`/api/accounts/import`).
- **Add all @handles on this page** — collects every profile link on the page and
  bulk-adds them. Best on your **Following** list: open it, scroll to load everyone,
  then click. (On a profile page it also grabs linked/recommended handles — prune
  extras in the app's `/manage` tab.)

Newly added accounts appear in `/manage`; crawl them there to populate the feed.

> A no-install bookmarklet alternative is also built into the app's `/saved` page
> (**Import from Threads**) if you'd rather not load an extension.
