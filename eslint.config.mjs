import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";

export default [
  // ✅ Ignore non-JS files
  {
    ignores: [
      "**/node_modules/**", 
      "**/dist/**", 
      "**/build/**", 
      "docs/**",
      "**/*.md", 
      "**/*.json", 
      "**/*.css"
    ],
  },

  // ✅ Only lint JS / React files
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],

    plugins: {
      js,
      react: pluginReact,
    },

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      ...js.configs.recommended.rules,          // Basic JS Rules
      ...pluginReact.configs.recommended.rules, // React-specific Rules
      "react/react-in-jsx-scope": "off",        // Not needed in modern React
      "react/display-name": "off",              // Your custom preference
    },
  },
  {
    files: ["tests/**/*.{js,mjs,cjs}", "**/*.test.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];

