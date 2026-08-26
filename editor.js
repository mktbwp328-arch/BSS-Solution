(function() {
    // Two backends, same editor:
    //   local  — server.js writes the HTML file straight to disk
    //   remote — api/publish.js commits it to GitHub, Vercel redeploys
    // Vercel's filesystem is read-only, so the remote path has to go the long
    // way round; the live page updates about a minute after saving.
    var IS_LOCAL = ["localhost", "127.0.0.1", "::1", ""].indexOf(location.hostname) !== -1
        || /^192\.168\./.test(location.hostname);
    var API = {
        save: IS_LOCAL ? '/api/save' : '/api/publish',
        upload: '/api/upload'
    };

    // The password is never stored in this file — admin.html checks it against
    // the server and hands it over for the session only.
    function adminPassword() {
        try { return sessionStorage.getItem('bss_admin_pass') || localStorage.getItem('bss_admin_auth') || ''; }
        catch (e) { return ''; }
    }

    // Nothing to edit without credentials, and on the live site the toolbar
    // must never appear for an ordinary visitor.
    if (!adminPassword()) return;

    // The same set server.js and api/publish.js will accept. Kept here so the
    // bar can offer a jump straight to another page without a trip through
    // admin.html.
    var EDITABLE_PAGES = [
        { file: 'index.html',    label: 'หน้าแรก' },
        { file: 'about.html',    label: 'เกี่ยวกับเรา' },
        { file: 'services.html', label: 'บริการของเรา' },
        { file: 'contact.html',  label: 'ติดต่อเรา' },
        { file: 'articles.html', label: 'บทความ' }
    ];

    function currentPage() {
        var path = window.location.pathname;
        if (path === '/' || path.endsWith('/')) return 'index.html';
        return path.split('/').pop();
    }

    // Create Hidden File Input for Image Uploads
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    let activeImage = null;
    let isAdmin = Boolean(adminPassword());
    const editorUI = document.createElement('div');
    editorUI.id = 'bss-editor-ui';

    // Load SortableJS from CDN if not present.
    // data-bss-editor marks everything this script injects so the save routine can
    // strip it all again — without it these tags pile up on every publish.
    if (!window.Sortable) {
        const sortableScript = document.createElement('script');
        sortableScript.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js';
        sortableScript.setAttribute('data-bss-editor', '1');
        document.head.appendChild(sortableScript);
    }

    // Add CSS styles for the refined editor interface
    const editorStyles = document.createElement('style');
    editorStyles.id = 'editor-permanent-styles';
    editorStyles.setAttribute('data-bss-editor', '1');
    editorStyles.innerHTML = `
        /* Premium Admin Top Bar */
        #bss-admin-bar {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 65px;
            background: #0a192f;
            border-bottom: 2px solid #ff8c00;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 2rem;
            color: #ffffff;
            font-family: 'Prompt', sans-serif;
        }
        /* Only shift the page while the admin bar is actually on screen.
           Unscoped, this offset applied to every visitor on every page. */
        body.bss-admin-mode {
            margin-top: 65px; /* Push site down so the bar doesn't overlap the header */
        }
        .admin-bar-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            font-size: 16px;
            color: #ff8c00;
        }
        .admin-bar-logo span {
            color: #ffffff;
            font-size: 12px;
            background: rgba(255, 140, 0, 0.15);
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid rgba(255, 140, 0, 0.3);
        }
        /* Page picker — switch pages without going back through admin.html */
        .admin-bar-nav-info {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #bss-page-picker {
            appearance: none;
            font-family: inherit;
            font-size: 13px;
            font-weight: 600;
            color: #fff;
            background: rgba(255, 255, 255, 0.07);
            border: 1px solid rgba(255, 140, 0, 0.45);
            border-radius: 8px;
            padding: 8px 30px 8px 12px;
            min-height: 40px;
            cursor: pointer;
            /* Chevron drawn inline so the control needs no image request */
            background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23ff8c00' stroke-width='2'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 9px center;
            background-size: 13px;
            transition: border-color .2s ease, background-color .2s ease;
        }
        #bss-page-picker:hover { border-color: #ff8c00; background-color: rgba(255, 140, 0, 0.14); }
        #bss-page-picker:focus-visible { outline: 2px solid #ff8c00; outline-offset: 2px; }
        /* The list itself is drawn by the OS — it needs its own dark colours */
        #bss-page-picker option { background: #0a192f; color: #fff; }

        .admin-controls-group {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .admin-btn {
            padding: 10px 18px;
            border-radius: 8px;
            border: none;
            font-family: 'Prompt', sans-serif;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }
        .admin-btn-primary {
            background: #ff8c00;
            color: #0a192f;
        }
        .admin-btn-primary:hover {
            background: #ff4d00;
            color: #ffffff;
            box-shadow: 0 0 15px rgba(255, 140, 0, 0.4);
        }
        .admin-btn-secondary {
            background: #1a365d;
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .admin-btn-secondary.active {
            background: #2ecc71;
            border-color: #2ecc71;
        }
        .admin-btn-danger {
            background: #e74c3c;
            color: #ffffff;
        }

        /* The admin bar has to stay usable on a phone or tablet too */
        @media (max-width: 900px) {
            #bss-admin-bar {
                height: auto;
                flex-wrap: wrap;
                gap: 10px;
                padding: 10px 1rem;
            }
            /* Starting guess only — syncBarOffset() measures the bar and
               replaces this. Hardcoded numbers went stale the moment the bar
               gained a control and started wrapping onto a third row. */
            body.bss-admin-mode { margin-top: 0; padding-top: 150px; }
            .admin-bar-nav-info { order: 3; width: 100%; }
            .admin-controls-group { width: 100%; flex-wrap: wrap; gap: 8px; }
            .admin-controls-group .admin-btn { flex: 1 1 auto; justify-content: center; font-size: 12px; padding: 10px 12px; }
        }
        @media (max-width: 480px) {
            .admin-bar-logo { font-size: 14px; }
        }

        /* Floating Element Settings Widget */
        #bss-element-settings {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #0d1e36;
            border: 1px solid rgba(255, 140, 0, 0.3);
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 999999;
            width: 250px;
            color: #ffffff;
            font-family: 'Prompt', sans-serif;
            display: none;
            flex-direction: column;
            gap: 10px;
        }

        /* Editing Hover Helpers */
        .editable-hover-helper {
            position: relative;
        }
        .editing-active:hover {
            outline: 2px dashed #ff8c00 !important;
            outline-offset: 2px;
            cursor: text;
        }
        img.editing-active:hover {
            outline: 3px solid #3498db !important;
            cursor: pointer;
        }
        .selected-element {
            outline: 2px solid #2ecc71 !important;
            outline-offset: 2px;
            background: rgba(46, 204, 113, 0.08) !important;
        }
    `;
    document.head.appendChild(editorStyles);

    function renderEditor() {
        editorUI.innerHTML = '';
        // Drives the body offset that makes room for the fixed admin bar
        document.body.classList.toggle('bss-admin-mode', isAdmin);
        // Visitors see nothing at all — the editor is entered through admin.html.
        // If someone opens ?edit=1 without a session, send them to the login there.
        if (!isAdmin) {
            if (new URLSearchParams(window.location.search).has('edit')) {
                window.location.replace('admin.html');
            }
            return;
        }

        // Admin Workspace Bar & Floating Tools
        editorUI.innerHTML = `
            <div id="bss-admin-bar">
                <div class="admin-bar-logo">
                    <i class="fas fa-tools"></i> BSS SOLUTION <span>โหมดแอดมิน</span>
                </div>
                
                <div class="admin-bar-nav-info" style="font-size: 13px; color: #aaa;">
                    <label for="bss-page-picker">กำลังแก้ไขหน้า:</label>
                    <select id="bss-page-picker" title="เลือกหน้าอื่นเพื่อแก้ไขต่อ">
                        ${EDITABLE_PAGES.map(p =>
                            `<option value="${p.file}"${p.file === currentPage() ? ' selected' : ''}>${p.label}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="admin-controls-group">
                    <button id="back-to-dashboard" class="admin-btn admin-btn-secondary" title="กลับไปหน้ารวมทุกหน้า">
                        <i class="fas fa-th-large"></i> ทุกหน้า
                    </button>

                    <button id="toggle-edit" class="admin-btn admin-btn-secondary active">
                        <i class="fas fa-edit"></i> ✍️ โหมดแก้ไขข้อความ: เปิดอยู่
                    </button>
                    
                    <button id="toggle-layout" class="admin-btn admin-btn-secondary">
                        <i class="fas fa-arrows-alt"></i> ↕️ โหมดจัดเรียง (Drag): ปิดอยู่
                    </button>
                    
                    <button id="save-content" class="admin-btn admin-btn-primary" style="opacity: 0.6; cursor: not-allowed;" disabled>
                        <i class="fas fa-save"></i> บันทึกการแก้ไข (Publish)
                    </button>

                    <button id="logout-admin" class="admin-btn admin-btn-danger" style="padding: 10px;">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>

            <!-- Floating Settings Widget -->
            <div id="bss-element-settings">
                <div style="font-weight: bold; font-size: 13px; color: #ff8c00; border-bottom: 1px solid rgba(255,140,0,0.2); padding-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                    <span>🎨 ปรับแต่งสี & ขนาดอักษร</span>
                    <span id="active-tag" style="background: rgba(255,255,255,0.1); padding: 1px 6px; border-radius: 4px; font-size: 11px;">none</span>
                </div>
                <div>
                    <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">ขนาดตัวอักษร (<span id="val-fs">16</span>px)</label>
                    <input type="range" id="input-fs" min="10" max="80" value="16" style="width: 100%; accent-color: #ff8c00;">
                </div>
                <div>
                    <label style="font-size: 11px; color: #ccc; display: block; margin-bottom: 2px;">สีตัวอักษร</label>
                    <input type="color" id="input-color" style="width: 100%; height: 30px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; background: transparent; border-radius: 4px;">
                </div>
                <div style="display: flex; gap: 8px; margin-top: 5px;">
                    <button id="btn-bold" style="flex: 1; padding: 6px; background: #1a2a3a; color: white; border: 1px solid #444; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: bold;">หนา</button>
                    <button id="btn-italic" style="flex: 1; padding: 6px; background: #1a2a3a; color: white; border: 1px solid #444; border-radius: 4px; font-size: 12px; cursor: pointer; font-style: italic;">เอียง</button>
                </div>
            </div>
        `;
        
        if (!document.getElementById('bss-editor-ui')) document.body.appendChild(editorUI);
        setupEditorEvents();
        watchBarHeight();

        // Auto-enable Editing Mode on Load for absolute convenience!
        isEditing = true;
        enableEditing();
    }

    /**
     * Push the page down by exactly the bar's height.
     *
     * The bar is fixed, so the page needs an offset or its header sits under
     * it. That offset used to be three hardcoded numbers per breakpoint, and
     * they were already wrong: on a phone the bar wraps to 238px while the CSS
     * reserved 150px, hiding the top of every page. Measuring removes the
     * guesswork, and a ResizeObserver keeps it right when the bar rewraps —
     * on rotation, on resize, or when a button's label changes width.
     *
     * Written into a data-bss-editor stylesheet rather than an inline style on
     * <body>, so the save routine strips it along with the rest of the editor
     * chrome instead of baking a padding into the published file.
     */
    function syncBarOffset() {
        const bar = document.getElementById('bss-admin-bar');
        if (!bar) return;
        let sheet = document.getElementById('bss-admin-offset');
        if (!sheet) {
            sheet = document.createElement('style');
            sheet.id = 'bss-admin-offset';
            sheet.setAttribute('data-bss-editor', '1');
            document.head.appendChild(sheet);
        }
        const h = Math.ceil(bar.getBoundingClientRect().height);
        // The site's own navbar is fixed at top:0, so body padding does not
        // move it — it sat underneath the admin bar, leaving a sliver of the
        // logo showing and the menu unreachable while editing.
        sheet.textContent =
            `body.bss-admin-mode{margin-top:0 !important;padding-top:${h}px !important;}` +
            `body.bss-admin-mode > nav{top:${h}px !important;}`;
    }

    function watchBarHeight() {
        syncBarOffset();
        const bar = document.getElementById('bss-admin-bar');
        if (bar && window.ResizeObserver) new ResizeObserver(syncBarOffset).observe(bar);
        window.addEventListener('resize', syncBarOffset);
        // Web fonts land after first paint and can change the bar's height
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncBarOffset);
    }

    function getCurrentFilename() {
        const page = EDITABLE_PAGES.filter(function (p) { return p.file === currentPage(); })[0];
        return page ? page.label : currentPage();
    }

    let selectedElement = null;
    let isEditing = false;
    let isLayoutMode = false;
    let sortables = [];

    function setupEditorEvents() {
        const toggleBtn = document.getElementById('toggle-edit');
        const layoutBtn = document.getElementById('toggle-layout');
        const saveBtn = document.getElementById('save-content');
        const logoutBtn = document.getElementById('logout-admin');
        const elementSettings = document.getElementById('bss-element-settings');
        
        // Text styling inputs
        const inputFs = document.getElementById('input-fs');
        const valFs = document.getElementById('val-fs');
        const inputColor = document.getElementById('input-color');
        const btnBold = document.getElementById('btn-bold');
        const btnItalic = document.getElementById('btn-italic');
        const activeTag = document.getElementById('active-tag');

        // Click to Select & Open Floating Style Panel
        document.addEventListener('click', (e) => {
            if (!isEditing) return;
            // Prevent choosing editor UI itself
            if (e.target.closest('#bss-editor-ui') || e.target === fileInput) return;
            
            if (selectedElement) selectedElement.classList.remove('selected-element');
            selectedElement = e.target;
            selectedElement.classList.add('selected-element');
            
            const style = getComputedStyle(selectedElement);
            activeTag.innerText = selectedElement.tagName.toLowerCase();
            
            // Populate Style controls
            const fsVal = parseInt(style.fontSize) || 16;
            inputFs.value = fsVal;
            valFs.innerText = fsVal;
            inputColor.value = rgbToHex(style.color);
            
            elementSettings.style.display = 'flex';
        });

        // Hide floating panel when clicking outside editable blocks
        document.addEventListener('mousedown', (e) => {
            if (!selectedElement) return;
            if (e.target.closest('#bss-element-settings') || e.target.classList.contains('editing-active') || e.target === fileInput) return;
            selectedElement.classList.remove('selected-element');
            selectedElement = null;
            elementSettings.style.display = 'none';
        });

        function rgbToHex(rgb) {
            const result = rgb.match(/\d+/g);
            return result ? "#" + result.slice(0,3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('') : "#000000";
        }

        // Live settings update
        inputFs.oninput = (e) => { 
            if (selectedElement) { 
                selectedElement.style.fontSize = e.target.value + 'px'; 
                valFs.innerText = e.target.value; 
                markUnsaved();
            } 
        };
        inputColor.oninput = (e) => { 
            if (selectedElement) { 
                selectedElement.style.color = e.target.value; 
                markUnsaved();
            } 
        };
        btnBold.onclick = () => { 
            if (selectedElement) { 
                selectedElement.style.fontWeight = selectedElement.style.fontWeight === 'bold' ? 'normal' : 'bold'; 
                markUnsaved();
            } 
        };
        btnItalic.onclick = () => { 
            if (selectedElement) { 
                selectedElement.style.fontStyle = selectedElement.style.fontStyle === 'italic' ? 'normal' : 'italic'; 
                markUnsaved();
            } 
        };

        // Edit Mode Toggle
        toggleBtn.onclick = () => {
            isEditing = !isEditing;
            if (isEditing) {
                enableEditing();
                toggleBtn.innerHTML = '<i class="fas fa-edit"></i> ✍️ โหมดแก้ไขข้อความ: เปิดอยู่';
                toggleBtn.classList.add('active');
            } else {
                disableEditing();
                toggleBtn.innerHTML = '<i class="fas fa-edit"></i> ✍️ โหมดแก้ไขข้อความ: ปิดอยู่';
                toggleBtn.classList.remove('active');
                elementSettings.style.display = 'none';
            }
        };

        // Drag/Layout Mode Toggle
        layoutBtn.onclick = () => {
            isLayoutMode = !isLayoutMode;
            if (isLayoutMode) {
                enableLayoutMode();
                layoutBtn.innerHTML = '<i class="fas fa-arrows-alt"></i> ↕️ โหมดจัดเรียง (Drag): เปิดอยู่';
                layoutBtn.classList.add('active');
            } else {
                disableLayoutMode();
                layoutBtn.innerHTML = '<i class="fas fa-arrows-alt"></i> ↕️ โหมดจัดเรียง (Drag): ปิดอยู่';
                layoutBtn.classList.remove('active');
            }
        };

        // File Uploader Logic
        fileInput.onchange = async (e) => {
            if (!e.target.files.length || !activeImage) return;
            const file = e.target.files[0];

            try {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังอัปโหลดภาพ...';

                let response;
                if (IS_LOCAL) {
                    const formData = new FormData();
                    formData.append('image', file);
                    response = await fetch(API.upload, {
                        method: 'POST',
                        headers: { 'x-admin-password': adminPassword() },
                        body: formData
                    });
                } else {
                    // Downscale before sending: keeps the request inside
                    // Vercel's body limit and the site out of multi-MB photos.
                    const shrunk = await shrinkImage(file);
                    response = await fetch(API.upload, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword() },
                        body: JSON.stringify({ name: file.name, type: shrunk.type, data: shrunk.base64 })
                    });
                }

                if (!response.ok) {
                    throw new Error(await errorText(response));
                }

                const data = await response.json();
                if (data.url) {
                    if (IS_LOCAL) {
                        activeImage.setAttribute('src', data.url);
                    } else {
                        // The committed file does not exist on the CDN until the
                        // redeploy finishes, so show the local copy meanwhile and
                        // write the real path into the saved HTML.
                        activeImage.setAttribute('data-final-src', data.url);
                        activeImage.setAttribute('src', URL.createObjectURL(file));
                    }
                    markUnsaved();
                }
            } catch (err) {
                console.error(err);
                alert('อัปโหลดล้มเหลว: ' + err.message);
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> บันทึกการแก้ไข (Publish)';
            }
        };

        // Save action
        saveBtn.onclick = async () => {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึกข้อมูล...';

            // Thai is the source of truth in the HTML files — never save the EN overlay
            if (window.BSSI18n) window.BSSI18n.revertToThai();

            const clone = document.documentElement.cloneNode(true);

            // Strip every runtime-injected node so the saved file stays clean.
            // Anything missed here accumulates in the HTML on each publish.
            const RUNTIME_NODES = [
                '[data-bss-editor]',          // editor styles + the SortableJS tag
                '#bss-editor-ui',             // admin bar and floating panels
                '#editor-permanent-styles',
                '#editor-temp-style',         // legacy ids left in older saved files
                '#layout-temp-style',
                '#bss-lang-switch',           // language switcher (i18n.js)
                '#bss-lang-styles',
                '#bss-nav-toggle',            // hamburger (mobile-nav.js)
                '#bss-video-overlay',         // video lightbox (video-modal.js)
                '#bss-video-styles',
                'script[src*="sortablejs"]',  // CDN tag, however it got in
                'input[type="file"][style*="display: none"]'
            ];
            RUNTIME_NODES.forEach(sel => clone.querySelectorAll(sel).forEach(n => n.remove()));

            const openNav = clone.querySelector('nav.nav-open'); if (openNav) openNav.classList.remove('nav-open');
            const cloneBody = clone.querySelector('body'); if (cloneBody) cloneBody.classList.remove('bss-admin-mode');

            clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
            clone.querySelectorAll('.editing-active, .layout-active, .selected-element').forEach(el => {
                el.classList.remove('editing-active', 'layout-active', 'selected-element');
            });

            // Drop the id mobile-nav.js adds for aria-controls; it re-adds it at runtime
            const navList = clone.querySelector('#bss-nav-links');
            if (navList) navList.removeAttribute('id');

            // The page's scroll handler writes padding and background onto the
            // navbar as you scroll. Saving while scrolled down baked the
            // compact version into the file, so the bar loaded shrunk until
            // the first scroll fired. That is runtime state, not content.
            const savedNav = clone.querySelector('#navbar');
            if (savedNav && savedNav.hasAttribute('style')) {
                // Split rather than regex-replace: one pattern matching both
                // properties consumed the separating semicolon and let the
                // second declaration through.
                const cleaned = savedNav.getAttribute('style')
                    .split(';')
                    .filter(decl => decl.trim() && !/^\s*(padding|background)\s*:/i.test(decl))
                    .join(';')
                    .trim();
                if (cleaned) savedNav.setAttribute('style', cleaned + ';'); else savedNav.removeAttribute('style');
            }

            // enableEditing() sets cursor:pointer on images so they look clickable.
            // That is editor chrome, not content — strip it back out of the saved file.
            clone.querySelectorAll('img[style*="cursor"]').forEach(img => {
                const cleaned = img.getAttribute('style')
                    .replace(/(^|;)\s*cursor\s*:[^;]*;?/gi, '$1')
                    .replace(/^\s*;\s*/, '')
                    .trim();
                if (cleaned) img.setAttribute('style', cleaned); else img.removeAttribute('style');
            });

            // Swap freshly uploaded images from their local preview back to the
            // committed path — a blob: URL would be dead in the saved file.
            clone.querySelectorAll('img[data-final-src]').forEach(img => {
                img.setAttribute('src', img.getAttribute('data-final-src'));
                img.removeAttribute('data-final-src');
            });

            // Removing our classes can leave class="" behind — tidy those away
            clone.querySelectorAll('[class=""]').forEach(el => el.removeAttribute('class'));
            clone.querySelectorAll('[style=""]').forEach(el => el.removeAttribute('style'));

            // Retrieve current file name
            const currentPath = window.location.pathname;
            const filename = currentPath === '/' || currentPath.endsWith('/') ? 'index.html' : currentPath.split('/').pop();
            const content = '<!DOCTYPE html>\n' + clone.outerHTML;
            
            try {
                const response = await fetch(API.save, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword() },
                    body: JSON.stringify({ filename, content })
                });

                if (response.ok) {
                    saveBtn.innerHTML = IS_LOCAL
                        ? '<i class="fas fa-check-circle"></i> บันทึกสำเร็จแล้ว!'
                        : '<i class="fas fa-check-circle"></i> บันทึกแล้ว — กำลังอัปเดตเว็บ';
                    saveBtn.style.background = '#2ecc71';
                    saveBtn.style.color = '#fff';
                    if (!IS_LOCAL) {
                        let commit = null;
                        try { commit = (await response.clone().json()).commit; } catch (e) {}
                        showDeployNotice(commit);
                    }
                    setTimeout(() => {
                        saveBtn.style.background = '#ff8c00';
                        saveBtn.style.color = '#0a192f';
                        saveBtn.style.opacity = '0.6';
                        saveBtn.style.cursor = 'not-allowed';
                        saveBtn.disabled = true;
                        saveBtn.innerHTML = '<i class="fas fa-save"></i> บันทึกการแก้ไข (Publish)';
                    }, 2500);
                } else {
                    throw new Error(await errorText(response));
                }
            } catch (err) {
                console.error(err);
                alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> ลองใหม่อีกครั้ง';
            }
        };

        function markUnsaved() {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
            saveBtn.style.background = '#ff8c00';
            saveBtn.style.color = '#0a192f';
        }

        // Typing is the main way content changes — without this the Publish
        // button stays disabled and edits can never be saved.
        document.addEventListener('input', (e) => {
            if (e.target && e.target.isContentEditable) markUnsaved();
        }, true);

        // Jumping between pages without going back through admin.html. The
        // Publish button being enabled is the signal that edits are pending —
        // navigating away would silently discard them.
        function leaveFor(url) {
            if (!saveBtn.disabled &&
                !confirm('ยังไม่ได้บันทึกการแก้ไขหน้านี้ ถ้าออกตอนนี้การแก้ไขจะหายไป\n\nต้องการออกโดยไม่บันทึกใช่หรือไม่?')) {
                return false;
            }
            window.location.href = url;
            return true;
        }

        const picker = document.getElementById('bss-page-picker');
        if (picker) {
            picker.onchange = () => {
                const target = picker.value;
                if (target === currentPage()) return;
                if (!leaveFor(target + '?edit=1')) picker.value = currentPage();
            };
        }

        const dashBtn = document.getElementById('back-to-dashboard');
        if (dashBtn) dashBtn.onclick = () => leaveFor('admin.html');

        logoutBtn.onclick = () => {
            try {
                sessionStorage.removeItem('bss_admin_pass');
                localStorage.removeItem('bss_admin_auth');
            } catch (e) {}
            isAdmin = false;
            location.href = 'admin.html';
        };
    }

    // The API answers with JSON; server.js answers with plain text.
    async function errorText(response) {
        const raw = await response.text();
        try { return JSON.parse(raw).error || raw; } catch (e) { return raw || ('HTTP ' + response.status); }
    }

    // Re-encode to at most 1600px on the long edge. Photos off a phone are
    // routinely 4-8 MB, which both blows the request limit and would make the
    // page slower than every other image on the site.
    function shrinkImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onerror = () => reject(new Error('อ่านไฟล์รูปไม่ได้'));
            img.onload = () => {
                const max = 1600;
                const scale = Math.min(1, max / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

                // Keep PNG for anything with transparency, otherwise JPEG.
                const type = file.type === 'image/png' || file.type === 'image/gif' ? 'image/png' : 'image/jpeg';
                const url = canvas.toDataURL(type, 0.85);
                URL.revokeObjectURL(img.src);
                resolve({ type: type, base64: url.slice(url.indexOf(',') + 1) });
            };
            img.src = URL.createObjectURL(file);
        });
    }

    function deployNoticeBox() {
        let box = document.getElementById('bss-deploy-notice');
        if (!box) {
            box = document.createElement('div');
            box.id = 'bss-deploy-notice';
            box.setAttribute('data-bss-editor', '1');
            box.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:1000000;max-width:340px;' +
                'background:#0a192f;color:#e6f1ff;border:1px solid #ff8c00;border-radius:14px;' +
                'padding:1rem 1.15rem;font-family:Prompt,sans-serif;font-size:0.9rem;line-height:1.7;' +
                'box-shadow:0 18px 40px rgba(0,0,0,.45)';
            document.body.appendChild(box);
        }
        return box;
    }

    // Publishing commits to GitHub, which Vercel then deploys — about 25
    // seconds in practice. Rather than quote a guess, watch for the deployment
    // that carries this commit and say the moment it is actually live.
    async function showDeployNotice(commit) {
        const box = deployNoticeBox();
        const started = Date.now();
        const tick = () => Math.round((Date.now() - started) / 1000);

        const waiting = () => {
            box.innerHTML = '<strong style="color:#ff8c00">บันทึกแล้ว กำลังอัปเดตเว็บ…</strong><br>' +
                'ผ่านไป ' + tick() + ' วินาที (ปกติราว 25 วินาที)<br>' +
                '<span style="opacity:.7">ปิดหน้านี้ได้เลย การอัปเดตทำงานต่อเอง</span>';
        };
        waiting();

        if (!commit) { setTimeout(() => box.remove(), 20000); return; }

        const timer = setInterval(waiting, 1000);
        const deadline = Date.now() + 180000;

        while (Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 3000));
            try {
                const s = await (await fetch('/api/status?t=' + Date.now(), { cache: 'no-store' })).json();
                if (s.deployedCommit === commit) {
                    clearInterval(timer);
                    box.innerHTML = '<strong style="color:#2ecc71">เผยแพร่เรียบร้อยแล้ว</strong><br>' +
                        'ใช้เวลา ' + tick() + ' วินาที — หน้าเว็บจริงอัปเดตแล้ว<br>' +
                        '<button type="button" style="margin-top:.6rem;padding:.5rem .9rem;border:0;' +
                        'border-radius:8px;background:#ff8c00;color:#0a192f;font-weight:600;cursor:pointer;' +
                        'font-family:inherit">ดูหน้าเว็บจริง</button>';
                    box.querySelector('button').onclick = () => {
                        location.href = location.pathname;
                    };
                    return;
                }
            } catch (e) { /* keep waiting — a deploy swap can briefly 503 */ }
        }

        clearInterval(timer);
        box.innerHTML = '<strong style="color:#ff8c00">บันทึกแล้ว</strong><br>' +
            'แต่ยังตรวจไม่พบว่า deploy เสร็จ ลองรีเฟรชหน้าเว็บจริงอีกสักครู่ครับ';
    }

    function enableEditing() {
        document.querySelectorAll('h1, h2, h3, h4, p, span, a, li, button').forEach(el => {
            // Site chrome, not page content — these must stay clickable while editing
            if (el.closest('#bss-lang-switch, #bss-nav-toggle')) return;
            el.setAttribute('contenteditable', 'true');
            el.classList.add('editing-active');
        });
        document.querySelectorAll('img').forEach(img => {
            img.classList.add('editing-active');
            img.style.cursor = 'pointer';
            img.onclick = (e) => { 
                e.preventDefault(); 
                e.stopPropagation(); 
                activeImage = img; 
                fileInput.click(); 
            };
        });
    }

    function disableEditing() {
        document.querySelectorAll('[contenteditable]').forEach(el => { 
            el.removeAttribute('contenteditable'); 
            el.classList.remove('editing-active'); 
        });
        document.querySelectorAll('img').forEach(img => {
            img.classList.remove('editing-active');
            img.style.cursor = '';
            img.onclick = null;
        });
    }

    function enableLayoutMode() {
        const containers = document.querySelectorAll('.container, .services-grid, .articles-grid, .footer-grid, section, body');
        containers.forEach(container => {
            container.classList.add('layout-active');
            sortables.push(new Sortable(container, {
                animation: 150,
                ghostClass: 'layout-ghost',
                onEnd: () => { 
                    const saveBtn = document.getElementById('save-content');
                    if (saveBtn) {
                        saveBtn.disabled = false;
                        saveBtn.style.opacity = '1';
                        saveBtn.style.cursor = 'pointer';
                    }
                }
            }));
        });
    }

    function disableLayoutMode() {
        sortables.forEach(s => s.destroy());
        sortables = [];
        document.querySelectorAll('.layout-active').forEach(el => el.classList.remove('layout-active'));
    }

    // Launch UI
    renderEditor();
})();
