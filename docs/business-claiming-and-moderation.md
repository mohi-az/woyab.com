# Business Claiming, Edit Suggestions, Moderation, and Public Removal

This document describes the implemented business ownership claiming, edit suggestion, moderation, and public removal system in Fargo.

- [فارسی](#نسخهٔ-فارسی)
- [English](#english-version)

---

## نسخهٔ فارسی

### نمای کلی

سیستم مدیریت کسب‌وکار به‌گونه‌ای پیاده‌سازی شده است که مالک، کارمند و مشتری بتوانند با سطح دسترسی مشخص با صفحهٔ یک کسب‌وکار تعامل داشته باشند. هیچ ویرایشی مستقیماً منتشر نمی‌شود و تغییرات محتوایی قبل از انتشار به تأیید ادمین نیاز دارند.

### ۱. ثبت مالکیت کسب‌وکار

- دکمهٔ «ویرایش کسب‌وکار» در صفحهٔ عمومی سه گزینهٔ مالک، کارمند و مشتری را نمایش می‌دهد.
- کاربری که گزینهٔ مالک را انتخاب می‌کند باید ابتدا وارد حساب خود شود.
- فرم ثبت مالکیت شامل نام کامل، ایمیل حساب به‌صورت غیرقابل ویرایش، ایمیل رسمی کسب‌وکار و لینک رسمی اختیاری است.
- کاربر باید شرایط استفاده برای کسب‌وکارها را بپذیرد و مطالعهٔ Privacy Notice را تأیید کند. تأیید مطالعهٔ Privacy Notice به‌عنوان رضایت اختیاری GDPR معرفی نمی‌شود.
- شمارهٔ تلفن یا اطلاعات اضافی غیرضروری دریافت نمی‌شود.
- ایمیل رسمی نرمال‌سازی و دامنهٔ آن با DNS بررسی می‌شود. استفاده از Gmail مجاز است.
- لینک اختیاری باید HTTPS معتبر باشد و سرور برای بررسی مالکیت هیچ درخواستی به آن ارسال نمی‌کند.

### ۲. تأیید ایمیل با OTP

- یک کد شش‌رقمی با مولد رمزنگاری امن تولید می‌شود.
- کد فقط به ایمیل رسمی واردشده برای کسب‌وکار ارسال می‌شود، نه ایمیل حساب کاربر.
- کد خام در دیتابیس ذخیره نمی‌شود و فقط hash آن نگهداری می‌شود.
- هر کد ۱۰ دقیقه اعتبار دارد.
- پس از سه بار ورود کد اشتباه، درخواست به‌مدت ۱۰ دقیقه مسدود می‌شود.
- ارسال مجدد کد حداقل ۶۰ ثانیه فاصله دارد و حداکثر سه ارسال در بازهٔ ۳۰ دقیقه مجاز است.
- ارسال کد جدید، کد قبلی را باطل می‌کند.
- ایمیل ارسالی شامل نام کسب‌وکار، نام درخواست‌دهنده، کد تأیید و هشدار امنیتی است.

### ۳. تصمیم‌گیری دربارهٔ Claim

- اگر کسب‌وکار مالک نداشته باشد و ایمیل تأییدشده دقیقاً با ایمیل فعلی ثبت‌شدهٔ کسب‌وکار برابر باشد، Claim خودکار تأیید می‌شود.
- پس از تأیید خودکار، کاربر به‌عنوان مالک کسب‌وکار ثبت و نقش او به Owner ارتقا داده می‌شود.
- اگر ایمیل جدید یا Gmail باشد، درخواست بعد از تأیید OTP به صف بررسی ادمین منتقل می‌شود.
- اگر کسب‌وکار قبلاً مالک داشته باشد، Claim جدید فقط با تصمیم صریح ادمین قابل تأیید است.
- تأیید Claim رقیب نیازمند دلیل ثبت‌شده، audit log و اعلان به مالک قبلی و مالک جدید است.
- هیچ API یا رابط کاربری برای انتقال مستقیم مالکیت توسط مالک ایجاد نشده است.

### ۴. پیشنهاد ویرایش

- مالک، کارمند و مشتری می‌توانند پیشنهاد تغییر ساختاریافته ارسال کنند.
- پیشنهاد می‌تواند اطلاعات پایه، ترجمه‌ها، دسته‌بندی، اطلاعات تماس، آدرس، موقعیت، ساعات کاری، ویژگی‌ها، برچسب‌ها و خدمات را پوشش دهد.
- هیچ پیشنهاد تغییری مستقیماً روی کسب‌وکار اعمال نمی‌شود.
- هنگام ثبت درخواست، snapshot وضعیت فعلی و زمان آخرین تغییر کسب‌وکار ذخیره می‌شود.
- اگر کسب‌وکار پیش از تصمیم ادمین تغییر کرده باشد، درخواست با خطای `STALE_CHANGE_REQUEST` متوقف می‌شود و باید دوباره بررسی شود.
- ادمین تفاوت اطلاعات قبلی و پیشنهادی را می‌بیند و می‌تواند درخواست را تأیید و اعمال کند یا با ذکر دلیل رد کند.
- اعمال درخواست تأییدشده به‌صورت تراکنشی انجام می‌شود و audit آن نگهداری می‌شود.

### ۵. خدمات و منو

- مدیریت خدمات از مدل فعلی `Service` استفاده می‌کند.
- مالک می‌تواند درخواست ایجاد، ویرایش یا غیرفعال‌کردن یک خدمت را ثبت کند.
- تغییرات خدمات فقط بعد از تأیید ادمین اعمال می‌شوند.
- خدمات فعال در صفحهٔ عمومی کسب‌وکار نمایش داده می‌شوند.
- ویرایش یا آپلود تصویر در این مرحله اضافه نشده است و تصاویر Google Places بدون تغییر باقی می‌مانند.

### ۶. حذف از دید عمومی و بازیابی

- مالک باید نام دقیق کسب‌وکار را برای تأیید عملیات وارد کند.
- حذف به‌صورت Soft Removal انجام می‌شود و وضعیت تجاری کسب‌وکار تغییر نمی‌کند.
- کسب‌وکار بلافاصله از صفحهٔ عمومی، نتایج جستجو، نقشه و مسیرهای عمومی وابسته پنهان می‌شود.
- خدمات، نظرات، علاقه‌مندی‌ها، تماس، آمار بازدید و تصاویر مرتبط با کسب‌وکار حذف‌شده نیز از مسیر عمومی قابل دسترسی نیستند.
- مراجعهٔ مستقیم به صفحهٔ کسب‌وکار حذف‌شده پاسخ 404 دریافت می‌کند.
- مالک فعلی یا ادمین می‌تواند کسب‌وکار را بازیابی کند.
- پس از حذف، پیام زیر نمایش داده می‌شود:

> Your business has been removed from public view. You may restore it anytime.

- Soft Removal به‌عنوان حذف دادهٔ شخصی تحت مادهٔ ۱۷ GDPR معرفی نمی‌شود. درخواست حذف دادهٔ شخصی مسیر حقوقی جداگانه و بررسی موردی دارد.

### ۷. امنیت API

- API عمومی Express برای کسب‌وکارها و خدمات فقط خواندنی شده است.
- مسیرهای عمومی و بدون احراز هویت برای ایجاد، ویرایش یا حذف مستقیم کسب‌وکار و خدمات بسته شده‌اند.
- عملیات مدیریتی فقط از مسیرهای server-side در Next.js و بعد از بررسی Auth.js، مالکیت یا نقش ادمین انجام می‌شوند.
- مسیر دریافت تصاویر Google Places به کسب‌وکار مرتبط شده است تا تصاویر کسب‌وکار حذف‌شده یا reference نامعتبر منتشر نشوند.
- خطاهای پایدار برای وضعیت‌هایی مانند نیاز به ورود، کد اشتباه یا منقضی، مسدودی OTP، شکست ارسال ایمیل، Claim فعال، بررسی مالک و کسب‌وکار حذف‌شده تعریف شده‌اند.

### ۸. ورود و بازگشت امن کاربر

- معماری احراز هویت فعلی Auth.js حفظ شده است.
- ورود دستی و Google OAuth متصل به Firebase پشتیبانی می‌شوند و Firebase session جداگانه ساخته نمی‌شود.
- اگر کاربر برای Claim به صفحهٔ ورود یا ثبت‌نام هدایت شود، `callbackUrl` امن باعث می‌شود بعد از ورود به همان صفحهٔ کسب‌وکار بازگردد.

### ۹. حریم خصوصی و نگهداری داده

- Privacy Notice مخصوص Claim به فارسی، انگلیسی و آلمانی اضافه شده است.
- نام حقوقی controller، نشانی، ایمیل حریم خصوصی، مرجع نظارتی و نسخهٔ notice از تنظیمات deployment دریافت می‌شوند.
- production در صورت خالی‌بودن تنظیمات حقوقی یا SMTP ضروری اجرا نمی‌شود.
- Claimهای منقضی یا لغوشده برای بازبینی نگهداری و پس از ۹۰ روز آمادهٔ anonymization می‌شوند.
- Claimهای ردشده و Change Requestهای بسته‌شده پس از ۱۸۰ روز وارد صف بازبینی retention می‌شوند.
- Claim تأییدشده تا پایان مالکیت نگهداری می‌شود و پس از آن دورهٔ استاندارد سه‌سالهٔ دعاوی آلمان در محاسبهٔ retention لحاظ می‌شود.
- پنل Retention Review برای مشاهدهٔ موارد سررسیدشده، anonymization و Legal Hold محدود و دارای دلیل اضافه شده است.
- Legal Hold نامحدود مجاز نیست.
- hash کد OTP پس از پایان یا انقضای Claim پاک می‌شود.

### ۱۰. دیتابیس و مدل‌ها

- مدل `BusinessClaim` با وضعیت‌های کامل Claim، اطلاعات OTP، verification، retention و audit توسعه یافته است.
- مدل `BusinessChangeRequest` برای ثبت درخواست‌دهنده، نقش، payload نسخه‌بندی‌شده، snapshot، reviewer، نتیجه و زمان‌های audit اضافه شده است.
- فیلدهای `removedAt`، `removedById` و `restoredAt` به مدل Business اضافه شده‌اند.
- migration مربوط به این تغییرات ایجاد و روی دیتابیس development اعمال شده است.
- Claimهای قدیمی با وضعیت `PENDING` در migration به `UNDER_REVIEW` منتقل می‌شوند.

### ۱۱. مسیرهای اصلی اضافه‌شده

- `POST /api/business-claims`
- `GET /api/business-claims/[id]`
- `POST /api/business-claims/[id]/verify`
- `POST /api/business-claims/[id]/resend`
- `POST /api/business-change-requests`
- `POST /api/businesses/[id]/remove`
- `POST /api/businesses/[id]/restore`

### ۱۲. بررسی‌های فنی انجام‌شده

- Prisma schema validation و Prisma Client generation موفق بودند.
- migration روی دیتابیس development اعمال شد و `prisma migrate status` به‌روز است.
- TypeScript برای frontend و API بدون خطا اجرا شد.
- ESLint برای frontend و API بدون خطا اجرا شد.
- تمام تست‌های جدید Claim policy و محدودسازی API عمومی موفق بودند.
- build نسخهٔ production موفق بود.
- فایل‌های ترجمهٔ فارسی، انگلیسی و آلمانی با موفقیت parse شدند.
- `git diff --check` موفق بود و فقط هشدار معمول LF/CRLF ویندوز نمایش داده شد.
- تغییرات قبلی cookie و privacy در working tree حفظ و با قابلیت‌های جدید ترکیب شدند.

### ۱۳. الزامات پیش از انتشار

- مقادیر واقعی SMTP باید در environment مربوط به production تنظیم شوند.
- اطلاعات controller، نشانی، ایمیل privacy، مرجع نظارتی و نسخهٔ Privacy Notice باید تکمیل شوند.
- یک `CRON_SECRET` امن باید تعریف و maintenance job مربوط به Claimها زمان‌بندی شود.
- متن Privacy Notice و برنامهٔ retention باید پیش از انتشار توسط مشاور حقوقی آلمان بازبینی شوند.
- این پیاده‌سازی یک راهکار فنی است و به‌تنهایی تضمین‌کنندهٔ انطباق حقوقی کامل نیست.

---

## English version

### Overview

The business management system allows owners, employees, and customers to interact with a business page through clearly separated permission levels. Content changes are never published directly and must be reviewed by an administrator before they are applied.

### 1. Business ownership claiming

- The public “Edit Business” button presents Owner, Employee, and Customer options.
- A user selecting Owner must sign in before starting a claim.
- The claim form contains the full name, read-only account email, official business email, and an optional official link.
- The user must accept the Business Terms of Use and acknowledge the Privacy Notice. Acknowledging the Privacy Notice is not presented as optional GDPR consent.
- No phone number or unnecessary personal information is collected.
- The official email is normalized and its domain is validated through DNS. Gmail addresses are allowed.
- The optional evidence link must be a valid HTTPS URL. The server does not request the URL to establish ownership.

### 2. OTP email verification

- A six-digit OTP is created using a cryptographically secure generator.
- The OTP is sent only to the submitted official business email, not the user's account email.
- The raw OTP is never stored. Only its hash is persisted.
- Each OTP is valid for 10 minutes.
- Three incorrect attempts block the claim for 10 minutes.
- Resends have a minimum 60-second cooldown and a maximum of three sends within 30 minutes.
- Sending a new OTP invalidates the previous code.
- The email includes the business name, claimant name, OTP, and the required security warning.

### 3. Claim decision policy

- If the business has no owner and the verified email exactly matches the business's existing email, the claim is approved automatically.
- Automatic approval assigns the business owner and promotes the user to the Owner role.
- A new email address or Gmail address moves the verified claim to administrator review.
- A claim for a business that already has an owner can only be approved by an explicit administrator decision.
- Approving a competing claim requires a recorded reason, an audit entry, and notifications to the previous and new owners.
- No owner-facing ownership transfer API or user interface was added.

### 4. Edit suggestions

- Owners, employees, and customers can submit structured change requests.
- Requests can cover basic information, translations, category, contact details, address, location, opening hours, attributes, tags, and services.
- No submitted change is applied directly.
- The current business snapshot and `businessUpdatedAt` value are stored with each request.
- If the business changes before review, applying the request stops with `STALE_CHANGE_REQUEST` and requires another review.
- Administrators can inspect the before-and-after difference, approve and apply the request, or reject it with a reason.
- Approved changes are applied transactionally and recorded in the audit trail.

### 5. Services and menus

- Service management uses the existing `Service` model.
- Owners can request the creation, modification, or deactivation of a service.
- Service changes are applied only after administrator approval.
- Active services are displayed on the public business page.
- Image editing and uploads are outside this phase. Existing Google Places images remain unchanged.

### 6. Public removal and restoration

- The owner must enter the exact business name to confirm removal.
- Removal is implemented as a soft removal and does not change the business's commercial status.
- The business is immediately hidden from its public page, search results, map, and related public surfaces.
- Services, reviews, favorites, contact, view analytics, and business-bound images are no longer publicly accessible for a removed business.
- Direct visits to a removed business return a 404 response.
- The current owner or an administrator can restore the business.
- The following confirmation message is displayed:

> Your business has been removed from public view. You may restore it anytime.

- Soft removal is not described as erasure of personal data under GDPR Article 17. Personal-data erasure requests follow a separate legal review process.

### 7. API security

- The public Express business and service API surface is read-only.
- Unauthenticated public endpoints for directly creating, updating, or deleting businesses and services have been removed or blocked.
- Management mutations run only through Next.js server-side routes after Auth.js, ownership, or administrator-role checks.
- The Google Places photo endpoint is now business-bound so removed businesses and unrelated photo references cannot be exposed.
- Stable error codes cover authentication, invalid or expired OTPs, OTP blocking, email delivery failure, active claims, required owner review, stale requests, and removed businesses.

### 8. Authentication and safe return flow

- The existing Auth.js architecture remains in use.
- Manual sign-in and Google OAuth connected to Firebase are supported without creating a separate Firebase session.
- When a user is redirected to login or registration from a claim, a validated `callbackUrl` returns them to the same business page after authentication.

### 9. Privacy and data retention

- A claim-specific Privacy Notice is available in English, German, and Persian.
- The legal controller name, address, privacy email, supervisory authority, and notice version come from deployment configuration.
- Production fails fast when mandatory legal or SMTP configuration is missing.
- Expired or cancelled claims become eligible for retention review and anonymization after 90 days.
- Rejected claims and closed change requests become eligible after 180 days.
- Approved claims are retained for the duration of ownership. After ownership ends, the standard three-year German limitation schedule is considered.
- An administrator Retention Review queue supports due-item review, anonymization, and reasoned, time-limited legal holds.
- Indefinite legal holds are not permitted.
- OTP hashes are cleared when a claim ends or expires.

### 10. Database and models

- `BusinessClaim` was expanded with complete claim statuses, OTP controls, verification fields, retention metadata, and auditing data.
- `BusinessChangeRequest` was added for requester identity and role, versioned payloads, snapshots, reviewer decisions, and audit timestamps.
- `removedAt`, `removedById`, and `restoredAt` were added to Business.
- A migration covering these changes was created and applied to the development database.
- Legacy claims with the `PENDING` status are migrated to `UNDER_REVIEW`.

### 11. Main added endpoints

- `POST /api/business-claims`
- `GET /api/business-claims/[id]`
- `POST /api/business-claims/[id]/verify`
- `POST /api/business-claims/[id]/resend`
- `POST /api/business-change-requests`
- `POST /api/businesses/[id]/remove`
- `POST /api/businesses/[id]/restore`

### 12. Completed technical verification

- Prisma schema validation and Prisma Client generation passed.
- The migration was applied to the development database and Prisma migration status is current.
- Frontend and API TypeScript checks passed.
- Frontend and API ESLint checks passed.
- All newly added claim-policy and public-API regression tests passed.
- The production build passed.
- English, German, and Persian translation files parsed successfully.
- `git diff --check` passed, with only the normal Windows LF/CRLF warnings.
- Existing cookie and privacy worktree changes were preserved and merged with the new implementation.

### 13. Requirements before production release

- Configure real SMTP values in the production environment.
- Complete the controller name, address, privacy email, supervisory authority, and Privacy Notice version.
- Define a secure `CRON_SECRET` and schedule the claim maintenance job.
- Have German legal counsel review the Privacy Notice and retention schedule before release.
- This implementation provides technical controls and does not by itself guarantee complete legal compliance.
