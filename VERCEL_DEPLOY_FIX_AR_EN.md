# Vercel dependency-install fix

## العربية

فشل النشر لم يكن بسبب كود الـ PDF أو بسبب Vercel. كان ملف `package-lock.json` يحتوي 13 رابط تنزيل يشير إلى مستودع داخلي خاص ببيئة الإنشاء، مثل:

`packages.applied-caas-gateway1.internal.api.openai.org`

هذا العنوان غير متاح من خوادم Vercel، لذلك ظهر الخطأ `EHOSTUNREACH`.

تم تنفيذ الآتي:

- استبدال جميع الروابط الداخلية بروابط `https://registry.npmjs.org/` الرسمية.
- إضافة ملف `.npmrc` على مستوى المشروع لتحديد npm registry الرسمي.
- تشغيل `npm ci` بنجاح: تم تثبيت 107 حزم.
- تشغيل `npm run build` بنجاح باستخدام Vite 8.1.4.

تحذير Recharts وتحذير حجم JavaScript لا يمنعان النشر.

## English

The deployment failure was not caused by the PDF code or Vercel. The generated `package-lock.json` contained 13 package tarball URLs pointing to an internal build-environment registry:

`packages.applied-caas-gateway1.internal.api.openai.org`

That host is inaccessible from Vercel, which caused the `EHOSTUNREACH` install failure.

Applied fixes:

- Replaced every internal tarball URL with the official `https://registry.npmjs.org/` registry URL.
- Added a project-level `.npmrc` that explicitly selects the public npm registry.
- Verified a clean `npm ci` installation: 107 packages installed.
- Verified `npm run build` successfully with Vite 8.1.4.

The Recharts deprecation message and JavaScript chunk-size message are warnings, not deployment failures.
