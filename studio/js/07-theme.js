(function (Studio) {
    'use strict';

    var PRESETS = [
        { id: 'purple-pink', name: 'بنفسجي وردي', colors: { bg: '#3d1f7a', accent: '#ff3796', highlight: '#fca103', text: '#ffffff' } },
        { id: 'emerald', name: 'أخضر زمردي', colors: { bg: '#0e8a58', accent: '#c4ff4d', highlight: '#ffe14d', text: '#ffffff' } },
        { id: 'gold-blue', name: 'ذهبي وأزرق', colors: { bg: '#1a56c4', accent: '#ffd23f', highlight: '#00e0ff', text: '#ffffff' } },
        { id: 'crimson', name: 'أحمر ملكي', colors: { bg: '#c41e3a', accent: '#ffd23f', highlight: '#ff8fb1', text: '#ffffff' } },
        { id: 'midnight-teal', name: 'فيروزي', colors: { bg: '#0d8f96', accent: '#ff6b6b', highlight: '#ffe14d', text: '#ffffff' } }
    ];

    function getPreset(id) {
        for (var i = 0; i < PRESETS.length; i++) {
            if (PRESETS[i].id === id) return PRESETS[i];
        }
        return PRESETS[0];
    }

    function resolveColors(themeSettings) {
        if (!themeSettings) return getPreset('purple-pink').colors;
        if (themeSettings.presetId === 'custom' && themeSettings.colors) return themeSettings.colors;
        var preset = getPreset(themeSettings.presetId);
        return preset.colors;
    }

    function apply(el, colors) {
        if (!el || !colors) return;
        el.style.setProperty('--color-bg', colors.bg);
        el.style.setProperty('--color-accent', colors.accent);
        el.style.setProperty('--color-highlight', colors.highlight);
        el.style.setProperty('--color-text', colors.text);
    }

    Studio.theme = {
        PRESETS: PRESETS,
        getPreset: getPreset,
        resolveColors: resolveColors,
        apply: apply
    };
})(window.Studio);
