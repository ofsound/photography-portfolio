import svelteConfig from "@sveltejs/eslint-config";

export default [
  {
    ignores: [
      ".svelte-kit/",
      ".vercel/",
      "build/",
      "dist/",
      "node_modules/",
      "static/",
    ],
  },
  ...svelteConfig,
];
