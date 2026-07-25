(function (Studio) {
    'use strict';

    function getDragAfterElement(container, selector, y) {
        var els = Studio.util.$$(selector, container).filter(function (el) {
            return !el.classList.contains('dragging');
        });
        var closest = { offset: -Infinity, element: null };
        els.forEach(function (child) {
            var box = child.getBoundingClientRect();
            var offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                closest = { offset: offset, element: child };
            }
        });
        return closest.element;
    }

    function makeSortable(containerEl, opts) {
        var itemSelector = opts.itemSelector;
        var onReorder = opts.onReorder;
        var draggedEl = null;

        function onDragStart(e) {
            var item = e.target.closest(itemSelector);
            if (!item || !containerEl.contains(item)) return;
            draggedEl = item;
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', item.dataset.id || ''); } catch (err) { /* noop */ }
            requestAnimationFrame(function () { item.classList.add('dragging'); });
        }

        function onDragOver(e) {
            if (!draggedEl) return;
            e.preventDefault();
            var afterEl = getDragAfterElement(containerEl, itemSelector, e.clientY);
            if (afterEl == null) containerEl.appendChild(draggedEl);
            else containerEl.insertBefore(draggedEl, afterEl);
        }

        function onDragEnd() {
            if (draggedEl) draggedEl.classList.remove('dragging');
            draggedEl = null;
            var ids = Studio.util.$$(itemSelector, containerEl).map(function (el) { return el.dataset.id; });
            onReorder(ids);
        }

        containerEl.addEventListener('dragstart', onDragStart);
        containerEl.addEventListener('dragover', onDragOver);
        containerEl.addEventListener('dragend', onDragEnd);

        return {
            destroy: function () {
                containerEl.removeEventListener('dragstart', onDragStart);
                containerEl.removeEventListener('dragover', onDragOver);
                containerEl.removeEventListener('dragend', onDragEnd);
            }
        };
    }

    Studio.dnd = { makeSortable: makeSortable };
})(window.Studio);
