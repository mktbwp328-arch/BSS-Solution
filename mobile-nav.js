/**
 * BSS SOLUTION - Mobile navigation
 *
 * Below 768px style.css turns .nav-links into a collapsible panel. This script
 * adds the hamburger button that opens it and keeps its state in sync.
 */
(function () {
    'use strict';

    var BURGER_SVG =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path class="bar bar-top" d="M4 7h16"/>' +
        '<path class="bar bar-mid" d="M4 12h16"/>' +
        '<path class="bar bar-bot" d="M4 17h16"/>' +
        '</svg>';

    function init() {
        var nav = document.querySelector('nav');
        if (!nav) return;

        var container = nav.querySelector('.container') || nav;
        var navLinks = nav.querySelector('.nav-links');
        if (!navLinks) return;

        if (!navLinks.id) navLinks.id = 'bss-nav-links';

        var toggle = document.createElement('button');
        toggle.id = 'bss-nav-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', navLinks.id);
        toggle.setAttribute('aria-label', 'เปิด/ปิดเมนู / Toggle menu');
        toggle.innerHTML = BURGER_SVG;
        container.appendChild(toggle);

        function setOpen(open) {
            nav.classList.toggle('nav-open', open);
            toggle.setAttribute('aria-expanded', String(open));
        }

        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!nav.classList.contains('nav-open'));
        });

        // Tapping a destination should close the panel behind it
        navLinks.addEventListener('click', function (e) {
            if (e.target.closest('a')) setOpen(false);
        });

        // Tap outside, or Escape, closes it
        document.addEventListener('click', function (e) {
            if (!nav.classList.contains('nav-open')) return;
            if (!e.target.closest('nav')) setOpen(false);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
                setOpen(false);
                toggle.focus();
            }
        });

        // Never leave the panel "open" when the layout returns to desktop
        window.addEventListener('resize', function () {
            if (window.innerWidth > 900) setOpen(false);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
