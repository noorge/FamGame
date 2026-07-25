(function (Studio) {
    'use strict';

    // The ONLY place that switches on category.type to build question DOM.
    // resolveMediaUrl(media) must return a Promise<string> (an object URL).
    // categoryOpts is optional: { audioOnlyReveal } for video categories.
    // Returns a Promise<{ el, cleanup }>.
    function render(question, categoryType, resolveMediaUrl, categoryOpts) {
        categoryOpts = categoryOpts || {};
        var container = Studio.util.el('div', { class: 'question-render' });
        var cleanupFns = [];
        var activePlayer = null;

        if (question.prompt) {
            container.appendChild(Studio.util.el('div', { class: 'question-prompt', text: question.prompt }));
        }

        var bodyPromise = Promise.resolve();
        var hideVideo = categoryType === 'video' && categoryOpts.audioOnlyReveal;

        if (categoryType === 'text') {
            // nothing more to render — prompt already shown above
        } else if (categoryType === 'image' && question.media) {
            bodyPromise = resolveMediaUrl(question.media).then(function (url) {
                var img = Studio.util.el('img', { src: url, alt: question.prompt || '' });
                container.appendChild(img);
                cleanupFns.push(function () { URL.revokeObjectURL(url); });
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
            if (question.answer) {
                var answerBox = Studio.util.el('div', { class: 'answer-reveal hidden', text: question.answer });
                var revealBtn = Studio.util.el('button', { class: 'reveal-answer-btn', text: 'إظهار الإجابة' });
                revealBtn.addEventListener('click', function () {
                    answerBox.classList.toggle('hidden');
                    revealBtn.textContent = answerBox.classList.contains('hidden') ? 'إظهار الإجابة' : 'إخفاء الإجابة';
                });
                container.appendChild(revealBtn);
                container.appendChild(answerBox);
            }

            // For a cropped mystery photo, let the host reveal the original
            // full (uncropped) picture after everyone's answered.
            if (categoryType === 'image' && question.media && question.media.fullFile) {
                var fullImg = Studio.util.el('img', { class: 'full-image-reveal hidden' });
                var fullBtn = Studio.util.el('button', { class: 'reveal-answer-btn', text: 'إظهار الصورة كاملة' });
                var fullImgLoaded = false;
                fullBtn.addEventListener('click', function () {
                    var showing = !fullImg.classList.contains('hidden');
                    if (showing) {
                        fullImg.classList.add('hidden');
                        fullBtn.textContent = 'إظهار الصورة كاملة';
                        return;
                    }
                    if (!fullImgLoaded) {
                        fullImgLoaded = true;
                        resolveMediaUrl({ kind: 'image', file: question.media.fullFile }).then(function (url) {
                            fullImg.src = url;
                            cleanupFns.push(function () { URL.revokeObjectURL(url); });
                        });
                    }
                    fullImg.classList.remove('hidden');
                    fullBtn.textContent = 'إخفاء الصورة كاملة';
                });
                container.appendChild(fullBtn);
                container.appendChild(fullImg);
            }

            // Audio-only video question: reveal the picture on demand.
            // One-way reveal (no need to hide it again) — just shows it.
            if (hideVideo && question.media) {
                var revealVideoBtn = Studio.util.el('button', { class: 'reveal-answer-btn', text: '🎬 إظهار الفيديو' });
                revealVideoBtn.addEventListener('click', function () {
                    if (activePlayer) activePlayer.revealVideo();
                    revealVideoBtn.remove();
                });
                container.appendChild(revealVideoBtn);
            }

            return {
                el: container,
                cleanup: function () { cleanupFns.forEach(function (fn) { fn(); }); }
            };
        });
    }

    Studio.questionRenderer = { render: render };
})(window.Studio);
