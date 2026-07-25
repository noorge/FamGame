(function (Studio) {
    'use strict';

    // A shared library of family-member avatar images, stored once at the
    // picked root (sibling to games/) so it's reusable across every game,
    // not tied to any single one.
    var INDEX_FILE = 'characters.json';

    function charactersDir() {
        return Studio.fs.getDirectoryHandle(Studio.state.rootHandle, 'characters', true);
    }

    function loadIndex() {
        return charactersDir().then(function (dir) {
            return Studio.fs.readJson(dir, INDEX_FILE).then(function (list) {
                return list || [];
            });
        });
    }

    function saveIndex(list) {
        return charactersDir().then(function (dir) {
            return Studio.fs.writeJson(dir, INDEX_FILE, list);
        });
    }

    function list() {
        return loadIndex();
    }

    function resolveUrl(character) {
        return charactersDir().then(function (dir) {
            return Studio.fs.readBinaryAsObjectURL(dir, character.file);
        });
    }

    function add(name, blob) {
        var id = 'char-' + Studio.util.shortId();
        var filename = id + '.jpg';
        return charactersDir().then(function (dir) {
            return Studio.fs.writeBinary(dir, filename, blob);
        }).then(function () {
            return loadIndex();
        }).then(function (allChars) {
            var entry = { id: id, name: name, file: filename };
            allChars.push(entry);
            return saveIndex(allChars).then(function () { return entry; });
        });
    }

    function remove(id) {
        return loadIndex().then(function (allChars) {
            var entry = allChars.find(function (c) { return c.id === id; });
            var remaining = allChars.filter(function (c) { return c.id !== id; });
            return saveIndex(remaining).then(function () {
                if (!entry) return;
                return charactersDir().then(function (dir) {
                    return Studio.fs.removeEntry(dir, entry.file).catch(function () { /* ignore */ });
                });
            });
        });
    }

    Studio.characters = {
        list: list,
        add: add,
        remove: remove,
        resolveUrl: resolveUrl
    };
})(window.Studio);
