import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import { readFileSync } from "fs";

// Pass --environment BUILD:production to minify (used by npm run build:prod)
const isProd = process.env.BUILD === "production";
const channel = isProd ? "stable" : "dev";
const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
const baseUrl = `https://nekoemery.github.io/EmeryBC/${channel}`;

// pageBridge runs in page context before the bundle IIFE.
// When @inject-into page is set the unsafeWindow guard returns early and this is a no-op,
// but it's harmless to keep so the bridge is ready if the inject mode ever changes.
const pageBridge = `\
(function(){
  var uw=typeof unsafeWindow!=="undefined"?unsafeWindow:null;
  if(!uw||uw===window)return;
  try{Object.defineProperty(globalThis,"window",{get:function(){return uw},configurable:true})}catch(e){}
  ["Player","ChatRoomCharacter","ChatRoomData","ChatRoomMenuDraw","CurrentScreen",
   "ServerPlayerExtensionSettingsSync","ServerPlayerAppearanceSync","ServerAccountBeep",
   "ServerSend","ChatRoomCharacterUpdate","CharacterRefresh","CharacterNickname",
   "CharacterCanChangeTalk","CharacterGetCurrentName","PreferenceInitPlayer","CommonSetScreen",
   "ChatRoomSendChat","ChatRoomKeyDown","DrawProcess","DrawCharacter","DrawArousalMeter",
   "InventoryRemove","ChatRoomSync","ChatRoomSyncItem","ChatRoomSyncSingle",
   "ChatRoomSyncMemberJoin","ChatRoomSyncMemberLeave","ChatRoomMessage","ChatRoomSendWhisper",
   "ChatRoomSearchResult","ChatRoomRun","ChatRoomClick","ChatRoomLeave",
   "ServerSendBeepMessage","FriendListBeep","AccountQueryResult","TextGet","bcModSdk"
  ].forEach(function(k){
    if(Object.prototype.hasOwnProperty.call(globalThis,k))return;
    try{Object.defineProperty(globalThis,k,{get:function(){return uw[k]},set:function(v){uw[k]=v},configurable:true,enumerable:false})}catch(e){}
  });
})();`;

const userscriptBanner = `\
// ==UserScript==
// @name         EmeryBC (${channel})
// @namespace    https://github.com/NekoEmery/EmeryBC
// @version      ${pkg.version}
// @description  EmeryBC addon for Bondage Club — ${channel} channel
// @author       Emery
// @downloadURL  ${baseUrl}/bundle.user.js
// @updateURL    ${baseUrl}/bundle.user.js
// @match        https://www.bondage-europe.com/*
// @match        https://bondage-europe.com/*
// @match        https://www.bondageprojects.elementfx.com/*
// @match        https://www.bondageprojects.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==
console.log("[EmeryBC] userscript injected, waiting for BC...");
${pageBridge}`;

export default {
    input: "src/main.ts",
    output: [
        {
            file: "dist/bundle.js",
            format: "iife",
            name: "EmeryBC",
        },
        {
            file: "dist/bundle.user.js",
            format: "iife",
            name: "EmeryBC",
            banner: userscriptBanner,
        },
    ],
    plugins: [
        resolve({ browser: true }),
        commonjs(),
        typescript(),
        ...(isProd ? [terser()] : []),
    ],
};
