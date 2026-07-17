# Mobile PDF Fix — V12

## العربية

تم إصلاح مشكلة ملفات PDF البيضاء على iPhone وAndroid من داخل الكود نفسه:

1. لم يعد `html2canvas` يصوّر العنصر وهو موجود عند `left: -12000px`. يتم إنشاء نسخة مؤقتة داخل الـviewport ثم تصويرها.
2. تم تعطيل `foreignObjectRendering` لأنه غير مستقر على Safari ومع العربية وRTL.
3. ينتظر التطبيق تحميل الخطوط والصور بالكامل قبل التصوير، ويحوّل الصور إلى eager loading داخل نسخة التصدير.
4. تم تقليل `scale` على iPhone وAndroid لتجنب حدود الذاكرة وحجم Canvas.
5. يتم فحص الـCanvas بعد المحاولة الأولى وبعد محاولة الـfallback، ولن يتم إنشاء PDF إذا كانت الصورة بيضاء.
6. تم استخدام JPEG داخل PDF لتقليل استهلاك الذاكرة على الموبايل.
7. بعد تجهيز الملف على الهاتف يظهر مربع يحتوي على زر **حفظ الملف** وزر **مشاركة / حفظ في الملفات**. الضغط الثاني يوفر User Gesture جديدًا يحتاجه Safari وChrome.
8. عند إنشاء عروض الشركات الثلاث على الموبايل، يتم وضع ملفات PDF الثلاثة داخل ZIP واحد بدل تشغيل ثلاثة تنزيلات تلقائية.

## English

The mobile blank-PDF issue was fixed in the application code:

1. `html2canvas` no longer captures the document while it is positioned at `left: -12000px`. A temporary in-viewport clone is created and captured.
2. `foreignObjectRendering` is disabled because it is unreliable on Safari and with Arabic/RTL layouts.
3. Fonts and images are fully awaited, and export images are forced to eager loading.
4. Mobile capture scale is reduced to stay within canvas and memory limits.
5. Both the initial canvas and fallback canvas are checked for real non-white content.
6. JPEG data is used inside the PDF to reduce mobile memory pressure.
7. Mobile devices receive an explicit second **Save file** action, restoring a fresh browser user gesture after asynchronous generation.
8. The three quotation PDFs are packaged into one ZIP on mobile to avoid multiple-download blocking.
