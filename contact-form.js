/**
 * BSS SOLUTION - Contact form → Supabase
 *
 * Posts submissions straight to the Supabase REST API. The key below is the
 * PUBLISHABLE (anon) key, which is designed to be exposed in a browser — the
 * table is protected by Row Level Security (see supabase/contact_messages.sql),
 * which allows INSERT only. No dependency or build step required.
 */
(function () {
    'use strict';

    var SUPABASE_URL = 'https://vqakoevvzrhlzqlegnpd.supabase.co';
    var SUPABASE_ANON_KEY = 'sb_publishable_5AlFb7UY1Env05Q9JPMw6w_48ij0NJ_';
    var TABLE = 'contact_messages';

    var form = document.querySelector('.contact-form');
    if (!form) return;

    // Give the fields real names/ids so the browser can autofill them
    var fields = {
        name: form.querySelector('input[type="text"]'),
        email: form.querySelector('input[type="email"]'),
        phone: form.querySelectorAll('input[type="text"]')[1],
        message: form.querySelector('textarea')
    };
    var button = form.querySelector('button[type="submit"]');
    if (!fields.name || !fields.email || !fields.message || !button) return;

    fields.name.name = 'name';
    fields.name.autocomplete = 'name';
    fields.email.name = 'email';
    fields.email.autocomplete = 'email';
    if (fields.phone) {
        fields.phone.name = 'phone';
        fields.phone.type = 'tel';
        fields.phone.autocomplete = 'tel';
    }
    fields.message.name = 'message';

    var status = document.createElement('p');
    status.className = 'form-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);

    var originalLabel = button.textContent;

    function setStatus(text, kind) {
        status.textContent = text;
        status.dataset.kind = kind || '';
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (button.disabled) return;

        var payload = {
            name: fields.name.value.trim(),
            email: fields.email.value.trim(),
            phone: fields.phone ? fields.phone.value.trim() || null : null,
            message: fields.message.value.trim(),
            page: location.pathname,
            user_agent: navigator.userAgent.slice(0, 500)
        };

        if (!payload.name || !payload.email || !payload.message) {
            setStatus('กรุณากรอกชื่อ อีเมล และข้อความให้ครบ', 'error');
            return;
        }

        button.disabled = true;
        button.textContent = 'กำลังส่ง...';
        setStatus('');

        fetch(SUPABASE_URL + '/rest/v1/' + TABLE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        })
            .then(function (res) {
                if (!res.ok) {
                    return res.text().then(function (t) {
                        throw new Error(res.status + ' ' + (t || res.statusText));
                    });
                }
                form.reset();
                setStatus('ส่งข้อความเรียบร้อยแล้ว ทีมงานจะติดต่อกลับโดยเร็วที่สุด', 'ok');
            })
            .catch(function (err) {
                console.error('[contact-form]', err);
                setStatus('ส่งไม่สำเร็จ กรุณาโทร 02-317-5470-3 หรือทัก LINE: bss_1978', 'error');
            })
            .then(function () {
                button.disabled = false;
                button.textContent = originalLabel;
            });
    });
})();
