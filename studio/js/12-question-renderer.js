(function (Studio) {
    'use strict';

    // Renders a crop as a "window" into the full image via CSS, instead of
    // needing a separately re-encoded cropped file — same non-destructive
    // idea as audio/video trim. Both the cropped window and a (hidden) full
    // view share the same already-resolved object URL.
    function buildCroppedImageBody(container, url, crop, altText) {
        var wrap = Studio.util.el('div', { class: 'cropped-image-wrap' });
        var croppedImg = Studio.util.el('img', { src: url, alt: altText || '', class: 'cropped-image-inner' });
        wrap.appendChild(croppedImg);
        container.appendChild(wrap);

        var fullImg = Studio.util.el('img', { src: url, alt: altText || '', class: 'hidden' });
        container.appendChild(fullImg);

        function layout() {
            if (!croppedImg.naturalWidth) return;
            var wrapWidth = wrap.clientWidth;
            if (!wrapWidth) return;
            var cropWpx = crop.width * croppedImg.naturalWidth;
            var cropHpx = crop.height * croppedImg.naturalHeight;
            var scale = wrapWidth / cropWpx;
            wrap.style.height = (cropHpx * scale) + 'px';
            croppedImg.style.width = (croppedImg.naturalWidth * scale) + 'px';
            croppedImg.style.height = (croppedImg.naturalHeight * scale) + 'px';
            croppedImg.style.left = (-crop.x * croppedImg.naturalWidth * scale) + 'px';
            croppedImg.style.top = (-crop.y * croppedImg.naturalHeight * scale) + 'px';
        }
        // Double rAF: wait until the caller has actually attached `container`
        // to the visible page (it isn't yet, at the point this runs), so
        // wrap.clientWidth reads a real value instead of 0.
        function scheduleLayout() {
            requestAnimationFrame(function () { requestAnimationFrame(layout); });
        }
        if (croppedImg.complete && croppedImg.naturalWidth) scheduleLayout();
        else croppedImg.addEventListener('load', scheduleLayout);
        window.addEventListener('resize', layout);

        return {
            showFull: function () { wrap.classList.add('hidden'); fullImg.classList.remove('hidden'); },
            showCropped: function () { wrap.classList.remove('hidden'); fullImg.classList.add('hidden'); },
            destroy: function () { window.removeEventListener('resize', layout); }
        };
    }

    // The ONLY place that switches on category.type to build question DOM.
    // resolveMediaUrl(media) must return a Promise<string> (an object URL).
    // categoryOpts is optional: { audioOnlyReveal } for video categories.
    // Returns a Promise<{ el, cleanup }>.
    function render(question, categoryType, resolveMediaUrl, categoryOpts) {
        categoryOpts = categoryOpts || {};
        var container = Studio.util.el('div', { class: 'question-render' });
        var cleanupFns = [];
        var activePlayer = null;
        var imageController = null;

        if (question.prompt) {
            container.appendChild(Studio.util.el('div', { class: 'question-prompt', text: question.prompt }));
        }

        var bodyPromise = Promise.resolve();
        var hideVideo = categoryType === 'video' && categoryOpts.audioOnlyReveal;

        if (categoryType === 'text') {
            // nothing more to render — prompt already shown above
        } else if (categoryType === 'image' && question.media) {
            bodyPromise = resolveMediaUrl(question.media).then(function (url) {
                if (question.media.crop) {
                    imageController = buildCroppedImageBody(container, url, question.media.crop, question.prompt || '');
                } else {
                    var img = Studio.util.el('img', { src: url, alt: question.prompt || '' });
                    container.appendChild(img);
                }
                cleanupFns.push(function () {
                    if (imageController) imageController.destroy();
                    URL.revokeObjectURL(url);
                });
            });
        } else if ((categoryType === 'audio' || categoryType === 'video') && question.media) {
            bodyPromise = resolveMediaUrl(question.media).then(function (url) {
                activePlayer = Studio.mediaPlayer.create(question, url, { hideVideoUntilRevealed: hideVideo });
                container.appendChild(activePlayer.el);
                cleanupFns.push(function () {
                    activePlayer.destroy();
                    URL.revokeObjectURL(url);
                });
            });
        }

        return bodyPromise.then(function () {
            // All reveal buttons live in one row together so they get
            // consistent spacing instead of sitting flush against each other.
            var actionsRow = Studio.util.el('div', { class: 'question-actions-row' });
            var extras = Studio.util.el('div', { class: 'question-actions-extras' });

            if (question.answer) {
                var answerBox = Studio.util.el('div', { class: 'answer-reveal hidden', text: question.answer });
                var revealBtn = Studio.util.el('button', { class: 'reveal-answer-btn', text: 'إظهار الإجابة' });
                revealBtn.addEventListener('click', function () {
                    answerBox.classList.toggle('hidden');
                    revealBtn.textContent = answerBox.classList.contains('hidden') ? 'إظهار الإجابة' : 'إخفاء الإجابة';
                });
                actionsRow.appendChild(revealBtn);
                extras.appendChild(answerBox);
            }

            // For a cropped mystery photo, let the host reveal the full
            // (uncropped) picture after everyone's answered.
            if (categoryType === 'image' && question.media && question.media.crop && imageController) {
                var showingFull = false;
                var fullBtn = Studio.util.el('button', { class: 'reveal-answer-btn', text: 'إظهار الصورة كاملة' });
                fullBtn.addEventListener('click', function () {
                    showingFull = !showingFull;
                    if (showingFull) {
                        imageController.showFull();
                        fullBtn.textContent = 'إخفاء الصورة كاملة';
                    } else {
                        imageController.showCropped();
                        fullBtn.textContent = 'إظهار الصورة كاملة';
                    }
                });
                actionsRow.appendChild(fullBtn);
            }

            // Audio-only video question: reveal the picture on demand.
            // One-way reveal (no need to hide it again) — just shows it.
            if (hideVideo && question.media) {
                var revealVideoBtn = Studio.util.el('button', { class: 'reveal-answer-btn', text: '🎬 إظهار الفيديو' });
                revealVideoBtn.addEventListener('click', function () {
                    if (activePlayer) activePlayer.revealVideo();
                    revealVideoBtn.remove();
                });
                actionsRow.appendChild(revealVideoBtn);
            }

            if (actionsRow.children.length) container.appendChild(actionsRow);
            if (extras.children.length) container.appendChild(extras);

            return {
                el: container,
                cleanup: function () { cleanupFns.forEach(function (fn) { fn(); }); }
            };
        });
    }

    Studio.questionRenderer = { render: render };
})(window.Studio);
