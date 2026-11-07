# بناء تطبيق HETAR Pro (APK)

الشرط: جهاز عليه Node 20+ وحساب Expo (eas).

```
npm install -g eas-cli
npm install
eas login
eas build -p android --profile preview      # APK للتجربة
eas build -p android --profile production   # APK نهائي
```

ملاحظات:
- تم إصلاح package.json (إزالة catalog/workspace وحزم غير مستخدمة).
- الإصدار في app.json = 1.0.6 و versionCode = 6؛ الرقم 2.3.0 المعروض داخل التطبيق نص ثابت.
- لم أستطع تشغيل البناء داخل بيئتي (لا إنترنت)، فإن ظهر خطأ أثناء npm install أرسله لي.
