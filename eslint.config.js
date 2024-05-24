module.exports = {
  files: ["**/*.ts", "**/*.tsx"],
  plugins: {
    "@typescript-eslint": {
      "@rocketseat/eslint-config/node": "^0.6.0",
    }
  },
  rules: {
    "no-unused-vars": ["error"],
    "no-console": ["warn"],
  }
};