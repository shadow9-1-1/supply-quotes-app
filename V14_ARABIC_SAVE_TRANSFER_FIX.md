# V14 Arabic PDF + Save/Transfer Fix

## What changed

1. **Arabic terms are no longer left for html2canvas to shape.**
   Before PDF capture, each condition/note line is rendered to a native browser `<canvas>` using RTL text rendering. html2canvas only copies the completed pixels, preventing disconnected or reversed Arabic letters.

2. **Terms use the same simple paragraph layout as the correct client block.**
   No grid, split bidi spans, or separate Arabic fragments are used.

3. **Saving is verified immediately.**
   The app writes all fields to `localStorage`, reads the saved quotation back, and confirms filename, client, attention, date, and subject.

4. **Stale React state can no longer overwrite a recent save.**
   The save action merges against the latest copy already stored in the browser.

5. **Phone-to-laptop transfer without a database.**
   Use **نقل العرض للابتوب**. The generated link contains the quotation in the URL hash. Open it on the laptop; the app imports and saves all quotation fields automatically.

## Important storage note

Normal browser storage is tied to one browser origin/device. A phone and laptop cannot automatically share `localStorage`. The new transfer-link feature provides a working cross-device method without requiring Supabase or another database.

For automatic multi-device synchronization without sharing a link, a cloud database and user authentication are required.

## Verification

- `npm ci` completed successfully.
- `npm run build` completed successfully with Vite 8.1.4.
- `package-lock.json` contains no internal OpenAI package registry links.
