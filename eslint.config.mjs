import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Design tokens guard: no hardcoded hex colors in components.
    // Colors live in src/app/globals.css as CSS vars — use var(--color-*)
    // or color-mix(in srgb, var(--token) N%, transparent) for alphas.
    // Justified exceptions (e.g. Satori/ImageResponse where CSS vars don't
    // resolve) must use an eslint-disable comment explaining why.
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            "Hardcoded hex color. Use a design token from globals.css: var(--color-*) (or color-mix for alpha variants).",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]",
          message:
            "Hardcoded hex color in template literal. Use a design token from globals.css: var(--color-*) (or color-mix for alpha variants).",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
