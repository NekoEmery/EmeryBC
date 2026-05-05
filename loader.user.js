// ==UserScript==
// @name         EmeryBC
// @namespace    https://github.com/NekoEmery/EmeryBC
// @version      0.1.0
// @description  EmeryBC addon for Bondage Club
// @downloadURL  https://raw.githubusercontent.com/NekoEmery/EmeryBC/main/loader.user.js
// @updateURL    https://raw.githubusercontent.com/NekoEmery/EmeryBC/main/loader.user.js
// @match        https://*.bondageprojects.elementfx.com/R*/*
// @match        https://*.bondage-europe.com/R*/*
// @match        https://*.bondageprojects.com/R*/*
// @match        https://*.bondage-asia.com/club/R*
// @run-at       document-end
// @grant        none
// ==/UserScript==

import(
    `https://raw.githubusercontent.com/NekoEmery/EmeryBC/main/dist/bundle.js?v=${(
        Date.now() / 10000
    ).toFixed(0)}`
);
