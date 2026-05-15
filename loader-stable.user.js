// ==UserScript==
// @name         EmeryBC (stable)
// @namespace    https://github.com/NekoEmery/EmeryBC
// @version      1.0.0
// @description  EmeryBC addon for Bondage Club — stable channel
// @downloadURL  https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader-stable.user.js
// @updateURL    https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader-stable.user.js
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
    url: "https://nekoemery.github.io/EmeryBC/stable/bundle.js?v=" + Date.now(),
    onload: function (res) {
        const script = document.createElement("script");
        script.textContent = res.responseText;
        document.head.appendChild(script);
    },
    onerror: function () {
        console.error("[EmeryBC] Failed to load stable bundle");
    }
});
