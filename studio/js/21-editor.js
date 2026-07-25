(function (Studio) {
    'use strict';

    var rootEl = null;
    var currentGame = null;
    var autosave = null;
    var editorMode = 'settings'; // 'settings' | 'categories' | 'category'
    var activeCategoryId = null;

    var TYPE_LABELS = { text: 'نص', image: 'صورة', audio: 'صوت', video: 'فيديو' };
    var TYPE_ICONS_DEFAULT = { text: '📝', image: '🖼️', audio: '🎙️', video: '🎬' };

    function mount(el) {
        rootEl = el;
    }

    function open(gameId) {
        Studio.games.load(gameId).then(function (game) {
            currentGame = game;
            editorMode = 'settings';
            activeCategoryId = null;
            autosave = Studio.autosave.create(gameId, function () { return currentGame; });
            Studio.app.showView('editor-view');
            render();
        }).catch(function (err) {
            Studio.util.showToast('تعذّر فتح اللعبة: ' + err.message, 'error');
        });
    }

    function markDirty() {
        autosave.markDirty();
    }

    function goToSettings() {
        editorMode = 'settings';
        activeCategoryId = null;
        render();
    }

    function goToCategories() {
        editorMode = 'categories';
        activeCategoryId = null;
        render();
    }

    function enterCategory(categoryId) {
        editorMode = 'category';
        activeCategoryId = categoryId;
        render();
    }

    function getActiveCategory() {
        return currentGame.categories.find(function (c) { return c.id === activeCategoryId; });
    }

    function render() {
        rootEl.innerHTML = '';

        var header = Studio.util.el('div', { class: 'editor-header' });
        var backBtn = Studio.util.el('button', { class: 'btn-secondary', text: '← رجوع للوحة الرئيسية' });
        backBtn.addEventListener('click', function () {
            Studio.app.showView('dashboard-view');
            Studio.dashboard.refreshGrid();
        });
        header.appendChild(backBtn);

        var indicator = Studio.util.el('span', { class: 'autosave-indicator saved', text: 'تم الحفظ ✓' });
        header.appendChild(indicator);
        autosave.attach(indicator);

        rootEl.appendChild(header);

        if (editorMode === 'category') {
            var activeCategory = getActiveCategory();
            if (activeCategory) {
                rootEl.appendChild(buildCategoryDetailView(activeCategory));
                return;
            }
            editorMode = 'categories'; // category no longer exists, fall back
        }

        if (editorMode === 'categories') {
            var backToSettingsBtn = Studio.util.el('button', { class: 'btn-secondary step-back-btn', text: '→ رجوع للإعدادات' });
            backToSettingsBtn.addEventListener('click', goToSettings);
            rootEl.appendChild(backToSettingsBtn);
            rootEl.appendChild(buildCategoryOverviewSection());
        } else {
            editorMode = 'settings';
            rootEl.appendChild(buildSettingsSection());
            var nextBtn = Studio.util.el('button', { class: 'btn-primary btn-large step-next-btn', text: 'التالي: الفئات ←' });
            nextBtn.addEventListener('click', goToCategories);
            rootEl.appendChild(nextBtn);
        }
    }

    // ---------- Settings (theme + timer) ----------

    function buildSettingsSection() {
        var section = Studio.util.el('div', { class: 'editor-section editor-settings' });
        section.appendChild(Studio.util.el('h3', { text: 'إعدادات اللعبة' }));

        var nameRow = Studio.util.el('div', { class: 'form-row' });
        nameRow.appendChild(Studio.util.el('label', { text: 'اسم اللعبة:' }));
        var nameInput = Studio.util.el('input', { type: 'text', class: 'editor-game-name', value: currentGame.name });
        nameInput.addEventListener('input', function () {
            currentGame.name = nameInput.value;
            markDirty();
        });
        nameRow.appendChild(nameInput);
        section.appendChild(nameRow);

        var timerRow = Studio.util.el('div', { class: 'form-row' });
        timerRow.appendChild(Studio.util.el('label', { text: 'مدة المؤقت (بالثواني):' }));
        var timerInput = Studio.util.el('input', { type: 'number', min: '10', max: '300', value: currentGame.settings.timerSeconds });
        timerInput.addEventListener('input', function () {
            var v = parseInt(timerInput.value, 10);
            if (!isNaN(v) && v > 0) {
                currentGame.settings.timerSeconds = v;
                markDirty();
            }
        });
        timerRow.appendChild(timerInput);
        section.appendChild(timerRow);

        section.appendChild(Studio.util.el('label', { text: 'لون اللعبة:' }));
        var swatchRow = Studio.util.el('div', { class: 'theme-swatch-row' });
        var theme = currentGame.settings.theme;
        Studio.theme.PRESETS.forEach(function (preset) {
            var isSelected = theme.presetId === preset.id;
            var sw = Studio.util.el('button', {
                class: 'theme-swatch-btn' + (isSelected ? ' selected' : ''),
                style: 'background:' + preset.colors.bg + ';border-color:' + preset.colors.accent + ';',
                title: preset.name
            });
            sw.addEventListener('click', function () {
                theme.presetId = preset.id;
                theme.colors = preset.colors;
                markDirty();
                render();
            });
            swatchRow.appendChild(sw);
        });
        var advancedBtn = Studio.util.el('button', { class: 'btn-secondary theme-advanced-btn', text: 'تخصيص متقدم' });
        advancedBtn.addEventListener('click', function () { openAdvancedThemeModal(); });
        swatchRow.appendChild(advancedBtn);
        section.appendChild(swatchRow);

        return section;
    }

    function openAdvancedThemeModal() {
        var theme = currentGame.settings.theme;
        var base = theme.presetId === 'custom' ? theme.colors : Studio.theme.getPreset(theme.presetId).colors;
        var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
        var box = Studio.util.el('div', { class: 'studio-modal-box' });
        box.appendChild(Studio.util.el('h3', { text: 'ألوان مخصصة' }));

        var fields = {};
        [['bg', 'الخلفية'], ['accent', 'اللون الأساسي'], ['highlight', 'لون التمييز'], ['text', 'لون النص']].forEach(function (pair) {
            var row = Studio.util.el('div', { class: 'form-row' });
            row.appendChild(Studio.util.el('label', { text: pair[1] + ':' }));
            var input = Studio.util.el('input', { type: 'color', value: base[pair[0]] });
            fields[pair[0]] = input;
            row.appendChild(input);
            box.appendChild(row);
        });

        var btnRow = Studio.util.el('div', { class: 'modal-btn-row' });
        var applyBtn = Studio.util.el('button', { class: 'btn-primary', text: 'تطبيق' });
        var cancelBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'إلغاء' });
        btnRow.appendChild(applyBtn);
        btnRow.appendChild(cancelBtn);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        applyBtn.addEventListener('click', function () {
            theme.presetId = 'custom';
            theme.colors = {
                bg: fields.bg.value,
                accent: fields.accent.value,
                highlight: fields.highlight.value,
                text: fields.text.value
            };
            markDirty();
            overlay.remove();
            render();
        });
        cancelBtn.addEventListener('click', function () { overlay.remove(); });
    }

    // ---------- Category overview (grid of square tiles, no inline questions) ----------

    function buildCategoryOverviewSection() {
        var section = Studio.util.el('div', { class: 'editor-section' });
        var headerRow = Studio.util.el('div', { class: 'section-header-row' });
        headerRow.appendChild(Studio.util.el('h3', { text: 'الفئات (' + currentGame.categories.length + '/' + Studio.schema.MAX_CATEGORIES + ')' }));
        section.appendChild(headerRow);

        var grid = Studio.util.el('div', { class: 'category-tile-grid', id: 'category-list' });
        section.appendChild(grid);

        Studio.schema.normalizeOrder(currentGame.categories);
        currentGame.categories.forEach(function (cat) {
            grid.appendChild(buildCategoryTile(cat));
        });

        if (Studio.schema.canAddCategory(currentGame)) {
            var addTile = Studio.util.el('button', { class: 'category-tile add-tile', type: 'button', text: '+' });
            addTile.addEventListener('click', openAddCategoryModal);
            grid.appendChild(addTile);
        }

        Studio.dnd.makeSortable(grid, {
            itemSelector: '.category-tile:not(.add-tile)',
            onReorder: function (ids) {
                ids.forEach(function (id, idx) {
                    var cat = currentGame.categories.find(function (c) { return c.id === id; });
                    if (cat) cat.order = idx;
                });
                currentGame.categories.sort(function (a, b) { return a.order - b.order; });
                markDirty();
            }
        });

        return section;
    }

    function openAddCategoryModal() {
        if (!Studio.schema.canAddCategory(currentGame)) {
            Studio.util.showToast('لا يمكن إضافة أكثر من ' + Studio.schema.MAX_CATEGORIES + ' فئات.', 'error');
            return;
        }
        var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
        var box = Studio.util.el('div', { class: 'studio-modal-box' });
        box.appendChild(Studio.util.el('h3', { text: 'فئة جديدة' }));

        var nameInput = Studio.util.el('input', { type: 'text', placeholder: 'اسم الفئة' });
        box.appendChild(nameInput);

        var selectedIcon = TYPE_ICONS_DEFAULT.text;
        var iconRow = Studio.util.el('div', { class: 'form-row' });
        iconRow.appendChild(Studio.util.el('label', { text: 'الرمز:' }));
        var iconPickBtn = Studio.util.el('button', { class: 'btn-secondary emoji-pick-btn', type: 'button', text: selectedIcon });
        iconPickBtn.addEventListener('click', function () {
            Studio.emojiPicker.open(selectedIcon).then(function (emoji) {
                selectedIcon = emoji;
                iconManuallySet = true;
                iconPickBtn.textContent = emoji;
            }).catch(function () { /* cancelled */ });
        });
        iconRow.appendChild(iconPickBtn);
        box.appendChild(iconRow);

        box.appendChild(Studio.util.el('label', { text: 'نوع الأسئلة (لا يمكن تغييره لاحقاً):' }));
        var typeRow = Studio.util.el('div', { class: 'type-select-row' });
        var selectedType = 'text';
        var iconManuallySet = false;

        var videoModeRow = Studio.util.el('div', { class: 'form-row hidden' });
        var audioOnlyReveal = false;
        var videoModeCheckbox = Studio.util.el('input', { type: 'checkbox', id: 'video-mode-checkbox' });
        videoModeCheckbox.addEventListener('change', function () { audioOnlyReveal = videoModeCheckbox.checked; });
        var videoModeLabel = Studio.util.el('label', { text: '🔇 صوت فقط أثناء السؤال، ثم زر لإظهار الفيديو', for: 'video-mode-checkbox' });
        videoModeRow.appendChild(videoModeCheckbox);
        videoModeRow.appendChild(videoModeLabel);

        Object.keys(TYPE_LABELS).forEach(function (type, idx) {
            var btn = Studio.util.el('button', { class: 'type-select-btn' + (idx === 0 ? ' selected' : ''), type: 'button', text: TYPE_ICONS_DEFAULT[type] + ' ' + TYPE_LABELS[type] });
            btn.addEventListener('click', function () {
                selectedType = type;
                Studio.util.$$('.type-select-btn', typeRow).forEach(function (b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                if (!iconManuallySet) {
                    selectedIcon = TYPE_ICONS_DEFAULT[type];
                    iconPickBtn.textContent = selectedIcon;
                }
                videoModeRow.classList.toggle('hidden', type !== 'video');
            });
            typeRow.appendChild(btn);
        });
        box.appendChild(typeRow);
        box.appendChild(videoModeRow);

        var btnRow = Studio.util.el('div', { class: 'modal-btn-row' });
        var createBtn = Studio.util.el('button', { class: 'btn-primary', text: 'إضافة' });
        var cancelBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'إلغاء' });
        btnRow.appendChild(createBtn);
        btnRow.appendChild(cancelBtn);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        nameInput.focus();

        createBtn.addEventListener('click', function () {
            var name = nameInput.value.trim();
            if (!name) { Studio.util.showToast('الرجاء إدخال اسم الفئة.', 'error'); return; }
            var cat = Studio.schema.blankCategory({
                name: name,
                icon: selectedIcon,
                type: selectedType,
                audioOnlyReveal: selectedType === 'video' && audioOnlyReveal,
                order: currentGame.categories.length
            });
            currentGame.categories.push(cat);
            markDirty();
            overlay.remove();
            enterCategory(cat.id);
        });
        cancelBtn.addEventListener('click', function () { overlay.remove(); });
    }

    function buildCategoryTile(category) {
        var tile = Studio.util.el('button', { class: 'category-tile', type: 'button', draggable: 'true' });
        tile.dataset.id = category.id;
        tile.appendChild(Studio.util.el('span', { class: 'category-tile-icon', text: category.icon || '❓' }));
        tile.appendChild(Studio.util.el('span', { class: 'category-tile-label', text: category.name || '(بلا اسم)' }));
        tile.appendChild(Studio.util.el('span', { class: 'category-tile-count', text: category.questions.length + ' سؤال' }));
        tile.addEventListener('click', function () { enterCategory(category.id); });

        var deleteBtn = Studio.util.el('button', { class: 'tile-delete-btn', type: 'button', text: '×' });
        deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            Studio.dialog.confirm('حذف فئة "' + category.name + '" وكل أسئلتها؟', { danger: true }).then(function (ok) {
                if (!ok) return;
                currentGame.categories = currentGame.categories.filter(function (c) { return c.id !== category.id; });
                Studio.schema.normalizeOrder(currentGame.categories);
                markDirty();
                render();
            });
        });
        tile.appendChild(deleteBtn);

        return tile;
    }

    // ---------- Category detail (dedicated screen for one category's questions) ----------

    function buildCategoryDetailView(category) {
        var wrap = Studio.util.el('div', { class: 'editor-section category-detail' });

        var backBtn = Studio.util.el('button', { class: 'btn-secondary', text: '→ كل الفئات' });
        backBtn.addEventListener('click', goToCategories);
        wrap.appendChild(backBtn);

        var titleRow = Studio.util.el('div', { class: 'category-detail-title-row' });
        var iconBtn = Studio.util.el('button', { class: 'btn-secondary emoji-pick-btn', type: 'button', text: category.icon || '❓' });
        iconBtn.addEventListener('click', function () {
            Studio.emojiPicker.open(category.icon).then(function (emoji) {
                category.icon = emoji;
                iconBtn.textContent = emoji;
                markDirty();
            }).catch(function () { /* cancelled */ });
        });
        titleRow.appendChild(iconBtn);
        var nameInput = Studio.util.el('input', { type: 'text', class: 'category-name-input', value: category.name });
        nameInput.addEventListener('input', function () { category.name = nameInput.value; markDirty(); });
        titleRow.appendChild(nameInput);
        titleRow.appendChild(Studio.util.el('span', { class: 'type-badge', text: TYPE_ICONS_DEFAULT[category.type] + ' ' + TYPE_LABELS[category.type] }));
        wrap.appendChild(titleRow);

        if (category.type === 'video') {
            var videoModeRow = Studio.util.el('div', { class: 'form-row' });
            var checkboxId = 'video-mode-' + category.id;
            var videoModeCheckbox = Studio.util.el('input', { type: 'checkbox', id: checkboxId });
            videoModeCheckbox.checked = !!category.audioOnlyReveal;
            videoModeCheckbox.addEventListener('change', function () {
                category.audioOnlyReveal = videoModeCheckbox.checked;
                markDirty();
            });
            videoModeRow.appendChild(videoModeCheckbox);
            videoModeRow.appendChild(Studio.util.el('label', { text: '🔇 صوت فقط أثناء السؤال، ثم زر لإظهار الفيديو', for: checkboxId }));
            wrap.appendChild(videoModeRow);
        }

        wrap.appendChild(buildQuestionTileGrid(category));

        return wrap;
    }

    // ---------- Questions: grid of small numbered tiles, click to edit in a modal ----------

    function hasContent(category, question) {
        return category.type === 'text' ? !!(question.prompt && question.prompt.trim()) : !!question.media;
    }

    function buildQuestionTileGrid(category) {
        var wrap = Studio.util.el('div', { class: 'question-tile-grid' });
        Studio.schema.normalizeOrder(category.questions);
        category.questions.forEach(function (q, idx) {
            wrap.appendChild(buildQuestionTile(category, q, idx));
        });

        var addTile = Studio.util.el('button', { class: 'question-tile add-tile', type: 'button', text: '+' });
        addTile.addEventListener('click', function () {
            var q = Studio.schema.blankQuestion(category.questions.length);
            category.questions.push(q);
            markDirty();
            render();
            openQuestionEditModal(category, q);
        });
        wrap.appendChild(addTile);

        Studio.dnd.makeSortable(wrap, {
            itemSelector: '.question-tile:not(.add-tile)',
            onReorder: function (ids) {
                ids.forEach(function (id, idx) {
                    var q = category.questions.find(function (qq) { return qq.id === id; });
                    if (q) q.order = idx;
                });
                category.questions.sort(function (a, b) { return a.order - b.order; });
                markDirty();
            }
        });

        return wrap;
    }

    function buildQuestionTile(category, question, idx) {
        var filled = hasContent(category, question);
        var tile = Studio.util.el('button', { class: 'question-tile' + (filled ? ' filled' : ''), type: 'button', draggable: 'true' });
        tile.dataset.id = question.id;
        tile.appendChild(Studio.util.el('span', { class: 'question-tile-number', text: String(idx + 1) }));
        if (filled) tile.appendChild(Studio.util.el('span', { class: 'question-tile-check', text: '✓' }));
        tile.addEventListener('click', function () { openQuestionEditModal(category, question); });

        var deleteBtn = Studio.util.el('button', { class: 'tile-delete-btn', type: 'button', text: '×' });
        deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            Studio.dialog.confirm('حذف هذا السؤال؟', { danger: true }).then(function (ok) {
                if (!ok) return;
                category.questions = category.questions.filter(function (q) { return q.id !== question.id; });
                Studio.schema.normalizeOrder(category.questions);
                markDirty();
                render();
            });
        });
        tile.appendChild(deleteBtn);

        return tile;
    }

    // ---------- Question edit modal (prompt, media, answer for ONE question) ----------

    function openQuestionEditModal(category, question) {
        var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
        var box = Studio.util.el('div', { class: 'studio-modal-box question-edit-modal' });
        box.appendChild(Studio.util.el('h3', { text: 'تعديل السؤال' }));
        var body = Studio.util.el('div');
        box.appendChild(body);
        var doneBtn = Studio.util.el('button', { class: 'btn-primary', text: 'تم' });
        doneBtn.addEventListener('click', function () {
            overlay.remove();
            render(); // refresh the tile grid (filled state / question count)
        });
        box.appendChild(Studio.util.el('div', { class: 'modal-btn-row' }, [doneBtn]));
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        function refreshBody() {
            body.innerHTML = '';

            var promptInput = Studio.util.el('textarea', { class: 'question-prompt-input', placeholder: category.type === 'text' ? 'نص السؤال...' : 'نص إضافي (اختياري)...' });
            promptInput.value = question.prompt || '';
            promptInput.addEventListener('input', function () { question.prompt = promptInput.value; markDirty(); });
            body.appendChild(promptInput);

            if (category.type !== 'text') {
                body.appendChild(buildMediaControls(category, question, refreshBody));
            }

            var answerRow = Studio.util.el('div', { class: 'answer-row' });
            answerRow.appendChild(Studio.util.el('label', { text: 'الإجابة (اختياري، تظهر بزر "إظهار الإجابة"):' }));
            var answerInput = Studio.util.el('input', { type: 'text', value: question.answer || '' });
            answerInput.addEventListener('input', function () { question.answer = answerInput.value; markDirty(); });
            answerRow.appendChild(answerInput);
            body.appendChild(answerRow);

            var actionRow = Studio.util.el('div', { class: 'question-modal-actions' });
            if (category.type !== 'text' && question.media) {
                var previewBtn = Studio.util.el('button', { class: 'btn-secondary', text: '👁 معاينة' });
                previewBtn.addEventListener('click', function () { openPreviewModal(category, question); });
                actionRow.appendChild(previewBtn);
            }
            body.appendChild(actionRow);
        }
        refreshBody();
    }

    function buildMediaControls(category, question, onChange) {
        var wrap = Studio.util.el('div', { class: 'media-controls' });
        var media = question.media;

        if (media) {
            wrap.appendChild(Studio.util.el('span', { class: 'media-status', text: '✓ تم الرفع: ' + (media.originalName || '') }));
            if (media.sizeBytes && media.sizeBytes > Studio.schema.LARGE_FILE_WARNING_BYTES) {
                wrap.appendChild(Studio.util.el('div', { class: 'warning-banner', text: '⚠ هذا الملف كبير الحجم وقد يبطئ التحميل أثناء اللعب.' }));
            }
        }

        if (category.type === 'image') {
            var uploadBtn = Studio.util.el('button', { class: 'btn-secondary', text: media ? 'استبدال الصورة' : 'رفع صورة' });
            var fileInput = Studio.util.el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
            uploadBtn.addEventListener('click', function () { fileInput.click(); });
            fileInput.addEventListener('change', function () {
                if (fileInput.files[0]) handleImageUpload(category, question, fileInput.files[0], onChange);
            });
            wrap.appendChild(uploadBtn);
            wrap.appendChild(fileInput);

            if (media) {
                var recropBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'إعادة القص' });
                recropBtn.addEventListener('click', function () { handleRecrop(category, question, onChange); });
                wrap.appendChild(recropBtn);
            }
        } else if (category.type === 'audio' || category.type === 'video') {
            var accept = category.type === 'audio' ? 'audio/*' : 'video/*';
            var uploadBtn2 = Studio.util.el('button', { class: 'btn-secondary', text: media ? 'استبدال الملف' : 'رفع ملف' });
            var fileInput2 = Studio.util.el('input', { type: 'file', accept: accept, class: 'hidden' });
            uploadBtn2.addEventListener('click', function () { fileInput2.click(); });
            fileInput2.addEventListener('change', function () {
                if (fileInput2.files[0]) handleAvUpload(category, question, fileInput2.files[0], onChange);
            });
            wrap.appendChild(uploadBtn2);
            wrap.appendChild(fileInput2);

            if (media) {
                wrap.appendChild(Studio.util.el('span', { class: 'trim-summary', text: 'المقطع: ' + Studio.util.formatTime(media.trimStart || 0) + ' - ' + Studio.util.formatTime(media.trimEnd || media.durationHint || 0) }));
                var retrimBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'تعديل القص' });
                retrimBtn.addEventListener('click', function () { handleRetrim(category, question, onChange); });
                wrap.appendChild(retrimBtn);
            }
        }

        return wrap;
    }

    function handleImageUpload(category, question, file, onChange) {
        Studio.cropTool.open(file).then(function (blob) {
            return Studio.games.getMediaDir(currentGame.id, 'images').then(function (dir) {
                var filename = question.id + '.jpg';
                // Keep the original uncropped upload too (under its own name),
                // so the full, un-cropped picture can be revealed after the
                // question — e.g. a cropped "who is this?" mystery photo
                // followed by the full photo once they've answered.
                var fullExt = getExt(file.name) || 'jpg';
                var fullFilename = question.id + '-full.' + fullExt;
                return Promise.all([
                    Studio.fs.writeBinary(dir, filename, blob),
                    Studio.fs.writeBinary(dir, fullFilename, file)
                ]).then(function () {
                    question.media = {
                        kind: 'image',
                        file: 'media/images/' + filename,
                        fullFile: 'media/images/' + fullFilename,
                        originalName: file.name
                    };
                    markDirty();
                    onChange();
                });
            });
        }).catch(function (err) {
            if (err.message !== 'cancelled') Studio.util.showToast('فشل رفع الصورة: ' + err.message, 'error');
        });
    }

    function handleRecrop(category, question, onChange) {
        var media = question.media;
        // Re-crop from the saved original (not the already-cropped file) so
        // re-cropping never loses context/quality. Older questions saved
        // before this existed fall back to the cropped file itself.
        var sourceFilename = Studio.games.basename(media.fullFile || media.file);
        Studio.games.getMediaDir(currentGame.id, 'images').then(function (dir) {
            return Studio.fs.readBinaryAsBlob(dir, sourceFilename);
        }).then(function (blob) {
            return Studio.cropTool.open(blob);
        }).then(function (newBlob) {
            return Studio.games.getMediaDir(currentGame.id, 'images').then(function (dir) {
                var filename = Studio.games.basename(media.file);
                return Studio.fs.writeBinary(dir, filename, newBlob).then(function () {
                    markDirty();
                    Studio.util.showToast('تم تحديث القص.', 'success');
                    onChange();
                });
            });
        }).catch(function (err) {
            if (err.message !== 'cancelled') Studio.util.showToast('فشل إعادة القص: ' + err.message, 'error');
        });
    }

    function getExt(filename) {
        var parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    function handleAvUpload(category, question, file, onChange) {
        var tool = category.type === 'audio' ? Studio.trimTool.audio : Studio.trimTool.video;
        tool.open(file, null).then(function (trim) {
            var kindDir = category.type;
            return Studio.games.getMediaDir(currentGame.id, kindDir).then(function (dir) {
                var ext = getExt(file.name) || (category.type === 'audio' ? 'mp3' : 'mp4');
                var filename = question.id + '.' + ext;
                return Studio.fs.writeBinary(dir, filename, file).then(function () {
                    question.media = {
                        kind: category.type,
                        file: 'media/' + kindDir + '/' + filename,
                        originalName: file.name,
                        trimStart: trim.trimStart,
                        trimEnd: trim.trimEnd,
                        durationHint: trim.duration,
                        sizeBytes: file.size
                    };
                    markDirty();
                    onChange();
                    if (file.size > Studio.schema.LARGE_FILE_WARNING_BYTES) {
                        Studio.util.showToast('تنبيه: حجم الملف كبير وقد يبطئ التحميل أثناء اللعب.', 'warning');
                    }
                });
            });
        }).catch(function (err) {
            if (err.message !== 'cancelled') Studio.util.showToast('فشل رفع الملف: ' + err.message, 'error');
        });
    }

    function handleRetrim(category, question, onChange) {
        var media = question.media;
        var kindDir = category.type;
        Studio.games.getMediaDir(currentGame.id, kindDir).then(function (dir) {
            return Studio.fs.readBinaryAsBlob(dir, Studio.games.basename(media.file));
        }).then(function (blob) {
            var tool = category.type === 'audio' ? Studio.trimTool.audio : Studio.trimTool.video;
            return tool.open(blob, media);
        }).then(function (trim) {
            media.trimStart = trim.trimStart;
            media.trimEnd = trim.trimEnd;
            media.durationHint = trim.duration;
            markDirty();
            onChange();
        }).catch(function (err) {
            if (err.message !== 'cancelled') Studio.util.showToast('فشل تعديل القص: ' + err.message, 'error');
        });
    }

    // ---------- Preview modal ----------

    function openPreviewModal(category, question) {
        var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
        var box = Studio.util.el('div', { class: 'studio-modal-box preview-modal-box' });
        box.appendChild(Studio.util.el('h3', { text: 'معاينة السؤال' }));
        var body = Studio.util.el('div', { class: 'preview-body' });
        box.appendChild(body);
        var closeBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'إغلاق' });
        box.appendChild(closeBtn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var cleanupFn = null;
        closeBtn.addEventListener('click', function () {
            if (cleanupFn) cleanupFn();
            overlay.remove();
        });

        if (!question.media && category.type !== 'text') {
            body.appendChild(Studio.util.el('p', { text: 'لم يتم رفع ملف بعد لهذا السؤال.' }));
            return;
        }

        Studio.questionRenderer.render(question, category.type, function (media) {
            return Studio.games.resolveMediaUrl(currentGame.id, media);
        }, { audioOnlyReveal: category.audioOnlyReveal }).then(function (result) {
            body.appendChild(result.el);
            cleanupFn = result.cleanup;
        }).catch(function (err) {
            body.appendChild(Studio.util.el('p', { text: 'تعذّرت المعاينة: ' + err.message }));
        });
    }

    Studio.editor = {
        mount: mount,
        open: open
    };
})(window.Studio);
