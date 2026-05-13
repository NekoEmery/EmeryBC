// ==UserScript==
// @name         EmeryBC (dev)
// @namespace    https://github.com/NekoEmery/EmeryBC
// @version      0.1.9
// @description  EmeryBC addon for Bondage Club — dev channel
// @downloadURL  https://raw.githubusercontent.com/NekoEmery/EmeryBC/dev/loader-dev.user.js
// @updateURL    https://raw.githubusercontent.com/NekoEmery/EmeryBC/dev/loader-dev.user.js
// @match        https://*.bondageprojects.elementfx.com/R*/*
// @match        https://*.bondage-europe.com/R*/*
// @match        https://*.bondageprojects.com/R*/*
// @match        https://*.bondage-asia.com/club/R*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @connect      nekoemery.github.io
// ==/UserScript==

GM_xmlhttpRequest({
    method: "GET",
    url: "https://nekoemery.github.io/EmeryBC/dev/bundle.js?v=" + Date.now(),
    onload: function (res) {
        const script = document.createElement("script");
        script.textContent = res.responseText;
        document.head.appendChild(script);
    },
    onerror: function () {
        console.error("[EmeryBC] Failed to load dev bundle");
    }
});
