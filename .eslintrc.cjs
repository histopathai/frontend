module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true, //  Modern ES features
    'vue/setup-compiler-macros': true // For defineProps/defineEmits like macros
  },
  extends: [
    'plugin:vue/vue3-recommended', // Recommended rules for Vue 3
    'eslint:recommended', // Basic ESLint rules
    '@vue/eslint-config-typescript/recommended', // Recommended for TypeScript
    'eslint-config-prettier' // IMPORTANT: Disables rules that conflict with Prettier
  ],
  parser: 'vue-eslint-parser', // To parse .vue files
  parserOptions: {
    parser: '@typescript-eslint/parser', // To parse TS code inside <script>
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'vue/multi-word-component-names': 'off', // its ok to have single-word component names
    'semi': ['error', 'always'], // always use semicolons
    'quotes': ['error', 'single'], // always use single quotes
    '@typescript-eslint/no-explicit-any': 'warn' // 'any' type is a warning, not an error
  }
};