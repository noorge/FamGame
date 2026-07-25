(function (Studio) {
    'use strict';

    // In-game replacements for the browser's native alert/confirm/prompt,
    // styled the same as every other modal in the app.

    function baseDialog(message, buttons) {
        return new Promise(function (resolve) {
            var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
            var box = Studio.util.el('div', { class: 'studio-modal-box dialog-box' });
            box.appendChild(Studio.util.el('p', { class: 'dialog-message', text: message }));

            var btnRow = Studio.util.el('div', { class: 'modal-btn-row' });
            buttons.forEach(function (b) {
                var btn = Studio.util.el('button', { class: b.className, text: b.label });
                btn.addEventListener('click', function () {
                    overlay.remove();
                    resolve(b.value);
                });
                btnRow.appendChild(btn);
            });
            box.appendChild(btnRow);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
        });
    }

    function alertDialog(message) {
        return baseDialog(message, [
            { label: 'حسناً', value: true, className: 'btn-primary' }
        ]);
    }

    function confirmDialog(message, opts) {
        opts = opts || {};
        return baseDialog(message, [
            { label: opts.cancelLabel || 'إلغاء', value: false, className: 'btn-secondary' },
            { label: opts.confirmLabel || 'تأكيد', value: true, className: opts.danger ? 'btn-danger' : 'btn-primary' }
        ]);
    }

    function promptDialog(message, defaultValue) {
        return new Promise(function (resolve) {
            var overlay = Studio.util.el('div', { class: 'studio-modal-overlay' });
            var box = Studio.util.el('div', { class: 'studio-modal-box dialog-box' });
            box.appendChild(Studio.util.el('p', { class: 'dialog-message', text: message }));
            var input = Studio.util.el('input', { type: 'text', value: defaultValue || '' });
            box.appendChild(input);

            var btnRow = Studio.util.el('div', { class: 'modal-btn-row' });
            var cancelBtn = Studio.util.el('button', { class: 'btn-secondary', text: 'إلغاء' });
            var okBtn = Studio.util.el('button', { class: 'btn-primary', text: 'موافق' });
            function submit() {
                overlay.remove();
                resolve(input.value.trim() || null);
            }
            cancelBtn.addEventListener('click', function () { overlay.remove(); resolve(null); });
            okBtn.addEventListener('click', submit);
            input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(okBtn);
            box.appendChild(btnRow);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            input.focus();
            input.select();
        });
    }

    Studio.dialog = {
        alert: alertDialog,
        confirm: confirmDialog,
        prompt: promptDialog
    };
})(window.Studio);
