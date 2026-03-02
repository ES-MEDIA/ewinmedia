# Facebook Messenger Cleanup Script

سكريبت بسيط بـ Python + Playwright لحذف محادثات Messenger من حسابك الشخصي (بعد تسجيل دخولك بنفسك).

## مهم قبل الاستخدام

- استخدمه على حسابك الشخصي فقط.
- واجهة فيسبوك تتغير، فممكن تحتاج تعدّل الـ selectors لاحقاً.
- ابدأ دائماً بـ `--dry-run` قبل أي حذف فعلي.

## المتطلبات

- Python 3.10+
- Playwright

```bash
pip install playwright
playwright install chromium
```

## التشغيل

تجربة بدون حذف:

```bash
python facebook_delete_messages_playwright.py --dry-run --max-delete 20
```

حذف فعلي لأول 5 محادثات متطابقة:

```bash
python facebook_delete_messages_playwright.py --max-delete 5 --name-contains "Ahmed"
```

## ملاحظات

- السكريبت بيفتح صفحة الرسائل، وتسجّل الدخول يدويًا لو مطلوب.
- يفلتر المحادثات حسب `--name-contains` (اختياري).
- يحاول فتح قائمة الإجراءات ثم اختيار حذف المحادثة.
