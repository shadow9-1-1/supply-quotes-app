# Supply Quotes App V12

## Run locally

```powershell
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

## Main workflow

- Two main-company files: **AlexTrade** and **Imdad**.
- Each main company has two subsidiary company views and independent coverage additions.
- Excel downloads the current main-company sheet only.
- Personal PDF downloads the main company only.
- Quotation PDF produces the main company and both subsidiaries.
- The standalone `Download <company>` button creates the currently selected company only.
- Subsidiary quotation PDFs randomize complete item rows without separating a product from its quantity, price, or notes.
- Selling prices and sales values use half-up rounding.

## Mobile PDF fix — V12

V12 replaces the unreliable mobile export path with a mobile-safe flow:

- The document is cloned into a visible staging layer inside the browser viewport before `html2canvas` captures it. The app no longer captures the element while it is 12,000 pixels off-screen.
- `foreignObjectRendering` is disabled because it is unreliable with Safari, Arabic text, large tables, and off-screen content.
- Arabic fonts and all images are awaited before capture, and lazy image loading is disabled in the export clone.
- iPhone/iPad use a lower capture scale to stay below mobile canvas and memory limits.
- Every canvas, including the retry canvas, is checked for real non-white content before a PDF is created.
- PDFs use JPEG image data to reduce memory usage on mobile devices.
- Mobile browsers show a second explicit **Save file** step so Safari/Chrome receive a fresh user gesture after the asynchronous PDF generation finishes.
- When the quotation option contains three PDFs, mobile devices receive one ZIP file instead of three automatic downloads. Desktop behavior still downloads the separate PDFs.
- iPhone users can use **Share / Save to Files** from the generated-file dialog.

## Production build

```powershell
npm run build
npm run preview
```

Deploy the newly generated `dist` folder or connect the project root to Vercel and use `npm run build` as the build command.
