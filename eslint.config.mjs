import globals from "globals";
import pluginJs from "@eslint/js";
import userscripts from 'eslint-plugin-userscripts';

export default [
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