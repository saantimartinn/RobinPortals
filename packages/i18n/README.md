# Client portal languages

Portal, Robin Jr, Community and Arrival Pack share this browser-only translation package. Spanish remains the default. The header selector stores `es` or `en` in the same-origin `robin_language` localStorage key; open tabs react to storage changes. If storage is blocked, switching still works for the current session.

Use the original Spanish interface copy as a key in `en.json`. In React components, import `t` and `useLocale` from `react.jsx`, call `useLocale()` at the start of the component and render `t('Mis pagos')`. Components subscribe without remounting, so switching preserves form state. Use `getLocale()` for displayed dates and numbers; keep machine date keys, time zones and stored enum values unchanged.

Use numbered placeholders for dynamic copy: `t('Hola, {0}', [name])`. Add every placeholder to both languages. Translate questionnaire option **labels**, never their submitted values. Names, messages, uploaded files and other user-authored content must retain their original text. Built-in FAQs and contract templates have explicit catalogue entries; contract substitutions and canonical server documents keep their existing structure.

The application shell calls `setTranslationsEnabled(false)` for staff sessions. This keeps administration in Spanish while retaining the client's saved preference for their next session.

Validate changes from the repository root:

```sh
node --test site/test/i18n.test.mjs site/test/portal-languages.test.cjs
```

Also build all three client frontends and run the relevant app tests. The catalogue tests cover questionnaire labels, built-in FAQs, current and historical contracts, interpolation, storage and administration language scope.
