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

แก้ได้ 2 ทาง ใช้หน้า `admin.html` เหมือนกัน ต่างกันแค่ปลายทางที่บันทึก

### แก้จากเว็บจริง (แนะนำ)

https://bsssolution1978.vercel.app/admin.html

Vercel เขียนไฟล์ทับไม่ได้ (filesystem เป็น read-only) ระบบจึงใช้วิธี commit
ไฟล์กลับเข้า GitHub ผ่าน `api/publish.js` แล้ว Vercel จะ deploy ให้เอง —
**หน้าเว็บจริงอัปเดตในราว 1 นาทีหลังกดบันทึก** ทุกครั้งที่บันทึกจะมีประวัติใน
GitHub ย้อนกลับได้

ต้องตั้ง Environment Variables ใน Vercel ก่อน (Settings → Environment Variables)
แล้ว **Redeploy หนึ่งครั้ง**:

| ตัวแปร | ค่า |
|---|---|
| `BSS_ADMIN_PASSWORD` | รหัสผ่านแอดมิน — **ตั้งให้ยาวอย่างน้อย 16 ตัว** |
| `GITHUB_TOKEN` | Fine-grained token สิทธิ์ `Contents: Read and write` เฉพาะ repo นี้ |
| `GITHUB_REPO` | (ไม่ใส่ก็ได้) ค่าเริ่มต้น `mktbwp328-arch/BSS-Solution` |
| `GITHUB_BRANCH` | (ไม่ใส่ก็ได้) ค่าเริ่มต้น `main` |

เช็คว่าตั้งครบหรือยัง: เปิด `/api/status` — ต้องได้ `"remoteEditing": true`

### แก้บนเครื่อง

1. `node server.js`
2. เปิด http://localhost:8080/admin.html
3. แก้ → กด **บันทึกการแก้ไข (Publish)** → เขียนไฟล์ลงดิสก์ทันที
   (สำรองไฟล์เดิมไว้ที่ `backups/` ทุกครั้ง)
4. `git add -A && git commit -m "..." && git push` → Vercel deploy ให้อัตโนมัติ

รหัสผ่านอ่านจากไฟล์ `.env` ที่รากโปรเจกต์ (ดูตัวอย่างที่ `.env.example`)

```
BSS_ADMIN_PASSWORD=รหัสผ่านของคุณ
```

**`.env` ไม่ถูก commit ขึ้น GitHub** — repo นี้เป็น public ถ้าเขียนรหัสลงในโค้ด
จะกลายเป็นสาธารณะทันที ถ้าไม่มีไฟล์ `.env` เซิร์ฟเวอร์จะใช้ `123456` และเตือนตอนเริ่มรัน

## โครงสร้างที่ต้องรู้

| ไฟล์ | หน้าที่ |
|---|---|
| `style.css` | สไตล์กลางทั้งเว็บ |
| `i18n.js` | สลับภาษา TH/EN — **ภาษาไทยใน HTML คือต้นฉบับ** ถ้าเพิ่มข้อความไทยใหม่ ต้องเพิ่มคู่คำแปลในไฟล์นี้ ไม่งั้นโหมด EN จะโชว์ไทย |
| `footer.html` + `build-footer.js` | Footer กลาง — แก้ที่ `footer.html` แล้วรัน `node build-footer.js` เพื่อปั๊มลงทุกหน้า |
| `stamp-assets.js` | ต่อท้าย `?v=<hash>` ให้ไฟล์ CSS/JS — **แก้ `style.css` หรือไฟล์ .js เมื่อไหร่ ต้องรัน `node stamp-assets.js` ก่อน push** ไม่งั้นเบราว์เซอร์ที่เคยเข้าเว็บจะยังใช้ไฟล์เก่าค้างอยู่ |
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

## วิดีโอ Motion Graphic

วิดีโอแนะนำบริษัท **60 วินาที** 1920×1080 พร้อมเพลงประกอบ สำหรับลง Facebook / YouTube

