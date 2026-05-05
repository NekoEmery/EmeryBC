import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";

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
    ],
};
