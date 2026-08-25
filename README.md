# BSS SOLUTION (1978) — เว็บไซต์บริษัท

เว็บไซต์ของ บริษัท บีเอสเอส โซลูชั่น (1978) จำกัด — รับออกแบบ ผลิต และติดตั้งระบบสายพานลำเลียง
เป็น **static site** ล้วน (ไม่มี build step) รองรับภาษาไทย/อังกฤษ

## หน้าเว็บ

| ไฟล์ | หน้า |
|---|---|
| `index.html` | หน้าแรก — ผลงาน, บริการ, ลูกค้า, FAQ |
| `about.html` | เกี่ยวกับเรา |
| `services.html` | บริการของเรา (หน้าหลักด้าน SEO) |
| `contact.html` | ติดต่อเรา + ฟอร์ม + แผนที่ |
| `articles.html` | บทความ |
| `admin.html` | แดชบอร์ดแก้ไขเนื้อหา (`noindex`, ใช้ได้เฉพาะบนเครื่อง) |

## รันบนเครื่อง

```bash
npm install
node server.js
```

เปิด http://localhost:8080

## แก้ไขเนื้อหา

**ระบบแก้ไขทำงานเฉพาะบนเครื่อง** — `server.js` เขียนไฟล์ HTML ทับลงดิสก์ ซึ่งโฮสต์อย่าง
Vercel ทำไม่ได้ (filesystem เป็น read-only) `editor.js` จึงปิดตัวเองอัตโนมัติเมื่อไม่ได้รันที่ localhost

ขั้นตอน:

1. `node server.js`
2. เปิด http://localhost:8080/admin.html แล้วเข้าสู่ระบบ
3. กด “แก้ไขหน้านี้” → แก้ข้อความ/รูป → กด **บันทึกการแก้ไข (Publish)**
   (ไฟล์เดิมถูกสำรองไว้ที่ `backups/` ทุกครั้งก่อนเขียนทับ)
4. `git add -A && git commit -m "..." && git push` → Vercel deploy ให้อัตโนมัติ

## โครงสร้างที่ต้องรู้

| ไฟล์ | หน้าที่ |
|---|---|
| `style.css` | สไตล์กลางทั้งเว็บ |
| `i18n.js` | สลับภาษา TH/EN — **ภาษาไทยใน HTML คือต้นฉบับ** ถ้าเพิ่มข้อความไทยใหม่ ต้องเพิ่มคู่คำแปลในไฟล์นี้ ไม่งั้นโหมด EN จะโชว์ไทย |
| `footer.html` + `build-footer.js` | Footer กลาง — แก้ที่ `footer.html` แล้วรัน `node build-footer.js` เพื่อปั๊มลงทุกหน้า |
| `mobile-nav.js` | เมนูแฮมเบอร์เกอร์ (≤900px) |
| `video-modal.js` | ป๊อปอัปวิดีโอแนะนำ |
| `contact-form.js` | ส่งฟอร์มติดต่อเข้า Supabase |
| `editor.js` + `server.js` | ระบบแก้ไข (local เท่านั้น) |
| `images/works/` | รูปที่เว็บใช้จริง (optimize แล้ว) |
| `images/BSS/` | รูปต้นฉบับความละเอียดสูง (ไม่ได้ deploy ขึ้นเว็บ) |

## Supabase — ฟอร์มติดต่อ

ฟอร์มในหน้า `contact.html` บันทึกลงตาราง `contact_messages`

ตั้งค่าครั้งแรก: เปิด [SQL Editor](https://supabase.com/dashboard/project/vqakoevvzrhlzqlegnpd/sql/new)
แล้วรันไฟล์ `supabase/contact_messages.sql`

คีย์ที่อยู่ใน `contact-form.js` เป็น **publishable key** ซึ่งออกแบบมาให้เปิดเผยได้
ความปลอดภัยมาจาก RLS ที่อนุญาตเฉพาะ `INSERT` — อ่านข้อมูลจากเบราว์เซอร์ไม่ได้

ดูข้อความที่ส่งเข้ามา: [Table Editor](https://supabase.com/dashboard/project/vqakoevvzrhlzqlegnpd/editor)

## Deploy

Vercel import จาก GitHub repo นี้โดยตรง — ไม่ต้องตั้งค่า build

- `vercel.json` กำหนดให้เป็น static site + security headers + cache
- `.vercelignore` กันไม่ให้ deploy รูปต้นฉบับ 44 MB และไฟล์ฝั่งเซิร์ฟเวอร์
- push ขึ้น `main` เมื่อไหร่ Vercel deploy ให้อัตโนมัติ

## SEO

- meta/Open Graph/canonical ครบทุกหน้า
- JSON-LD: LocalBusiness, Service, FAQPage, ContactPage, BreadcrumbList
- `sitemap.xml`, `robots.txt` (เปิดให้ AI crawler อย่าง GPTBot, PerplexityBot, ClaudeBot)

## เปลี่ยนโดเมน

URL แบบเต็มทุกที่ (canonical, og:url, JSON-LD `@id`, sitemap.xml, robots.txt)
ต้องชี้โดเมนเดียวกันทั้งหมด ไม่งั้น Google จะไม่รู้ว่าหน้าจริงอยู่ที่ไหน
เปลี่ยนทีเดียวจบด้วย:

```bash
node set-domain.js https://www.bsssolution1978.com
```

ปัจจุบันชี้ที่ `https://bsssolution1978.vercel.app`

## ที่ยังไม่ได้ทำ

- รหัสผ่านแอดมินฝั่งเซิร์ฟเวอร์ตั้งผ่าน env var ได้แล้ว:
  `BSS_ADMIN_PASSWORD=yourpassword node server.js` (ค่าเริ่มต้น `123456`)
- แต่ `editor.js` และ `admin.html` ยังเช็ครหัสฝั่งเบราว์เซอร์ ซึ่ง**ไม่มีทางเป็นความลับ**
  เพราะโค้ดถูกส่งไปให้ผู้ใช้อยู่แล้ว — ป้องกันได้จริงเฉพาะฝั่ง `server.js` ที่รันในเครื่อง
