import globals from "globals";
import pluginJs from "@eslint/js";
import userscripts from 'eslint-plugin-userscripts';

export default [
  {
    rules: {
      'no-unused-vars': [
          'error',
          {
              argsIgnorePattern: '^_' // Pattern to ignore arguments
          }
      ]
    }
  },
  {languageOptions: { 
    globals: {
      ...globals.browser ,
      ...globals.greasemonkey,
      ...globals.jquery,
    }
  }},
  pluginJs.configs.recommended,

  // other configs
  {
    files: ['*.user.js'],
    plugins: {
      userscripts: {
        rules: userscripts.rules
      }
    },
    rules: {
      ...userscripts.configs.recommended.rules
    },
    settings: {
      userscriptVersions: {
        violentmonkey: '*',
        tampermonkey: '*'
      }
    }
  }
];