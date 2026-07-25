(function (Studio) {
    'use strict';

    var HANDLE_KEY = 'root';

    function isSupported() {
        return typeof window.showDirectoryPicker === 'function';
    }

    function pickRootDirectory() {
        return window.showDirectoryPicker({ id: 'family-trivia-root', mode: 'readwrite' })
            .then(function (handle) {
                return persistHandle(handle).then(function () { return handle; });
            });
    }

    function persistHandle(handle) {
        return Studio.db.put(HANDLE_KEY, handle);
    }

    function tryRestoreHandle() {
        return Studio.db.get(HANDLE_KEY).catch(function () { return null; });
    }

    function checkPermission(handle) {
        return handle.queryPermission({ mode: 'readwrite' });
    }

    function requestPermission(handle) {
        return handle.requestPermission({ mode: 'readwrite' }).then(function (status) {
            return status === 'granted';
        });
    }

    function ensureGamesRoot(rootHandle) {
        return rootHandle.getDirectoryHandle('games', { create: true });
    }

    function ensureSubdir(dirHandle, name) {
        return dirHandle.getDirectoryHandle(name, { create: true });
    }

    function readJson(dirHandle, filename) {
        return dirHandle.getFileHandle(filename, { create: false })
            .then(function (fh) { return fh.getFile(); })
            .then(function (file) { return file.text(); })
            .then(function (text) { return JSON.parse(text); })
            .catch(function (err) {
                if (err && (err.name === 'NotFoundError' || err.name === 'TypeMismatchError')) return null;
                throw err;
            });
    }

    function writeJson(dirHandle, filename, obj) {
        return dirHandle.getFileHandle(filename, { create: true })
            .then(function (fh) { return fh.createWritable(); })
            .then(function (writable) {
                return writable.write(JSON.stringify(obj, null, 2)).then(function () {
                    return writable.close();
                });
            });
    }

    function writeBinary(dirHandle, filename, blobOrArrayBuffer) {
        return dirHandle.getFileHandle(filename, { create: true })
            .then(function (fh) { return fh.createWritable(); })
            .then(function (writable) {
                return writable.write(blobOrArrayBuffer).then(function () {
                    return writable.close();
                });
            });
    }

    function readBinaryAsBlob(dirHandle, filename) {
        return dirHandle.getFileHandle(filename, { create: false })
            .then(function (fh) { return fh.getFile(); });
    }

    function readBinaryAsObjectURL(dirHandle, filename) {
        return readBinaryAsBlob(dirHandle, filename).then(function (blob) {
            return URL.createObjectURL(blob);
        });
    }

    function removeEntry(dirHandle, name, options) {
        return dirHandle.removeEntry(name, options || {});
    }

    function getDirectoryHandle(parent, name, create) {
        return parent.getDirectoryHandle(name, { create: !!create });
    }

    function listDirectories(dirHandle) {
        var results = [];
        var iterator = dirHandle.values();
        function step() {
            return iterator.next().then(function (res) {
                if (res.done) return results;
                if (res.value.kind === 'directory') results.push(res.value);
                return step();
            });
        }
        return step();
    }

    Studio.fs = {
        isSupported: isSupported,
        pickRootDirectory: pickRootDirectory,
        persistHandle: persistHandle,
        tryRestoreHandle: tryRestoreHandle,
        checkPermission: checkPermission,
        requestPermission: requestPermission,
        ensureGamesRoot: ensureGamesRoot,
        ensureSubdir: ensureSubdir,
        readJson: readJson,
        writeJson: writeJson,
        writeBinary: writeBinary,
        readBinaryAsBlob: readBinaryAsBlob,
        readBinaryAsObjectURL: readBinaryAsObjectURL,
        removeEntry: removeEntry,
        getDirectoryHandle: getDirectoryHandle,
        listDirectories: listDirectories
    };
})(window.Studio);
