(function (Studio) {
    'use strict';

    var EMOJI_GROUPS = [
        {
            label: 'عام',
            emojis: ['❓', '⭐', '🏆', '🎯', '🧠', '💡', '🔍', '🎉', '🎁', '✨', '🔥', '⏳', '📢', '🗳️']
        },
        {
            label: 'دين وثقافة',
            emojis: ['📖', '🕌', '🕋', '🌙', '📜', '🤲', '🏛️', '🗺️', '🌍']
        },
        {
            label: 'وسائط',
            emojis: ['🖼️', '📷', '🎬', '🎥', '🎙️', '🎵', '🎶', '📱', '💻', '📺', '🕹️', '🎮']
        },
        {
            label: 'حياة يومية',
            emojis: ['🍔', '🍕', '☕', '🚗', '🏠', '🛍️', '💰', '👕', '⚽', '🏀', '🎨', '🐫', '🦅', '🎭']
        }
    ];

    function open(currentValue) {
        return new Promise(function (resolve, reject) {
            var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
            var box = Studio.util.el('div', { class: 'studio-modal-box emoji-picker-box' });
            box.appendChild(Studio.util.el('h3', { text: 'اختر رمزاً للفئة' }));

            var customRow = Studio.util.el('div', { class: 'form-row' });
            var customInput = Studio.util.el('input', { type: 'text', placeholder: 'أو الصق رمزاً هنا', maxlength: '4', value: currentValue || '' });
            customRow.appendChild(customInput);
            var useCustomBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'استخدام هذا' });
            customRow.appendChild(useCustomBtn);
            box.appendChild(customRow);

            EMOJI_GROUPS.forEach(function (group) {
                box.appendChild(Studio.util.el('p', { class: 'emoji-group-label', text: group.label }));
                var grid = Studio.util.el('div', { class: 'emoji-grid' });
                group.emojis.forEach(function (emoji) {
                    var btn = Studio.util.el('button', { class: 'emoji-option-btn', text: emoji, type: 'button' });
                    btn.addEventListener('click', function () {
                        cleanup();
                        resolve(emoji);
                    });
                    grid.appendChild(btn);
                });
                box.appendChild(grid);
            });

            var cancelBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'إلغاء' });
            box.appendChild(Studio.util.el('div', { class: 'modal-btn-row' }, [cancelBtn]));

            overlay.appendChild(box);
            document.body.appendChild(overlay);

            function cleanup() { overlay.remove(); }

            useCustomBtn.addEventListener('click', function () {
                var v = customInput.value.trim();
                if (!v) { Studio.util.showToast('الرجاء إدخال رمز أولاً.', 'error'); return; }
                cleanup();
                resolve(v);
            });
            cancelBtn.addEventListener('click', function () {
                cleanup();
                reject(new Error('cancelled'));
            });
        });
    }

    Studio.emojiPicker = { open: open };
})(window.Studio);
