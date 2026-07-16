# Supply Quotes App V11

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
- Quotation PDF downloads the main company and both subsidiaries.
- The standalone `Download <company>` button downloads the currently selected company only.
- Subsidiary quotation PDFs randomize complete item rows without separating a product from its quantity, price, or notes.
- Selling prices and sales values use half-up rounding.

## Mobile PDF fix

V11 enforces Arabic RTL isolation and normal letter spacing during export. On iPhone and iPad, PDF capture uses the browser's native foreign-object renderer first, with a safe fallback to the standard renderer. This prevents long Arabic terms and notes from appearing in a mixed or reversed word order after deployment.

## Production build

```powershell
npm run build
npm run preview
```
