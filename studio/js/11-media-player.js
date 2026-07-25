(function (Studio) {
    'use strict';

    // The ONE implementation of trim-aware audio/video playback UI.
    // Used identically by the Editor's Preview modal and the real Play view.
    function create(question, objectUrl) {
        var media = question.media;
        var trimStart = media.trimStart || 0;
        var trimEnd = media.trimEnd != null ? media.trimEnd : null;
        var isVideo = media.kind === 'video';
        var hasTrim = trimStart > 0 || trimEnd != null;
        var fullMode = false; // when true, plays the whole original file instead of just the trimmed range

        var mediaEl = document.createElement(isVideo ? 'video' : 'audio');
        mediaEl.src = objectUrl;
        mediaEl.preload = 'metadata';
        if (isVideo) {
            mediaEl.className = 'media-player-video';
            mediaEl.playsInline = true;
        }

        var container = Studio.util.el('div', { class: 'audio-container' });
        if (isVideo) container.appendChild(mediaEl);

        var playBtn = Studio.util.el('button', { class: 'audio-play-btn' }, [
            Studio.util.el('div', { class: 'play-icon' })
        ]);
        var progressWrapper = Studio.util.el('div', { class: 'audio-progress-wrapper' }, [
            Studio.util.el('div', { class: 'audio-progress-bar' })
        ]);
        var progressBar = progressWrapper.querySelector('.audio-progress-bar');
        var timeDisplay = Studio.util.el('div', { class: 'audio-time', text: '0:00 / 0:00' });

        container.appendChild(playBtn);
        container.appendChild(progressWrapper);
        container.appendChild(timeDisplay);
        if (!isVideo) container.appendChild(mediaEl);

        var fullModeToggleBtn = null;
        if (hasTrim) {
            fullModeToggleBtn = Studio.util.el('button', { class: 'btn-secondary full-clip-toggle-btn', text: '🔁 تشغيل الملف كامل' });
            fullModeToggleBtn.addEventListener('click', function () {
                fullMode = !fullMode;
                fullModeToggleBtn.textContent = fullMode ? '✂️ العودة للمقطع المحدد' : '🔁 تشغيل الملف كامل';
                mediaEl.pause();
                mediaEl.currentTime = getStart();
                updateProgress();
            });
            container.appendChild(fullModeToggleBtn);
        }

        var effectiveEnd = trimEnd;

        function getStart() { return fullMode ? 0 : trimStart; }
        function getEnd() { return fullMode ? mediaEl.duration : effectiveEnd; }

        mediaEl.addEventListener('loadedmetadata', function () {
            if (effectiveEnd == null) effectiveEnd = mediaEl.duration;
            mediaEl.currentTime = getStart();
            updateProgress();
        });

        var unbindEnforcement = Studio.util.bindTrimEnforcement(mediaEl, getStart, getEnd);

        function getSpan() {
            var end = getEnd() != null ? getEnd() : mediaEl.duration || 0;
            return Math.max(0, end - getStart());
        }

        function updateProgress() {
            var span = getSpan();
            var elapsed = Studio.util.clamp(mediaEl.currentTime - getStart(), 0, span);
            var pct = span > 0 ? (elapsed / span) * 100 : 0;
            progressBar.style.width = pct + '%';
            timeDisplay.textContent = Studio.util.formatTime(elapsed) + ' / ' + Studio.util.formatTime(span);
            if (!mediaEl.paused) {
                progressWrapper.classList.add('playing');
                playBtn.classList.add('playing');
            } else {
                progressWrapper.classList.remove('playing');
                playBtn.classList.remove('playing');
            }
        }
        mediaEl.addEventListener('timeupdate', updateProgress);
        mediaEl.addEventListener('ended', updateProgress);

        function play() {
            if (mediaEl.currentTime < getStart() || (getEnd() != null && mediaEl.currentTime >= getEnd())) {
                mediaEl.currentTime = getStart();
            }
            mediaEl.play();
        }
        function pause() { mediaEl.pause(); }

        playBtn.addEventListener('click', function () {
            if (!mediaEl.paused) pause();
            else play();
        });

        function seekFromEvent(e) {
            var rect = progressWrapper.getBoundingClientRect();
            var clientX = e.touches ? e.touches[0].clientX : e.clientX;
            var ratio = Studio.util.clamp((clientX - rect.left) / rect.width, 0, 1);
            mediaEl.currentTime = getStart() + ratio * getSpan();
            updateProgress();
        }
        var seeking = false;
        progressWrapper.addEventListener('click', seekFromEvent);
        progressWrapper.addEventListener('mousedown', function (e) { seeking = true; seekFromEvent(e); });
        window.addEventListener('mousemove', function (e) { if (seeking) seekFromEvent(e); });
        window.addEventListener('mouseup', function () { seeking = false; });

        function destroy() {
            mediaEl.pause();
            unbindEnforcement();
            mediaEl.removeEventListener('timeupdate', updateProgress);
            mediaEl.src = '';
        }

        return { el: container, play: play, pause: pause, destroy: destroy };
    }

    Studio.mediaPlayer = { create: create };
})(window.Studio);
