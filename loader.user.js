// ==UserScript==
// @name         EmeryBC
// @namespace    https://github.com/NekoEmery/EmeryBC
// @version      0.1.8
// @description  EmeryBC addon for Bondage Club
// @downloadURL  https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader.user.js
// @updateURL    https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader.user.js
// @match        https://*.bondageprojects.elementfx.com/R*/*
// @match        https://*.bondage-europe.com/R*/*
// @match        https://*.bondageprojects.com/R*/*
// @match        https://*.bondage-asia.com/club/R*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @connect      cdn.jsdelivr.net
// ==/UserScript==

// jsDelivr serves GitHub content with application/javascript — no MIME-type block.
GM_xmlhttpRequest({
    method: "GET",
    url: "https://cdn.jsdelivr.net/gh/NekoEmery/EmeryBC@master/dist/bundle.js?v=" + Date.now(),
    onload: function (res) {
        const script = document.createElement("script");
        script.textContent = res.responseText;
        document.head.appendChild(script);
    },
    onerror: function () {
        console.error("[EmeryBC] Failed to load bundle");
    }
});
