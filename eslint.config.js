import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// ESLint 9 не видит, что переменная использована в JSX (<Icon />, <motion.div>), и считает её
// лишней. Правило отмечает такие имена использованными — как react/jsx-uses-vars, без всего плагина.
const jsxUsesVars = {
  meta: { type: 'problem', schema: [] },
  create(context) {
    return {
      JSXOpeningElement(node) {
        let name = node.name
        if (name.type === 'JSXNamespacedName') return
        if (name.type === 'JSXIdentifier' && /^[a-z]/.test(name.name)) return // <div>, <svg>
        while (name.type === 'JSXMemberExpression') name = name.object
        if (name.type === 'JSXIdentifier') context.sourceCode.markVariableAsUsed(name.name, node)
      },
    }
  },
}

export default defineConfig([
  // .cursor и .impeccable — инструменты редактора со сторонними скриптами, а не код приложения.
  globalIgnores(['dist', 'coverage', '.cursor', '.impeccable']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      local: { rules: { 'jsx-uses-vars': jsxUsesVars } },
    },
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'local/jsx-uses-vars': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // Пустой catch — осознанное «не получилось, и ладно» (localStorage, необязательные запросы).
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
])
