(function (Studio) {
    'use strict';

    var MIN_GAP = 0.5;
    // Fully decoding audio to draw a waveform is fine for short clips, but
    // proportional to file length/size — for long recitations (tens of MB)
    // it can take a long time. Above this size, skip the decode/waveform
    // entirely and use a lightweight metadata read instead; the manual time
    // fields still make precise trimming possible without a waveform.
    var WAVEFORM_SIZE_LIMIT = 8 * 1024 * 1024;

    function open(audioFile, existing) {
        return new Promise(function (resolve, reject) {
            var objectUrl = URL.createObjectURL(audioFile);

            if (audioFile.size > WAVEFORM_SIZE_LIMIT) {
                var probe = new Audio(objectUrl);
                probe.preload = 'metadata';
                probe.addEventListener('loadedmetadata', function () {
                    buildModal(null, probe.duration, objectUrl, null, existing, resolve, reject);
                });
                probe.addEventListener('error', function () {
                    URL.revokeObjectURL(objectUrl);
                    reject(new Error('تعذّر قراءة ملف الصوت'));
                });
                return;
            }

            var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioFile.arrayBuffer().then(function (arrayBuffer) {
                return audioCtx.decodeAudioData(arrayBuffer);
            }).then(function (audioBuffer) {
                buildModal(audioBuffer, audioBuffer.duration, objectUrl, audioCtx, existing, resolve, reject);
            }).catch(function (err) {
                URL.revokeObjectURL(objectUrl);
                audioCtx.close();
                reject(new Error('تعذّر قراءة ملف الصوت: ' + err.message));
            });
        });
    }

    function buildModal(audioBuffer, duration, objectUrl, audioCtx, existing, resolve, reject) {
        var trimStart = existing && existing.trimStart != null ? existing.trimStart : 0;
        var trimEnd = existing && existing.trimEnd != null ? existing.trimEnd : duration;

        var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
        var box = Studio.util.el('div', { class: 'studio-modal-box trim-modal-box' });
        var title = Studio.util.el('h3', { text: 'قص المقطع الصوتي' });
        var hint = Studio.util.el('p', { class: 'modal-hint', text: 'اسحب المقبضين لتحديد الجزء الذي سيتم تشغيله في اللعبة.' });

        var waveWrap = Studio.util.el('div', { class: 'trim-wave-wrap' });
        var canvas = null;
        var largeFileNotice = null;
        if (audioBuffer) {
            canvas = Studio.util.el('canvas', { height: 120, class: 'trim-wave-canvas' });
            waveWrap.appendChild(canvas);
        } else {
            waveWrap.appendChild(Studio.util.el('div', { class: 'trim-video-track' }));
            largeFileNotice = Studio.util.el('p', { class: 'modal-hint', text: '(ملف كبير — تم تخطي رسم الموجة الصوتية لتسريع الفتح)' });
        }
        var handleStart = Studio.util.el('div', { class: 'trim-handle trim-handle-start' });
        var handleEnd = Studio.util.el('div', { class: 'trim-handle trim-handle-end' });
        waveWrap.appendChild(handleStart);
        waveWrap.appendChild(handleEnd);

        var hint2 = Studio.util.el('p', { class: 'modal-hint', text: 'أو اكتب الوقت يدوياً (مفيد للمقاطع الطويلة):' });
        var timeInputsRow = Studio.util.el('div', { class: 'trim-time-inputs' });
        var startInput = Studio.util.el('input', { type: 'text', class: 'trim-time-input' });
        var endInput = Studio.util.el('input', { type: 'text', class: 'trim-time-input' });
        var durationLabel = Studio.util.el('span', { class: 'trim-duration-label' });
        timeInputsRow.appendChild(startInput);
        timeInputsRow.appendChild(Studio.util.el('span', { class: 'trim-time-sep', text: '—' }));
        timeInputsRow.appendChild(endInput);
        timeInputsRow.appendChild(durationLabel);

        var previewBtn = Studio.util.el('button', { class: 'btn-secondary', text: '▶ معاينة الجزء المحدد' });
        var btnRow = Studio.util.el('div', { class: 'modal-btn-row' });
        var applyBtn = Studio.util.el('button', { class: 'btn-primary', text: 'تطبيق' });
        var cancelBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'إلغاء' });
        btnRow.appendChild(applyBtn);
        btnRow.appendChild(cancelBtn);

        box.appendChild(title);
        box.appendChild(hint);
        box.appendChild(waveWrap);
        if (largeFileNotice) box.appendChild(largeFileNotice);
        box.appendChild(hint2);
        box.appendChild(timeInputsRow);
        box.appendChild(previewBtn);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Measure the ACTUAL rendered width (not a guessed constant) so handle
        // positions and drag math always agree with what's on screen, regardless
        // of window size/zoom. Must happen after the modal is in the DOM.
        var canvasWidth = Math.round(waveWrap.getBoundingClientRect().width);
        if (canvas) {
            canvas.width = canvasWidth;
            drawWaveform(canvas, audioBuffer);
        }

        function timeToX(t) { return (t / duration) * canvasWidth; }
        function xToTime(x) { return Studio.util.clamp((x / canvasWidth) * duration, 0, duration); }

        function updateHandles() {
            handleStart.style.left = timeToX(trimStart) + 'px';
            handleEnd.style.left = timeToX(trimEnd) + 'px';
            if (document.activeElement !== startInput) startInput.value = Studio.util.formatTime(trimStart);
            if (document.activeElement !== endInput) endInput.value = Studio.util.formatTime(trimEnd);
            durationLabel.textContent = '/ ' + Studio.util.formatTime(duration);
        }
        updateHandles();

        function commitStartInput() {
            var t = Studio.util.parseTime(startInput.value);
            if (!isNaN(t)) trimStart = Studio.util.clamp(t, 0, trimEnd - MIN_GAP);
            updateHandles();
        }
        function commitEndInput() {
            var t = Studio.util.parseTime(endInput.value);
            if (!isNaN(t)) trimEnd = Studio.util.clamp(t, trimStart + MIN_GAP, duration);
            updateHandles();
        }
        startInput.addEventListener('change', commitStartInput);
        startInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commitStartInput(); startInput.blur(); } });
        endInput.addEventListener('change', commitEndInput);
        endInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commitEndInput(); endInput.blur(); } });

        var previewAudio = new Audio(objectUrl);
        var unbindEnforcement = Studio.util.bindTrimEnforcement(
            previewAudio,
            function () { return trimStart; },
            function () { return trimEnd; }
        );

        var dragTarget = null;
        function makeDragHandler(handleEl, isStart) {
            handleEl.addEventListener('mousedown', function (e) { dragTarget = isStart ? 'start' : 'end'; e.preventDefault(); });
            handleEl.addEventListener('touchstart', function (e) { dragTarget = isStart ? 'start' : 'end'; e.preventDefault(); }, { passive: false });
        }
        makeDragHandler(handleStart, true);
        makeDragHandler(handleEnd, false);

        function onMove(e) {
            if (!dragTarget) return;
            var rectBox = waveWrap.getBoundingClientRect();
            var clientX = e.touches ? e.touches[0].clientX : e.clientX;
            var x = Studio.util.clamp(clientX - rectBox.left, 0, canvasWidth);
            var t = xToTime(x);
            if (dragTarget === 'start') {
                trimStart = Studio.util.clamp(t, 0, trimEnd - MIN_GAP);
            } else {
                trimEnd = Studio.util.clamp(t, trimStart + MIN_GAP, duration);
            }
            updateHandles();
        }
        function onUp() { dragTarget = null; }

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);

        function onResize() {
            canvasWidth = Math.round(waveWrap.getBoundingClientRect().width);
            if (canvas) {
                canvas.width = canvasWidth;
                drawWaveform(canvas, audioBuffer);
            }
            updateHandles();
        }
        window.addEventListener('resize', onResize);

        previewBtn.addEventListener('click', function () {
            previewAudio.currentTime = trimStart;
            previewAudio.play();
        });

        function cleanup() {
            previewAudio.pause();
            unbindEnforcement();
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('resize', onResize);
            overlay.remove();
            URL.revokeObjectURL(objectUrl);
            if (audioCtx) audioCtx.close();
        }

        applyBtn.addEventListener('click', function () {
            var result = { trimStart: trimStart, trimEnd: trimEnd, duration: duration };
            cleanup();
            resolve(result);
        });

        cancelBtn.addEventListener('click', function () {
            cleanup();
            reject(new Error('cancelled'));
        });
    }

    function drawWaveform(canvas, audioBuffer) {
        var ctx = canvas.getContext('2d');
        var width = canvas.width;
        var height = canvas.height;
        var data = audioBuffer.getChannelData(0);
        var samplesPerPixel = Math.max(1, Math.floor(data.length / width));

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#201547';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ff3796';

        var mid = height / 2;
        for (var px = 0; px < width; px++) {
            var start = px * samplesPerPixel;
            var min = 1.0, max = -1.0;
            for (var i = 0; i < samplesPerPixel; i++) {
                var sample = data[start + i] || 0;
                if (sample < min) min = sample;
                if (sample > max) max = sample;
            }
            var y1 = mid + min * mid;
            var y2 = mid + max * mid;
            ctx.fillRect(px, y1, 1, Math.max(1, y2 - y1));
        }
    }

    Studio.trimTool.audio = { open: open };
})(window.Studio);
