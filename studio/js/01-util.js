(function (Studio) {
    'use strict';

    function uuid() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0;
            var v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function shortId() {
        return uuid().split('-')[0];
    }

    function slugify(text) {
        var slug = String(text || '')
            .trim()
            .toLowerCase()
            .replace(/[\s_]+/g, '-')
            .replace(/[^\w؀-ۿ-]+/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        return slug || 'game';
    }

    function debounce(fn, ms) {
        var timer = null;
        var debounced = function () {
            var args = arguments;
            var ctx = this;
            clearTimeout(timer);
            timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
        };
        debounced.cancel = function () { clearTimeout(timer); };
        debounced.flushNow = function () {
            clearTimeout(timer);
            fn();
        };
        return debounced;
    }

    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) seconds = 0;
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Parses "M:SS", "H:MM:SS", or a plain number of seconds into seconds.
    // Returns NaN if the string isn't a valid time.
    function parseTime(str) {
        if (str == null) return NaN;
        str = String(str).trim();
        if (!str) return NaN;
        var parts = str.split(':');
        if (parts.some(function (p) { return p.trim() === '' || isNaN(Number(p)); })) return NaN;
        var seconds;
        if (parts.length === 1) {
            seconds = parseFloat(parts[0]);
        } else if (parts.length === 2) {
            seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
        } else if (parts.length === 3) {
            seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
        } else {
            return NaN;
        }
        return isNaN(seconds) ? NaN : seconds;
    }

    function $(selector, root) {
        return (root || document).querySelector(selector);
    }

    function $$(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    }

    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        attrs = attrs || {};
        Object.keys(attrs).forEach(function (key) {
            var value = attrs[key];
            if (key === 'class') node.className = value;
            else if (key === 'html') node.innerHTML = value;
            else if (key === 'text') node.textContent = value;
            else if (key.indexOf('on') === 0 && typeof value === 'function') {
                node.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (value !== undefined && value !== null) {
                node.setAttribute(key, value);
            }
        });
        (children || []).forEach(function (child) {
            if (child == null) return;
            if (typeof child === 'string') node.appendChild(document.createTextNode(child));
            else node.appendChild(child);
        });
        return node;
    }

    var toastContainer = null;
    function ensureToastContainer() {
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'studio-toast-container';
            document.body.appendChild(toastContainer);
        }
        return toastContainer;
    }

    function showToast(message, type) {
        var container = ensureToastContainer();
        var toast = el('div', { class: 'studio-toast studio-toast-' + (type || 'info'), text: message });
        container.appendChild(toast);
        requestAnimationFrame(function () { toast.classList.add('show'); });
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 300);
        }, 3500);
    }

    // Shared trim-range enforcement: the ONE implementation of "play only between
    // trimStart/trimEnd" used by both the audio/video trim tools' preview button
    // and the real Studio.mediaPlayer, so the behavior can never drift between them.
    function bindTrimEnforcement(mediaEl, getStart, getEnd) {
        function onTimeUpdate() {
            var start = getStart();
            var end = getEnd();
            if (mediaEl.currentTime < start) {
                mediaEl.currentTime = start;
            }
            if (end != null && mediaEl.currentTime >= end) {
                mediaEl.pause();
                mediaEl.currentTime = start;
            }
        }
        mediaEl.addEventListener('timeupdate', onTimeUpdate);
        return function destroy() {
            mediaEl.removeEventListener('timeupdate', onTimeUpdate);
        };
    }

    // Picks a column count <= maxCols so that N items split into as-even-as-
    // possible rows (6 items, maxCols 5 -> 3 columns -> 3+3, not 5+1).
    function computeBalancedColumns(n, maxCols) {
        if (n <= 0) return maxCols;
        if (n <= maxCols) return n;
        var rows = Math.ceil(n / maxCols);
        return Math.ceil(n / rows);
    }

    // Splits an array into row-chunks of `columns` size.
    function chunk(arr, columns) {
        var rows = [];
        for (var i = 0; i < arr.length; i += columns) {
            rows.push(arr.slice(i, i + columns));
        }
        return rows;
    }

    // Fisher-Yates, in place.
    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
    }

    Studio.util = {
        uuid: uuid,
        shortId: shortId,
        slugify: slugify,
        debounce: debounce,
        formatTime: formatTime,
        clamp: clamp,
        $: $,
        $$: $$,
        deepClone: deepClone,
        el: el,
        showToast: showToast,
        bindTrimEnforcement: bindTrimEnforcement,
        computeBalancedColumns: computeBalancedColumns,
        chunk: chunk,
        parseTime: parseTime,
        shuffle: shuffle
    };
})(window.Studio);
