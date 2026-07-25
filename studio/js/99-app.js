(function (Studio) {
    'use strict';

    var VIEW_IDS = ['dashboard-view', 'editor-view', 'play-view'];

    function showView(viewId) {
        VIEW_IDS.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            if (id === viewId) el.classList.remove('hidden');
            else el.classList.add('hidden');
        });
    }

    function boot() {
        if (!Studio.fs.isSupported()) {
            document.getElementById('dashboard-view').innerHTML =
                '<div class="folder-gate"><p>هذا المتصفح لا يدعم الوصول المباشر للملفات. الرجاء استخدام Google Chrome أو Microsoft Edge.</p></div>';
            return;
        }

        Studio.dashboard.mount(document.getElementById('dashboard-view'));
        Studio.editor.mount(document.getElementById('editor-view'));
        Studio.play.mount(document.getElementById('play-view'));

        Studio.db.init().then(function () {
            return Studio.fs.tryRestoreHandle();
        }).then(function (handle) {
            if (!handle) {
                Studio.dashboard.render({ needsFolderPick: true });
                return;
            }
            return Studio.fs.checkPermission(handle).then(function (perm) {
                if (perm === 'granted') {
                    Studio.state.rootHandle = handle;
                    return Studio.fs.ensureGamesRoot(handle).then(function (gamesRoot) {
                        Studio.state.gamesRoot = gamesRoot;
                        Studio.dashboard.render({ needsFolderPick: false });
                    });
                } else {
                    Studio.dashboard.render({ needsFolderPick: false, needsReauth: true, pendingHandle: handle });
                }
            });
        }).catch(function (err) {
            Studio.util.showToast('حدث خطأ أثناء بدء التشغيل: ' + err.message, 'error');
            Studio.dashboard.render({ needsFolderPick: true });
        });
    }

    Studio.app = { showView: showView, boot: boot };

    document.addEventListener('DOMContentLoaded', boot);
})(window.Studio);
