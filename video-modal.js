/**
 * BSS SOLUTION - Video lightbox
 *
 * Any element with data-video="<YouTube id or URL>" opens a centred player.
 * The iframe is created on open and destroyed on close, so the video always
 * stops playing when the box is dismissed.
 */
(function () {
    'use strict';

    var overlay = null;
    var lastFocused = null;

    /* Accepts a bare id, a watch?v= link, a youtu.be link or an /embed/ link. */
    function youtubeId(value) {
        if (!value) return null;
        var v = value.trim();
        if (/^[\w-]{11}$/.test(v)) return v;
        var m = v.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
        return m ? m[1] : null;
    }

    function buildStyles() {
        if (document.getElementById('bss-video-styles')) return;
        var css = document.createElement('style');
        css.id = 'bss-video-styles';
        css.textContent =
            '#bss-video-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;' +
            'justify-content:center;padding:1.5rem;background:rgba(5,12,24,.92);' +
            'backdrop-filter:blur(8px);opacity:0;transition:opacity .25s ease;}' +
            '#bss-video-overlay.is-open{opacity:1;}' +
            '#bss-video-box{position:relative;width:100%;max-width:960px;aspect-ratio:16/9;' +
            'background:#000;border-radius:16px;overflow:hidden;' +
            'box-shadow:0 25px 60px rgba(0,0,0,.6);border:1px solid rgba(255,140,0,.25);' +
            'transform:scale(.94);transition:transform .25s ease;}' +
            '#bss-video-overlay.is-open #bss-video-box{transform:scale(1);}' +
            '#bss-video-box iframe{width:100%;height:100%;border:0;display:block;}' +
            '#bss-video-close{position:absolute;top:-52px;right:0;width:44px;height:44px;' +
            'display:flex;align-items:center;justify-content:center;border-radius:50%;' +
            'background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;' +
            'font-size:20px;line-height:1;cursor:pointer;transition:all .2s ease;}' +
            '#bss-video-close:hover{background:var(--secondary,#ff8c00);color:#0a192f;' +
            'border-color:var(--secondary,#ff8c00);transform:rotate(90deg);}' +
            '@media (max-width:768px){' +
            '#bss-video-overlay{padding:1rem;}' +
            '#bss-video-box{border-radius:12px;}' +
            '#bss-video-close{top:-50px;right:0;}}';
        document.head.appendChild(css);
    }

    function close() {
        if (!overlay) return;
        overlay.classList.remove('is-open');
        var box = overlay;
        overlay = null;
        // Removing the iframe is what actually stops the audio
        window.setTimeout(function () { box.remove(); }, 250);
        document.body.style.overflow = '';
        if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function open(videoId) {
        if (overlay) close();
        buildStyles();
        lastFocused = document.activeElement;

        overlay = document.createElement('div');
        overlay.id = 'bss-video-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'วิดีโอแนะนำ / Intro video');
        overlay.innerHTML =
            '<div id="bss-video-box">' +
            '<button type="button" id="bss-video-close" aria-label="ปิดวิดีโอ / Close video">&times;</button>' +
            '<iframe src="https://www.youtube-nocookie.com/embed/' + videoId +
            '?autoplay=1&rel=0&modestbranding=1" title="BSS SOLUTION" ' +
            'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
            'allowfullscreen></iframe>' +
            '</div>';

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay || e.target.closest('#bss-video-close')) close();
        });

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        // next frame, so the opening transition has a starting point to animate from
        window.requestAnimationFrame(function () {
            if (overlay) overlay.classList.add('is-open');
        });
        var closeBtn = overlay.querySelector('#bss-video-close');
        if (closeBtn) closeBtn.focus();
    }

    document.addEventListener('click', function (e) {
        var trigger = e.target.closest('[data-video]');
        if (!trigger) return;
        var id = youtubeId(trigger.getAttribute('data-video'));
        if (!id) return;
        e.preventDefault();
        open(id);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay) close();
    });

    window.BSSVideo = { open: open, close: close };
})();
