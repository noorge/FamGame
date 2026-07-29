(function (Studio) {
    'use strict';

    var MIN_RECT = 20;

    // opts.mode: 'rect' resolves with normalized crop coordinates (0-1
    // fractions of the image's natural size) instead of a re-encoded blob —
    // same non-destructive idea as audio/video trim: keep the one original
    // file, just remember which part of it to show. opts.initialRect seeds
    // the crop box (used when re-cropping an already-cropped question).
    // Default (no opts / mode !== 'rect') keeps the old blob behavior,
    // still used for simple one-off crops like character avatars.
    function open(imageFile, opts) {
        opts = opts || {};
        return new Promise(function (resolve, reject) {
            var objectUrl = URL.createObjectURL(imageFile);
            var img = new Image();

            img.onload = function () {
                buildModal(img, objectUrl, opts, resolve, reject);
            };
            img.onerror = function () {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('تعذّر تحميل الصورة'));
            };
            img.src = objectUrl;
        });
    }

    function buildModal(img, objectUrl, opts, resolve, reject) {
        var maxW = Math.min(window.innerWidth * 0.85, 900);
        var maxH = window.innerHeight * 0.6;
        var scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        var dispW = Math.round(img.naturalWidth * scale);
        var dispH = Math.round(img.naturalHeight * scale);

        var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
        var box = Studio.util.el('div', { class: 'studio-modal-box crop-modal-box' });
        var title = Studio.util.el('h3', { text: 'قص الصورة' });
        var hint = Studio.util.el('p', { class: 'modal-hint', text: 'اسحب لتحريك المنطقة، واسحب الزوايا لتغيير الحجم.' });
        var canvasWrap = Studio.util.el('div', { class: 'crop-canvas-wrap', style: 'width:' + dispW + 'px;height:' + dispH + 'px;' });
        var canvas = Studio.util.el('canvas', { width: dispW, height: dispH });
        canvasWrap.appendChild(canvas);

        var btnRow = Studio.util.el('div', { class: 'modal-btn-row' });
        var applyBtn = Studio.util.el('button', { class: 'btn-primary', text: 'تطبيق القص' });
        var fullBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'استخدام الصورة كاملة' });
        var cancelBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'إلغاء' });
        btnRow.appendChild(applyBtn);
        btnRow.appendChild(fullBtn);
        btnRow.appendChild(cancelBtn);

        box.appendChild(title);
        box.appendChild(hint);
        box.appendChild(canvasWrap);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var ctx = canvas.getContext('2d');
        var rect = opts.initialRect
            ? {
                x: opts.initialRect.x * dispW,
                y: opts.initialRect.y * dispH,
                w: opts.initialRect.width * dispW,
                h: opts.initialRect.height * dispH
            }
            : { x: dispW * 0.1, y: dispH * 0.1, w: dispW * 0.8, h: dispH * 0.8 };
        var dragMode = null; // 'move' | 'nw' | 'ne' | 'sw' | 'se'
        var dragStart = null;
        var handleSize = 14;

        function draw() {
            ctx.clearRect(0, 0, dispW, dispH);
            ctx.drawImage(img, 0, 0, dispW, dispH);
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, dispW, rect.y);
            ctx.fillRect(0, rect.y + rect.h, dispW, dispH - rect.y - rect.h);
            ctx.fillRect(0, rect.y, rect.x, rect.h);
            ctx.fillRect(rect.x + rect.w, rect.y, dispW - rect.x - rect.w, rect.h);

            ctx.strokeStyle = '#ff3796';
            ctx.lineWidth = 2;
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

            var corners = getCorners();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            Object.keys(corners).forEach(function (key) {
                var c = corners[key];
                ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
                ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
            });
        }

        function getCorners() {
            return {
                nw: { x: rect.x, y: rect.y },
                ne: { x: rect.x + rect.w, y: rect.y },
                sw: { x: rect.x, y: rect.y + rect.h },
                se: { x: rect.x + rect.w, y: rect.y + rect.h }
            };
        }

        function hitTestHandle(px, py) {
            var corners = getCorners();
            var found = null;
            Object.keys(corners).forEach(function (key) {
                var c = corners[key];
                if (Math.abs(px - c.x) <= handleSize && Math.abs(py - c.y) <= handleSize) found = key;
            });
            return found;
        }

        function hitTestInside(px, py) {
            return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
        }

        function getPointerPos(e) {
            var b = canvas.getBoundingClientRect();
            var clientX = e.touches ? e.touches[0].clientX : e.clientX;
            var clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: Studio.util.clamp(clientX - b.left, 0, dispW), y: Studio.util.clamp(clientY - b.top, 0, dispH) };
        }

        function onPointerDown(e) {
            var pos = getPointerPos(e);
            var handle = hitTestHandle(pos.x, pos.y);
            if (handle) {
                dragMode = handle;
            } else if (hitTestInside(pos.x, pos.y)) {
                dragMode = 'move';
            } else {
                dragMode = null;
                return;
            }
            dragStart = { x: pos.x, y: pos.y, rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h } };
            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!dragMode) return;
            var pos = getPointerPos(e);
            var dx = pos.x - dragStart.x;
            var dy = pos.y - dragStart.y;
            var r = dragStart.rect;

            if (dragMode === 'move') {
                rect.x = Studio.util.clamp(r.x + dx, 0, dispW - rect.w);
                rect.y = Studio.util.clamp(r.y + dy, 0, dispH - rect.h);
            } else {
                var left = r.x, top = r.y, right = r.x + r.w, bottom = r.y + r.h;
                if (dragMode === 'nw') { left = r.x + dx; top = r.y + dy; }
                if (dragMode === 'ne') { right = r.x + r.w + dx; top = r.y + dy; }
                if (dragMode === 'sw') { left = r.x + dx; bottom = r.y + r.h + dy; }
                if (dragMode === 'se') { right = r.x + r.w + dx; bottom = r.y + r.h + dy; }

                left = Studio.util.clamp(left, 0, right - MIN_RECT);
                top = Studio.util.clamp(top, 0, bottom - MIN_RECT);
                right = Studio.util.clamp(right, left + MIN_RECT, dispW);
                bottom = Studio.util.clamp(bottom, top + MIN_RECT, dispH);

                rect.x = left; rect.y = top; rect.w = right - left; rect.h = bottom - top;
            }
            draw();
            e.preventDefault();
        }

        function onPointerUp() {
            dragMode = null;
            dragStart = null;
        }

        canvas.addEventListener('mousedown', onPointerDown);
        canvas.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        canvas.addEventListener('touchstart', onPointerDown, { passive: false });
        canvas.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp);

        function cleanup() {
            canvas.removeEventListener('mousedown', onPointerDown);
            canvas.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseup', onPointerUp);
            canvas.removeEventListener('touchstart', onPointerDown);
            canvas.removeEventListener('touchmove', onPointerMove);
            window.removeEventListener('touchend', onPointerUp);
            overlay.remove();
            URL.revokeObjectURL(objectUrl);
        }

        function applyRect(r) {
            var sx = r.x / scale;
            var sy = r.y / scale;
            var sw = r.w / scale;
            var sh = r.h / scale;

            if (opts.mode === 'rect') {
                var cropRect = {
                    x: sx / img.naturalWidth,
                    y: sy / img.naturalHeight,
                    width: sw / img.naturalWidth,
                    height: sh / img.naturalHeight
                };
                cleanup();
                resolve(cropRect);
                return;
            }

            var outCanvas = document.createElement('canvas');
            outCanvas.width = Math.round(sw);
            outCanvas.height = Math.round(sh);
            var outCtx = outCanvas.getContext('2d');
            outCtx.drawImage(img, sx, sy, sw, sh, 0, 0, outCanvas.width, outCanvas.height);
            outCanvas.toBlob(function (blob) {
                cleanup();
                resolve(blob);
            }, 'image/jpeg', 0.9);
        }

        applyBtn.addEventListener('click', function () { applyRect(rect); });

        fullBtn.addEventListener('click', function () {
            applyRect({ x: 0, y: 0, w: dispW, h: dispH });
        });

        cancelBtn.addEventListener('click', function () {
            cleanup();
            reject(new Error('cancelled'));
        });

        draw();
    }

    Studio.cropTool = { open: open };
})(window.Studio);
