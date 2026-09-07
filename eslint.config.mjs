import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
    },
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".cloud-placeholder-backup/**",
      ".src-cloud-placeholder-backup/**",
      ".next-docs/**",
      ".next-cloud-placeholder-backup/**",
      ".node_modules-cloud-backup/**",
    ],
  },
];

export default eslintConfig;
