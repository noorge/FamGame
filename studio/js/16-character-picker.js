(function (Studio) {
    'use strict';

    // Studio.characterPicker.open(currentCharacterId) -> Promise<characterId|null>
    // Resolves with the chosen character's id, or null for "no avatar".
    // Rejects only if the user closes without the modal ever settling (not
    // used currently — closing always resolves with the prior selection).
    function open(currentCharacterId) {
        return new Promise(function (resolve) {
            var objectUrls = [];
            var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
            var box = Studio.util.el('div', { class: 'studio-modal-box character-picker-box' });
            box.appendChild(Studio.util.el('h3', { text: 'اختر شخصية' }));

            var grid = Studio.util.el('div', { class: 'character-grid' });
            box.appendChild(grid);

            var closeBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'إغلاق' });
            box.appendChild(Studio.util.el('div', { class: 'modal-btn-row' }, [closeBtn]));

            overlay.appendChild(box);
            document.body.appendChild(overlay);

            function cleanup() {
                objectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
                overlay.remove();
            }
            closeBtn.addEventListener('click', function () {
                cleanup();
                resolve(currentCharacterId || null);
            });

            function choose(id) {
                cleanup();
                resolve(id);
            }

            function renderGrid() {
                grid.innerHTML = '<p class="loading-text">جارِ التحميل...</p>';
                Studio.characters.list().then(function (chars) {
                    grid.innerHTML = '';

                    var noneTile = Studio.util.el('button', { class: 'character-tile', type: 'button' }, [
                        Studio.util.el('span', { class: 'character-tile-blank', text: '👤' }),
                        Studio.util.el('span', { class: 'character-tile-name', text: 'بدون صورة' })
                    ]);
                    if (!currentCharacterId) noneTile.classList.add('selected');
                    noneTile.addEventListener('click', function () { choose(null); });
                    grid.appendChild(noneTile);

                    chars.forEach(function (ch) {
                        var img = Studio.util.el('img', { class: 'character-tile-img' });
                        var tile = Studio.util.el('button', { class: 'character-tile', type: 'button' }, [
                            img,
                            Studio.util.el('span', { class: 'character-tile-name', text: ch.name })
                        ]);
                        if (ch.id === currentCharacterId) tile.classList.add('selected');
                        tile.addEventListener('click', function () { choose(ch.id); });

                        var deleteBtn = Studio.util.el('button', { class: 'tile-delete-btn', type: 'button', text: '×' });
                        deleteBtn.addEventListener('click', function (e) {
                            e.stopPropagation();
                            Studio.dialog.confirm('حذف شخصية "' + ch.name + '"؟', { danger: true }).then(function (ok) {
                                if (!ok) return;
                                Studio.characters.remove(ch.id).then(renderGrid);
                            });
                        });
                        tile.appendChild(deleteBtn);

                        grid.appendChild(tile);

                        Studio.characters.resolveUrl(ch).then(function (url) {
                            objectUrls.push(url);
                            img.src = url;
                        });
                    });

                    var addTile = Studio.util.el('button', { class: 'character-tile add-tile', type: 'button', text: '+' });
                    addTile.addEventListener('click', function () {
                        var fileInput = Studio.util.el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
                        document.body.appendChild(fileInput);
                        fileInput.addEventListener('change', function () {
                            var file = fileInput.files[0];
                            fileInput.remove();
                            if (!file) return;
                            Studio.cropTool.open(file).then(function (blob) {
                                return Studio.dialog.prompt('اسم أفراد العائلة:').then(function (name) {
                                    if (!name) throw new Error('cancelled');
                                    return Studio.characters.add(name, blob);
                                });
                            }).then(function (entry) {
                                currentCharacterId = entry.id;
                                renderGrid();
                            }).catch(function (err) {
                                if (err.message !== 'cancelled') Studio.util.showToast('فشل الإضافة: ' + err.message, 'error');
                            });
                        });
                        fileInput.click();
                    });
                    grid.appendChild(addTile);
                });
            }
            renderGrid();
        });
    }

    Studio.characterPicker = { open: open };
})(window.Studio);
