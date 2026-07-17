# V13 Arabic PDF and Save Fix

## Changes

1. PDF terms and notes are now rendered as a single plain RTL Arabic text node instead of CSS Grid plus nested spans. This matches the client/greeting text that already rendered correctly.
2. Invisible bidi control characters copied from Word, WhatsApp, or existing PDFs are removed before rendering.
3. The PDF export clone applies explicit RTL, Arabic language, normal bidi behavior, and the Cairo/Tahoma/Arial font stack to each term line.
4. Downloading any PDF now saves the quotation into **العروض المحفوظة** automatically in the same browser.
5. Pressing the normal save button now shows a clearer confirmation message.
6. Other tabs/windows on the same laptop browser receive localStorage updates through the `storage` event.

## Important storage note

The current project stores quotations in browser `localStorage`. This means data is available to the same browser profile only. Automatic sync between a phone and a laptop requires a shared cloud database such as Supabase and user authentication.

## Verification

- `npm ci` completed successfully.
- `npm run build` completed successfully with Vite 8.1.4.
