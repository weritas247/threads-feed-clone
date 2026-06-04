// Runs in the page's MAIN world (same JS context as Threads' own code) so it can
// see the network calls Threads makes. It monkeypatches fetch + XHR, and whenever a
// response body contains `thread_items` (the Threads post schema), it forwards the
// parsed JSON to the isolated content script via window.postMessage. It also grabs
// the server-rendered JSON already embedded in the page. Credentials never leave the
// browser — we only read responses Threads already fetched for the logged-in user.
(function () {
  if (window.__tsavedHooked) return;
  window.__tsavedHooked = true;

  function emit(text) {
    // Threads feed responses carry `thread_items`; x.com GraphQL carries
    // `tweet_results`. Forward either; the app figures out which schema it is.
    if (!text || (text.indexOf('thread_items') === -1 && text.indexOf('tweet_results') === -1)) return;
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return;
    }
    window.postMessage({ __tsaved: true, block: data }, '*');
  }

  const origFetch = window.fetch;
  window.fetch = function () {
    return origFetch.apply(this, arguments).then(function (res) {
      try {
        res.clone().text().then(emit);
      } catch (e) {
        /* opaque/streamed body — ignore */
      }
      return res;
    });
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', function () {
      try {
        emit(this.responseText);
      } catch (e) {
        /* non-text response — ignore */
      }
    });
    return origSend.apply(this, arguments);
  };

  function scrapeEmbedded() {
    document.querySelectorAll('script[type="application/json"]').forEach(function (s) {
      emit(s.textContent || '');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrapeEmbedded);
  } else {
    scrapeEmbedded();
  }
})();
