import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
    // Obsidian recommended rules
    ...obsidianmd.configs.recommended,

    // TypeScript files configuration
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.json",
            },
            globals: {
                ...globals.node,
                ...globals.browser,
            },
        },
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            // React hooks rules
            ...reactHooks.configs.recommended.rules,

            // Disable some rules as needed
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "no-prototype-builtins": "off",
            "@typescript-eslint/no-empty-function": "off",
            // These are optional/less critical for initial release
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
        },
    },

    // Disable ban-dependencies for package.json
    {
        files: ["package.json"],
        rules: {
            "depend/ban-dependencies": "off",
        },
    },

    // Ignore patterns
    {
        ignores: ["main.js", "node_modules/**", "*.mjs", "naz-ref/**"],
    }
);

