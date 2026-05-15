// ==UserScript==
// @name         EmeryBC (dev)
// @namespace    https://github.com/NekoEmery/EmeryBC
// @version      1.0.1
// @description  EmeryBC addon for Bondage Club — dev channel
// @downloadURL  https://raw.githubusercontent.com/NekoEmery/EmeryBC/dev/loader-dev.user.js
// @updateURL    https://raw.githubusercontent.com/NekoEmery/EmeryBC/dev/loader-dev.user.js
// @match        https://*.bondageprojects.elementfx.com/R*/*
// @match        https://*.bondage-europe.com/R*/*
// @match        https://*.bondageprojects.com/R*/*
// @match        https://*.bondage-asia.com/club/R*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    console.log("[EmeryBC] Loader: injecting dev bundle...");
    const script = document.createElement("script");
    script.src = "https://nekoemery.github.io/EmeryBC/dev/bundle.js?v=" + Date.now();
    script.onload = function () { console.log("[EmeryBC] Loader: bundle injected OK"); };
    script.onerror = function () { console.error("[EmeryBC] Loader: FAILED to fetch bundle"); };
    document.head.appendChild(script);
})();
