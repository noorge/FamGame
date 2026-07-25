(function (Studio) {
    'use strict';

    var GAME_FILE = 'game.json';
    var MEDIA_SUBDIRS = ['images', 'audio', 'video'];

    function gamesRoot() {
        if (!Studio.state.gamesRoot) throw new Error('Games root not initialized yet.');
        return Studio.state.gamesRoot;
    }

    function ensureMediaDirs(gameDirHandle) {
        return Studio.fs.getDirectoryHandle(gameDirHandle, 'media', true).then(function (mediaDir) {
            return Promise.all(MEDIA_SUBDIRS.map(function (name) {
                return Studio.fs.getDirectoryHandle(mediaDir, name, true);
            }));
        });
    }

    function list() {
        return Studio.fs.listDirectories(gamesRoot()).then(function (dirHandles) {
            var results = [];
            var chain = Promise.resolve();
            dirHandles.forEach(function (dirHandle) {
                chain = chain.then(function () {
                    return Studio.fs.readJson(dirHandle, GAME_FILE).then(function (raw) {
                        if (!raw) return;
                        var data = Studio.schema.migrate(raw);
                        var categoryCount = (data.categories || []).length;
                        results.push({
                            id: data.id,
                            name: data.name,
                            categoryCount: categoryCount,
                            colors: Studio.theme.resolveColors(data.settings && data.settings.theme),
                            updatedAt: data.updatedAt
                        });
                    }).catch(function () {
                        Studio.util.showToast('تعذّرت قراءة إحدى مجلدات الألعاب: ' + dirHandle.name, 'error');
                    });
                });
            });
            return chain.then(function () {
                results.sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
                return results;
            });
        });
    }

    function load(gameId) {
        return gamesRoot().getDirectoryHandle(gameId, { create: false })
            .then(function (dirHandle) { return Studio.fs.readJson(dirHandle, GAME_FILE); })
            .then(function (raw) {
                if (!raw) throw new Error('Game not found: ' + gameId);
                return Studio.schema.migrate(raw);
            });
    }

    function save(gameId, gameData) {
        gameData.updatedAt = new Date().toISOString();
        return gamesRoot().getDirectoryHandle(gameId, { create: true })
            .then(function (dirHandle) { return Studio.fs.writeJson(dirHandle, GAME_FILE, gameData); });
    }

    function create(opts) {
        var gameData = Studio.schema.blankGame(opts);
        return gamesRoot().getDirectoryHandle(gameData.id, { create: true })
            .then(function (dirHandle) { return ensureMediaDirs(dirHandle).then(function () { return dirHandle; }); })
            .then(function (dirHandle) { return Studio.fs.writeJson(dirHandle, GAME_FILE, gameData); })
            .then(function () { return gameData; });
    }

    // Used only by the legacy importer, which needs a fixed, predictable folder name.
    function createWithId(fixedId, opts) {
        var withId = { name: opts.name, themePresetId: opts.themePresetId, id: fixedId };
        return create(withId);
    }

    function exists(gameId) {
        return gamesRoot().getDirectoryHandle(gameId, { create: false }).then(function () { return true; }).catch(function () { return false; });
    }

    function getMediaDir(gameId, kind) {
        return gamesRoot().getDirectoryHandle(gameId, { create: false })
            .then(function (dirHandle) { return Studio.fs.getDirectoryHandle(dirHandle, 'media', false); })
            .then(function (mediaDir) { return Studio.fs.getDirectoryHandle(mediaDir, kind, true); });
    }

    // Regenerates every category/question id in `clone` and returns a list of
    // { kind, oldFilename, newFilename } for every media file that needs to be
    // physically copied to keep clone.media.file paths valid on disk.
    function regenerateIdsAndPlanMediaCopies(clone) {
        var copyPlan = [];
        (clone.categories || []).forEach(function (cat) {
            cat.id = 'cat-' + Studio.util.shortId();
            (cat.questions || []).forEach(function (q) {
                var newId = 'q-' + Studio.util.shortId();
                if (q.media && q.media.file) {
                    var oldFilename = basename(q.media.file);
                    var ext = oldFilename.indexOf('.') >= 0 ? oldFilename.slice(oldFilename.lastIndexOf('.')) : '';
                    var newFilename = newId + ext;
                    var kindDir = q.media.kind === 'image' ? 'images' : q.media.kind;
                    copyPlan.push({ kindDir: kindDir, oldFilename: oldFilename, newFilename: newFilename });
                    q.media.file = 'media/' + kindDir + '/' + newFilename;
                }
                q.id = newId;
            });
        });
        return copyPlan;
    }

    function duplicate(sourceGameId, newName) {
        var newId;
        return load(sourceGameId).then(function (src) {
            var clone = Studio.util.deepClone(src);
            newId = Studio.util.slugify(newName) + '-' + Studio.util.shortId();
            clone.id = newId;
            clone.name = newName;
            var copyPlan = regenerateIdsAndPlanMediaCopies(clone);

            return gamesRoot().getDirectoryHandle(newId, { create: true }).then(function (destGameDir) {
                return ensureMediaDirs(destGameDir).then(function () {
                    return gamesRoot().getDirectoryHandle(sourceGameId, { create: false });
                }).then(function (srcGameDir) {
                    return Studio.fs.getDirectoryHandle(srcGameDir, 'media', false).then(function (srcMediaDir) {
                        return Studio.fs.getDirectoryHandle(destGameDir, 'media', false).then(function (destMediaDir) {
                            var chain = Promise.resolve();
                            copyPlan.forEach(function (item) {
                                chain = chain.then(function () {
                                    return Studio.fs.getDirectoryHandle(srcMediaDir, item.kindDir, false).then(function (srcKindDir) {
                                        return srcKindDir.getFileHandle(item.oldFilename, { create: false });
                                    }).then(function (fh) { return fh.getFile(); })
                                        .then(function (file) {
                                            return Studio.fs.getDirectoryHandle(destMediaDir, item.kindDir, true).then(function (destKindDir) {
                                                return Studio.fs.writeBinary(destKindDir, item.newFilename, file);
                                            });
                                        }).catch(function (err) {
                                            Studio.util.showToast('تعذّر نسخ ملف: ' + item.oldFilename, 'error');
                                        });
                                });
                            });
                            return chain;
                        });
                    });
                }).then(function () {
                    return Studio.fs.writeJson(destGameDir, GAME_FILE, clone);
                });
            });
        }).then(function () { return load(newId); });
    }

    function rename(gameId, newName) {
        return load(gameId).then(function (g) {
            g.name = newName;
            return save(gameId, g);
        });
    }

    function remove(gameId) {
        return gamesRoot().removeEntry(gameId, { recursive: true });
    }

    function basename(path) {
        return path.split('/').pop();
    }

    // Shared by Editor Preview and Play view: resolves a question's media
    // reference into a playable/displayable object URL.
    function resolveMediaUrl(gameId, media) {
        var kindDir = media.kind === 'image' ? 'images' : media.kind;
        return getMediaDir(gameId, kindDir).then(function (dir) {
            return Studio.fs.readBinaryAsObjectURL(dir, basename(media.file));
        });
    }

    Studio.games = {
        list: list,
        load: load,
        save: save,
        create: create,
        createWithId: createWithId,
        exists: exists,
        duplicate: duplicate,
        rename: rename,
        remove: remove,
        getMediaDir: getMediaDir,
        ensureMediaDirs: ensureMediaDirs,
        resolveMediaUrl: resolveMediaUrl,
        basename: basename
    };
})(window.Studio);
