// ==UserScript==
// @name         EmeryBC
// @namespace    https://github.com/NekoEmery/EmeryBC
// @version      0.1.9
// @description  EmeryBC addon for Bondage Club
// @downloadURL  https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader.user.js
// @updateURL    https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader.user.js
// @match        https://*.bondageprojects.elementfx.com/R*/*
// @match        https://*.bondage-europe.com/R*/*
// @match        https://*.bondageprojects.com/R*/*
// @match        https://*.bondage-asia.com/club/R*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @connect      nekoemery.github.io
// ==/UserScript==

// Served from GitHub Pages — correct MIME type, no CDN cache surprises.
GM_xmlhttpRequest({
    method: "GET",
    url: "https://nekoemery.github.io/EmeryBC/stable/bundle.js?v=" + Date.now(),
    onload: function (res) {
        const script = document.createElement("script");
        script.textContent = res.responseText;
        document.head.appendChild(script);
    },
    onerror: function () {
        console.error("[EmeryBC] Failed to load bundle");
    }
});
