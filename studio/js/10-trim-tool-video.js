(function (Studio) {
    'use strict';

    var MIN_GAP = 0.5;

    function open(videoFile, existing) {
        return new Promise(function (resolve, reject) {
            var objectUrl = URL.createObjectURL(videoFile);
            var video = document.createElement('video');
            video.src = objectUrl;
            // 'auto' so the browser starts buffering actual frame data right
            // away (while the user reads the hint / drags handles), instead
            // of only starting to fetch it the moment they click Preview —
            // that's what made a long video feel slow to start playing.
            video.preload = 'auto';
            video.muted = false;

            video.addEventListener('loadedmetadata', function () {
                buildModal(video, objectUrl, existing, resolve, reject);
            });
            video.addEventListener('error', function () {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('تعذّر تحميل الفيديو'));
            });
        });
    }

    function buildModal(video, objectUrl, existing, resolve, reject) {
        var duration = video.duration;
        var trimStart = existing && existing.trimStart != null ? existing.trimStart : 0;
        var trimEnd = existing && existing.trimEnd != null ? existing.trimEnd : duration;

        var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
        var box = Studio.util.el('div', { class: 'studio-modal-box trim-modal-box' });
        var title = Studio.util.el('h3', { text: 'قص الفيديو' });
        var hint = Studio.util.el('p', { class: 'modal-hint', text: 'اسحب المقبضين لتحديد الجزء الذي سيتم تشغيله في اللعبة.' });

        video.style.width = '100%';
        video.style.maxHeight = '300px';
        video.controls = false;

        var scrubWrap = Studio.util.el('div', { class: 'trim-wave-wrap trim-video-scrub' });
        var track = Studio.util.el('div', { class: 'trim-video-track' });
        var handleStart = Studio.util.el('div', { class: 'trim-handle trim-handle-start' });
        var handleEnd = Studio.util.el('div', { class: 'trim-handle trim-handle-end' });
        scrubWrap.appendChild(track);
        scrubWrap.appendChild(handleStart);
        scrubWrap.appendChild(handleEnd);

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
        box.appendChild(video);
        box.appendChild(scrubWrap);
        box.appendChild(hint2);
        box.appendChild(timeInputsRow);
        box.appendChild(previewBtn);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Measure the ACTUAL rendered width (not a guessed constant) so handle
        // positions and drag math always agree with what's on screen.
        var scrubWidth = Math.round(scrubWrap.getBoundingClientRect().width);
        function timeToX(t) { return (t / duration) * scrubWidth; }
        function xToTime(x) { return Studio.util.clamp((x / scrubWidth) * duration, 0, duration); }

        function updateHandles() {
            handleStart.style.left = timeToX(trimStart) + 'px';
            handleEnd.style.left = timeToX(trimEnd) + 'px';
            if (document.activeElement !== startInput) startInput.value = Studio.util.formatTime(trimStart);
            if (document.activeElement !== endInput) endInput.value = Studio.util.formatTime(trimEnd);
            durationLabel.textContent = '/ ' + Studio.util.formatTime(duration);
        }
        updateHandles();
        video.currentTime = trimStart;

        function commitStartInput() {
            var t = Studio.util.parseTime(startInput.value);
            if (!isNaN(t)) {
                trimStart = Studio.util.clamp(t, 0, trimEnd - MIN_GAP);
                video.currentTime = trimStart;
            }
            updateHandles();
        }
        function commitEndInput() {
            var t = Studio.util.parseTime(endInput.value);
            if (!isNaN(t)) {
                trimEnd = Studio.util.clamp(t, trimStart + MIN_GAP, duration);
                video.currentTime = trimEnd;
            }
            updateHandles();
        }
        startInput.addEventListener('change', commitStartInput);
        startInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commitStartInput(); startInput.blur(); } });
        endInput.addEventListener('change', commitEndInput);
        endInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commitEndInput(); endInput.blur(); } });

        var unbindEnforcement = Studio.util.bindTrimEnforcement(
            video,
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
            var rectBox = scrubWrap.getBoundingClientRect();
            var clientX = e.touches ? e.touches[0].clientX : e.clientX;
            var x = Studio.util.clamp(clientX - rectBox.left, 0, scrubWidth);
            var t = xToTime(x);
            if (dragTarget === 'start') {
                trimStart = Studio.util.clamp(t, 0, trimEnd - MIN_GAP);
            } else {
                trimEnd = Studio.util.clamp(t, trimStart + MIN_GAP, duration);
            }
            updateHandles();
            video.currentTime = dragTarget === 'start' ? trimStart : trimEnd;
        }
        function onUp() { dragTarget = null; }

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);

        function onResize() {
            scrubWidth = Math.round(scrubWrap.getBoundingClientRect().width);
            updateHandles();
        }
        window.addEventListener('resize', onResize);

        var previewBtnDefaultText = previewBtn.textContent;
        previewBtn.addEventListener('click', function () {
            // play() MUST be called synchronously inside the click handler —
            // browsers require unmuted playback to start within the actual
            // gesture. Deferring it until after a 'seeked' event (as a
            // previous version of this code did) falls outside that window
            // and the browser can silently refuse to play. The seek and the
            // play both still happen; the browser just sequences them
            // internally instead of us waiting for it.
            video.currentTime = trimStart;
            video.play();

            if (video.readyState < 3) { // not enough buffered to play smoothly yet
                previewBtn.disabled = true;
                previewBtn.textContent = '⏳ جارِ التحميل...';
                var done = false;
                function clearLoading() {
                    if (done) return;
                    done = true;
                    video.removeEventListener('playing', clearLoading);
                    previewBtn.disabled = false;
                    previewBtn.textContent = previewBtnDefaultText;
                }
                video.addEventListener('playing', clearLoading);
                setTimeout(clearLoading, 4000);
            }
        });

        function cleanup() {
            video.pause();
            unbindEnforcement();
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('resize', onResize);
            overlay.remove();
            URL.revokeObjectURL(objectUrl);
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

    Studio.trimTool.video = { open: open };
})(window.Studio);
