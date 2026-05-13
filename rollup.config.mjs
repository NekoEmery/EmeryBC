import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

// Pass --environment BUILD:production to minify (used by npm run build:prod)
const isProd = process.env.BUILD === "production";

export default {
    input: "src/main.ts",
    output: {
        file: "dist/bundle.js",
        format: "iife",
        name: "EmeryBC",
    },
    plugins: [
        resolve({ browser: true }),
        typescript(),
        ...(isProd ? [terser()] : []),
    ],
};