```bash
node video/render.js
```

ได้ไฟล์ `video/bss-motion.mp4` (ใช้เวลาเรนเดอร์ราว 4 นาที)

แนวตั้ง 9:16 สำหรับ TikTok / Reels / Shorts:

```bash
node video/render.js --vertical
```

ได้ไฟล์ `video/bss-motion-vertical.mp4` — เนื้อหา เพลง เสียงพากษ์ชุดเดียวกัน จัดวางใหม่ให้อยู่ในพื้นที่ที่ไม่โดน UI ของ TikTok บัง

| ไฟล์ | หน้าที่ |
|---|---|
| `video/timeline.js` | **จังหวะเวลาของทั้งภาพและเพลง** — ความยาวแต่ละฉาก (หน่วยเป็นห้องเพลง 1 ห้อง = 2 วินาที) แก้ที่นี่ที่เดียว ภาพและเพลงขยับตามกันเอง |
| `video/scene.html` | ภาพทั้งหมด — ข้อความอยู่ใน `SERVICES`, `RANGE`, `REASONS`, `STEPS`, `STATS`, `MONTAGE` |
| `video/music.js` | เพลงประกอบ สังเคราะห์ด้วยโค้ด (E minor, 120 BPM) — **เป็นเพลงต้นฉบับ ไม่ติดลิขสิทธิ์** ไม่โดน Content ID |
| `video/voice.js` | เสียงพากษ์ไทย (Microsoft Niwat Neural) — บทพากษ์และเวลาเริ่มแต่ละประโยคอยู่ใน `SCRIPT` |
| `video/render.js` | สร้างเพลง + เสียงพากษ์ → เรนเดอร์ภาพทีละเฟรม → รวมเป็น MP4 (เพลงหรี่ลงอัตโนมัติตอนมีเสียงพูด) |

- ดูเฟรมเดี่ยวก่อนเรนเดอร์จริง: `node video/render.js --preview 80,300,700` → `video/preview/`
- ใช้ Chrome ที่ติดตั้งในเครื่อง ไม่ต้องดาวน์โหลด Chromium
- MP4 และ WAV ไม่ถูก commit และไม่ขึ้นเว็บ (อยู่ใน `.gitignore` / `.vercelignore`)
- ฉาก "ผลงานของเรา" ใช้**เฉพาะรูปงานจริงของบริษัท** — รูปใน `images/works/` บางรูปเป็นภาพ stock/CG
  (เช่น `screw-conveyor.jpg`, `industrial-conveyor-belt.jpg`, `recycling-sorting-system.jpg`)
  ถ้าเพิ่มรูปในฉากนั้น ให้ใช้รูปที่ถ่ายจากงานจริงเท่านั้น

## ความปลอดภัยของหน้าแอดมิน

- รหัสผ่านตรวจสอบที่ฝั่งเซิร์ฟเวอร์ (`api/_lib.js`) เทียบแบบ constant-time
  ไม่มีรหัสผ่านอยู่ในไฟล์ที่เบราว์เซอร์โหลด
- แก้ได้เฉพาะ 5 หน้าใน allowlist กันชื่อไฟล์ที่มี `/` หรือ `..`
- ปฏิเสธเนื้อหาที่สั้นกว่า 1000 ตัวอักษร หรือไม่ขึ้นต้นด้วย `<!DOCTYPE html>`
  เพื่อกันหน้าเว็บหายจากการบันทึกที่ผิดพลาด
- `admin.html` ตั้ง `noindex` ทั้งใน meta และ HTTP header

**สำคัญ:** `/api/publish` เปิดอยู่บนอินเทอร์เน็ตและมีสิทธิ์เขียน repo
สิ่งเดียวที่กั้นไว้คือ `BSS_ADMIN_PASSWORD` — ตั้งให้ยาวและสุ่ม อย่าใช้ `123456`
และใช้ fine-grained token ที่จำกัดสิทธิ์เฉพาะ repo นี้เท่านั้น
