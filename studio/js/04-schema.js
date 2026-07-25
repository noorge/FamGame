(function (Studio) {
    'use strict';

    var CURRENT_VERSION = 1;
    var MAX_CATEGORIES = 10;
    var DEFAULT_TIMER_SECONDS = 60;
    var LARGE_FILE_WARNING_BYTES = 15 * 1024 * 1024;

    function blankQuestion(order) {
        return {
            id: 'q-' + Studio.util.shortId(),
            order: order || 0,
            prompt: '',
            answer: '',
            media: null
        };
    }

    function blankCategory(opts) {
        opts = opts || {};
        return {
            id: 'cat-' + Studio.util.shortId(),
            name: opts.name || '',
            icon: opts.icon || '❓',
            type: opts.type || 'text',
            order: typeof opts.order === 'number' ? opts.order : 0,
            questions: []
        };
    }

    function blankGame(opts) {
        opts = opts || {};
        var presetId = opts.themePresetId || 'purple-pink';
        var now = new Date().toISOString();
        return {
            schemaVersion: CURRENT_VERSION,
            id: opts.id || (Studio.util.slugify(opts.name) + '-' + Studio.util.shortId()),
            name: opts.name || 'لعبة جديدة',
            createdAt: now,
            updatedAt: now,
            settings: {
                timerSeconds: DEFAULT_TIMER_SECONDS,
                theme: {
                    presetId: presetId,
                    colors: Studio.theme.getPreset(presetId).colors
                }
            },
            categories: []
        };
    }

    function migrate(raw) {
        var data = raw;
        if (data.schemaVersion === undefined) data.schemaVersion = 0;
        // future: if (data.schemaVersion < 1) { data = migrateV0toV1(data); }
        data.schemaVersion = CURRENT_VERSION;
        return data;
    }

    function canAddCategory(game) {
        return game.categories.length < MAX_CATEGORIES;
    }

    function normalizeOrder(list) {
        list.sort(function (a, b) { return a.order - b.order; });
        list.forEach(function (item, idx) { item.order = idx; });
        return list;
    }

    Studio.schema = {
        CURRENT_VERSION: CURRENT_VERSION,
        MAX_CATEGORIES: MAX_CATEGORIES,
        DEFAULT_TIMER_SECONDS: DEFAULT_TIMER_SECONDS,
        LARGE_FILE_WARNING_BYTES: LARGE_FILE_WARNING_BYTES,
        blankQuestion: blankQuestion,
        blankCategory: blankCategory,
        blankGame: blankGame,
        migrate: migrate,
        canAddCategory: canAddCategory,
        normalizeOrder: normalizeOrder
    };
})(window.Studio);
