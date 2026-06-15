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
// @grant        GM_xmlhttpRequest
// @connect      do.pishock.com
// ==/UserScript==
console.log("[EmeryBC] userscript injected, waiting for BC...");`;

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
