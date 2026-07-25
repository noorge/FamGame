(function (Studio) {
    'use strict';

    function createAutosaveController(gameId, getCurrentGameData) {
        var indicatorEl = null;
        var pending = false;

        function setIndicator(state) {
            if (!indicatorEl) return;
            indicatorEl.classList.remove('saving', 'saved', 'error', 'pending');
            indicatorEl.classList.add(state);
            var labels = {
                pending: 'تعديلات غير محفوظة…',
                saving: 'جارِ الحفظ…',
                saved: 'تم الحفظ ✓',
                error: 'فشل الحفظ! اضغط لإعادة المحاولة'
            };
            indicatorEl.textContent = labels[state] || '';
        }

        var flush = Studio.util.debounce(function () {
            setIndicator('saving');
            Studio.games.save(gameId, getCurrentGameData()).then(function () {
                pending = false;
                setIndicator('saved');
            }).catch(function (err) {
                setIndicator('error');
                Studio.util.showToast('فشل الحفظ التلقائي: ' + err.message, 'error');
            });
        }, 500);

        function markDirty() {
            pending = true;
            setIndicator('pending');
            flush();
        }

        function attach(el) {
            indicatorEl = el;
            if (indicatorEl) {
                indicatorEl.addEventListener('click', function () {
                    if (indicatorEl.classList.contains('error')) flush.flushNow();
                });
            }
        }

        function hasUnsavedChanges() { return pending; }

        function flushNow() { flush.flushNow(); }

        window.addEventListener('beforeunload', function () {
            if (pending) flush.flushNow();
        });

        return {
            markDirty: markDirty,
            attach: attach,
            hasUnsavedChanges: hasUnsavedChanges,
            flushNow: flushNow
        };
    }

    Studio.autosave = {
        create: createAutosaveController
    };
})(window.Studio);
