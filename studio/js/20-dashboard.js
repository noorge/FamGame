(function (Studio) {
    'use strict';

    var rootEl = null;

    function mount(el) {
        rootEl = el;
    }

    function render(state) {
        if (!rootEl) return;
        rootEl.innerHTML = '';

        var header = Studio.util.el('div', { class: 'dashboard-header' }, [
            Studio.util.el('h1', { text: '🎉 استوديو لعبة العائلة' }),
            Studio.util.el('p', { class: 'tagline', text: 'أنشئ، عدّل، والعب — كل شيء محفوظ على جهازك' })
        ]);
        rootEl.appendChild(header);

        if (state.needsFolderPick) {
            renderFolderPickGate(false);
            return;
        }
        if (state.needsReauth) {
            renderFolderPickGate(true, state.pendingHandle);
            return;
        }

        renderToolbar();
        var grid = Studio.util.el('div', { class: 'dashboard-grid', id: 'dashboard-grid' });
        rootEl.appendChild(grid);
        refreshGrid();
    }

    function pickNewFolder() {
        return Studio.fs.pickRootDirectory().then(function (handle) {
            return Studio.fs.ensureGamesRoot(handle).then(function (gamesRoot) {
                Studio.state.rootHandle = handle;
                Studio.state.gamesRoot = gamesRoot;
                Studio.util.showToast('تم فتح المجلد.', 'success');
                render({ needsFolderPick: false });
            });
        });
    }

    function renderFolderPickGate(isReauth, pendingHandle) {
        var msg = isReauth
            ? 'وجدت مجلد الألعاب السابق. اضغط لإعادة فتحه (مرة واحدة فقط في كل جلسة).'
            : 'اختر المجلد الذي ستُحفظ فيه ألعابك (يُفضّل اختيار مجلد Family Game).';
        var btn = Studio.util.el('button', { class: 'btn-primary btn-large', text: isReauth ? 'إعادة فتح مجلد الألعاب' : 'اختيار مجلد الألعاب' });
        btn.addEventListener('click', function () {
            var action = isReauth
                ? Studio.fs.requestPermission(pendingHandle).then(function (granted) {
                    if (!granted) throw new Error('لم يتم منح الإذن');
                    return pendingHandle;
                }).then(function (handle) {
                    return Studio.fs.ensureGamesRoot(handle).then(function (gamesRoot) {
                        Studio.state.rootHandle = handle;
                        Studio.state.gamesRoot = gamesRoot;
                        render({ needsFolderPick: false });
                    });
                })
                : pickNewFolder();

            action.catch(function (err) {
                Studio.util.showToast('تعذّر فتح هذا المجلد (ربما تم نقله أو حذفه). جرّب اختيار مجلد آخر بالأسفل.', 'error');
            });
        });
        var gateBox = Studio.util.el('div', { class: 'folder-gate' }, [
            Studio.util.el('p', { text: msg }),
            btn
        ]);

        if (isReauth) {
            var pickInsteadBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'أو اختر مجلداً آخر' });
            pickInsteadBtn.addEventListener('click', function () {
                pickNewFolder().catch(function (err) {
                    Studio.util.showToast('تعذّر فتح المجلد: ' + err.message, 'error');
                });
            });
            gateBox.appendChild(pickInsteadBtn);
        }

        rootEl.appendChild(gateBox);
    }

    function renderToolbar() {
        var toolbar = Studio.util.el('div', { class: 'dashboard-toolbar' });
        var createBtn = Studio.util.el('button', { class: 'btn-primary', text: '+ إنشاء لعبة جديدة' });
        createBtn.addEventListener('click', openCreateModal);
        toolbar.appendChild(createBtn);

        var importBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'استيراد اللعبة القديمة' });
        importBtn.addEventListener('click', function () {
            importBtn.disabled = true;
            Studio.legacyImport.run().then(function (result) {
                if (result && result.skipped) {
                    Studio.util.showToast('تم الاستيراد مسبقاً.', 'info');
                } else {
                    Studio.util.showToast('تم استيراد اللعبة القديمة بنجاح!', 'success');
                }
                refreshGrid();
            }).catch(function (err) {
                Studio.util.showToast('فشل الاستيراد: ' + err.message, 'error');
            }).finally(function () { importBtn.disabled = false; });
        });
        toolbar.appendChild(importBtn);

        // Always available — lets the user switch to a different folder, or
        // recover if the previously-picked one was moved/deleted (e.g. a
        // fresh clone on a new machine, or someone else's laptop).
        var changeFolderBtn = Studio.util.el('button', { class: 'btn-secondary', text: '📁 تغيير المجلد' });
        changeFolderBtn.addEventListener('click', function () {
            pickNewFolder().catch(function (err) {
                Studio.util.showToast('تعذّر فتح المجلد: ' + err.message, 'error');
            });
        });
        toolbar.appendChild(changeFolderBtn);

        rootEl.appendChild(toolbar);
    }

    function refreshGrid() {
        var grid = Studio.util.$('#dashboard-grid', rootEl);
        if (!grid) return;
        grid.innerHTML = '<p class="loading-text">جارِ التحميل...</p>';
        Studio.games.list().then(function (games) {
            grid.innerHTML = '';
            if (games.length === 0) {
                grid.appendChild(Studio.util.el('p', { class: 'empty-text', text: 'لا توجد ألعاب بعد. أنشئ لعبتك الأولى!' }));
                return;
            }
            games.forEach(function (g) {
                grid.appendChild(buildCard(g));
            });
        }).catch(function (err) {
            grid.innerHTML = '';
            grid.appendChild(Studio.util.el('p', { class: 'empty-text', text: '⚠ تعذّر الوصول إلى هذا المجلد (ربما تم نقله أو حذفه). استخدم زر "تغيير المجلد" أعلاه لاختيار مجلد آخر.' }));
            Studio.util.showToast('خطأ: ' + err.message, 'error');
        });
    }

    function buildCard(game) {
        var swatch = Studio.util.el('div', { class: 'game-card-swatch', style: 'background:' + game.colors.bg + ';border-color:' + game.colors.accent + ';' }, [
            Studio.util.el('h3', { class: 'game-card-name', text: game.name })
        ]);
        var card = Studio.util.el('div', { class: 'game-card' });
        card.appendChild(swatch);
        card.appendChild(Studio.util.el('p', { class: 'game-card-meta', text: game.categoryCount + ' فئات · آخر تعديل ' + formatDate(game.updatedAt) }));

        var mainRow = Studio.util.el('div', { class: 'game-card-main-actions' });

        var playBtn = Studio.util.el('button', { class: 'btn-primary', title: 'العب', text: '▶' });
        playBtn.addEventListener('click', function () { Studio.play.start(game.id); });

        var editBtn = Studio.util.el('button', { class: 'btn-secondary', title: 'تعديل', text: '✎' });
        editBtn.addEventListener('click', function () { Studio.editor.open(game.id); });

        mainRow.appendChild(playBtn);
        mainRow.appendChild(editBtn);
        card.appendChild(mainRow);

        var iconRow = Studio.util.el('div', { class: 'game-card-icon-actions' });

        var dupBtn = Studio.util.el('button', { class: 'icon-action-btn', title: 'نسخ', text: '⧉' });
        dupBtn.addEventListener('click', function () {
            Studio.dialog.prompt('اسم النسخة الجديدة:', game.name + ' (نسخة)').then(function (newName) {
                if (!newName) return;
                return Studio.games.duplicate(game.id, newName).then(function () {
                    Studio.util.showToast('تم إنشاء نسخة.', 'success');
                    refreshGrid();
                });
            }).catch(function (err) { Studio.util.showToast('فشل النسخ: ' + err.message, 'error'); });
        });

        var deleteBtn = Studio.util.el('button', { class: 'icon-action-btn danger', title: 'حذف', text: '🗑️' });
        deleteBtn.addEventListener('click', function () {
            Studio.dialog.confirm('هل أنت متأكد من حذف "' + game.name + '"؟ لا يمكن التراجع عن هذا.', { danger: true }).then(function (ok) {
                if (!ok) return;
                return Studio.games.remove(game.id).then(function () {
                    Studio.util.showToast('تم الحذف.', 'success');
                    refreshGrid();
                });
            }).catch(function (err) { Studio.util.showToast('فشل الحذف: ' + err.message, 'error'); });
        });

        iconRow.appendChild(dupBtn);
        iconRow.appendChild(deleteBtn);
        card.appendChild(iconRow);
        return card;
    }

    function formatDate(iso) {
        if (!iso) return '';
        try {
            var d = new Date(iso);
            return d.toLocaleDateString('ar-SA');
        } catch (e) { return iso; }
    }

    function openCreateModal() {
        var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
        var box = Studio.util.el('div', { class: 'studio-modal-box' });
        box.appendChild(Studio.util.el('h3', { text: 'إنشاء لعبة جديدة' }));

        var nameInput = Studio.util.el('input', { type: 'text', placeholder: 'اسم اللعبة (مثلاً: لعبة عيد الفطر ٢٠٢٧)' });
        box.appendChild(nameInput);

        var themeLabel = Studio.util.el('p', { class: 'modal-hint', text: 'اختر لون اللعبة:' });
        box.appendChild(themeLabel);
        var swatchRow = Studio.util.el('div', { class: 'theme-swatch-row' });
        var selectedPreset = Studio.theme.PRESETS[0].id;
        Studio.theme.PRESETS.forEach(function (preset, idx) {
            var sw = Studio.util.el('button', {
                class: 'theme-swatch-btn' + (idx === 0 ? ' selected' : ''),
                style: 'background:' + preset.colors.bg + ';border-color:' + preset.colors.accent + ';',
                title: preset.name
            });
            sw.addEventListener('click', function () {
                selectedPreset = preset.id;
                Studio.util.$$('.theme-swatch-btn', swatchRow).forEach(function (el) { el.classList.remove('selected'); });
                sw.classList.add('selected');
            });
            swatchRow.appendChild(sw);
        });
        box.appendChild(swatchRow);

        var btnRow = Studio.util.el('div', { class: 'modal-btn-row' });
        var createBtn = Studio.util.el('button', { class: 'btn-primary', text: 'إنشاء' });
        var cancelBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'إلغاء' });
        btnRow.appendChild(createBtn);
        btnRow.appendChild(cancelBtn);
        box.appendChild(btnRow);

        overlay.appendChild(box);
        document.body.appendChild(overlay);
        nameInput.focus();

        createBtn.addEventListener('click', function () {
            var name = nameInput.value.trim();
            if (!name) { Studio.util.showToast('الرجاء إدخال اسم للعبة.', 'error'); return; }
            Studio.games.create({ name: name, themePresetId: selectedPreset }).then(function (game) {
                overlay.remove();
                Studio.editor.open(game.id);
            }).catch(function (err) { Studio.util.showToast('فشل الإنشاء: ' + err.message, 'error'); });
        });
        cancelBtn.addEventListener('click', function () { overlay.remove(); });
    }

    Studio.dashboard = {
        mount: mount,
        render: render,
        refreshGrid: refreshGrid
    };
})(window.Studio);
