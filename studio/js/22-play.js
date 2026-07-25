(function (Studio) {
    'use strict';

    var rootEl = null;
    var els = {};
    var state = null;

    function mount(el) {
        rootEl = el;
    }

    function freshState(game) {
        var answered = {};
        game.categories.forEach(function (c) { answered[c.id] = new Set(); });
        return {
            game: game,
            players: [],
            scores: {},
            playerAvatars: {},
            playerAvatarUrls: {},
            currentCategoryId: null,
            answeredQuestionIds: answered,
            timerInterval: null,
            activeRender: null // { cleanup } from questionRenderer
        };
    }

    function start(gameId) {
        if (state && state.playerAvatarUrls) {
            Object.keys(state.playerAvatarUrls).forEach(function (name) {
                URL.revokeObjectURL(state.playerAvatarUrls[name]);
            });
        }
        Studio.games.load(gameId).then(function (game) {
            state = freshState(game);
            Studio.app.showView('play-view');
            renderShell();
            Studio.theme.apply(rootEl, Studio.theme.resolveColors(game.settings.theme));
            showSetup();
        }).catch(function (err) {
            Studio.util.showToast('تعذّر تشغيل اللعبة: ' + err.message, 'error');
        });
    }

    // Only the exit button and (during a question) the timer float as small
    // fixed corner badges — no full-width bar. The bottom scoreboard is the
    // only other fixed chrome, so the two never compete for the same space.
    function renderShell() {
        rootEl.innerHTML = '';

        var exitBtn = Studio.util.el('button', { class: 'btn-secondary play-exit-btn', text: '✕ خروج' });
        exitBtn.addEventListener('click', function () {
            Studio.dialog.confirm('هل تريد إنهاء اللعبة الحالية والعودة للوحة الرئيسية؟').then(function (ok) {
                if (!ok) return;
                stopTimer();
                clearActiveRender();
                Studio.app.showView('dashboard-view');
                Studio.dashboard.refreshGrid();
            });
        });
        rootEl.appendChild(exitBtn);

        els.timerDisplay = Studio.util.el('div', { id: 'timer-display', class: 'hidden' });
        rootEl.appendChild(els.timerDisplay);

        els.stage = Studio.util.el('div', { class: 'play-stage' });
        els.setupView = Studio.util.el('div', { id: 'play-setup-view' });
        els.categoryView = Studio.util.el('div', { id: 'play-category-view', class: 'hidden' });
        els.numberView = Studio.util.el('div', { id: 'play-number-view', class: 'hidden' });
        els.questionView = Studio.util.el('div', { id: 'play-question-view', class: 'hidden' });
        els.stage.appendChild(els.setupView);
        els.stage.appendChild(els.categoryView);
        els.stage.appendChild(els.numberView);
        els.stage.appendChild(els.questionView);
        rootEl.appendChild(els.stage);

        els.scoresPanel = Studio.util.el('div', { class: 'play-scoreboard hidden', id: 'play-scores' });
        rootEl.appendChild(els.scoresPanel);

        els.winnerOverlay = Studio.util.el('div', { class: 'hidden', id: 'play-winner-overlay' });
        rootEl.appendChild(els.winnerOverlay);
    }

    function showSub(el) {
        [els.setupView, els.categoryView, els.numberView, els.questionView].forEach(function (v) {
            v.classList.add('hidden');
        });
        el.classList.remove('hidden');
    }

    // ---------- Setup ----------

    function showSetup() {
        els.setupView.innerHTML = '';
        var box = Studio.util.el('div', { class: 'player-setup-box' });
        box.appendChild(Studio.util.el('h1', { text: state.game.name }));
        box.appendChild(Studio.util.el('label', { text: 'أسماء اللاعبين (٢-٦):' }));

        var rowsWrap = Studio.util.el('div', { class: 'player-name-rows' });
        box.appendChild(rowsWrap);

        var rows = []; // { input, avatarBtn, avatarImg, characterId }

        var addRowBtn = Studio.util.el('button', { class: 'btn-secondary add-player-btn', type: 'button', text: '+ إضافة لاعب' });

        function updateAddButtonState() {
            addRowBtn.disabled = rows.length >= 6;
        }

        function updateAvatarButton(rowState) {
            rowState.avatarBtn.innerHTML = '';
            if (rowState.avatarObjectUrl) { URL.revokeObjectURL(rowState.avatarObjectUrl); rowState.avatarObjectUrl = null; }
            if (rowState.characterId) {
                Studio.characters.list().then(function (chars) {
                    var ch = chars.find(function (c) { return c.id === rowState.characterId; });
                    if (!ch) return;
                    return Studio.characters.resolveUrl(ch).then(function (url) {
                        rowState.avatarObjectUrl = url;
                        rowState.avatarBtn.innerHTML = '';
                        rowState.avatarBtn.appendChild(Studio.util.el('img', { class: 'player-avatar-img', src: url }));
                    });
                });
            } else {
                rowState.avatarBtn.textContent = '👤';
            }
        }

        function addRow() {
            if (rows.length >= 6) return;
            var row = Studio.util.el('div', { class: 'player-name-row' });
            var rowState = { characterId: null, avatarObjectUrl: null };

            var avatarBtn = Studio.util.el('button', { class: 'player-avatar-btn', type: 'button', title: 'اختر شخصية', text: '👤' });
            avatarBtn.addEventListener('click', function () {
                Studio.characterPicker.open(rowState.characterId).then(function (id) {
                    rowState.characterId = id;
                    updateAvatarButton(rowState);
                });
            });
            rowState.avatarBtn = avatarBtn;
            row.appendChild(avatarBtn);

            var input = Studio.util.el('input', { type: 'text', placeholder: 'اسم اللاعب ' + (rows.length + 1) });
            row.appendChild(input);
            rowState.input = input;

            if (rows.length >= 2) {
                var removeBtn = Studio.util.el('button', { class: 'player-row-remove', type: 'button', text: '×' });
                removeBtn.addEventListener('click', function () {
                    rowsWrap.removeChild(row);
                    rows = rows.filter(function (r) { return r !== rowState; });
                    updateAddButtonState();
                });
                row.appendChild(removeBtn);
            }
            rows.push(rowState);
            rowsWrap.appendChild(row);
            updateAddButtonState();
        }

        addRowBtn.addEventListener('click', addRow);
        addRow();
        addRow();
        box.appendChild(addRowBtn);

        var startBtn = Studio.util.el('button', { text: 'ابدأ اللعبة' });
        startBtn.addEventListener('click', function () {
            var usable = rows.filter(function (r) { return r.input.value.trim(); });
            if (usable.length < 2 || usable.length > 6) {
                Studio.dialog.alert('الرجاء إدخال بين ٢ و ٦ أسماء لاعبين.');
                return;
            }
            state.players = usable.map(function (r) { return r.input.value.trim(); });
            state.playerAvatars = {};
            usable.forEach(function (r) {
                var name = r.input.value.trim();
                state.scores[name] = 0;
                if (r.characterId) state.playerAvatars[name] = r.characterId;
            });

            var avatarIds = Object.keys(state.playerAvatars).map(function (n) { return state.playerAvatars[n]; });
            state.playerAvatarUrls = {};
            var resolvePromise = avatarIds.length === 0
                ? Promise.resolve()
                : Studio.characters.list().then(function (chars) {
                    var byId = {};
                    chars.forEach(function (c) { byId[c.id] = c; });
                    return Promise.all(Object.keys(state.playerAvatars).map(function (name) {
                        var ch = byId[state.playerAvatars[name]];
                        if (!ch) return null;
                        return Studio.characters.resolveUrl(ch).then(function (url) {
                            state.playerAvatarUrls[name] = url;
                        });
                    }));
                });

            resolvePromise.then(function () {
                updateScores();
                showCategoryView();
            });
        });
        box.appendChild(startBtn);
        els.setupView.appendChild(box);
        showSub(els.setupView);
    }

    // ---------- Scores ----------

    function updateScores() {
        els.scoresPanel.classList.remove('hidden');
        els.scoresPanel.innerHTML = '';
        state.players.forEach(function (player) {
            var chip = Studio.util.el('div', { class: 'score-chip' });
            if (state.playerAvatarUrls[player]) {
                chip.appendChild(Studio.util.el('img', { class: 'score-chip-avatar', src: state.playerAvatarUrls[player] }));
            }
            chip.appendChild(Studio.util.el('span', { class: 'score-chip-name', text: player }));
            chip.appendChild(Studio.util.el('span', { class: 'score-chip-value', text: String(state.scores[player]) }));
            var dec = Studio.util.el('button', { text: '-' });
            dec.addEventListener('click', function () {
                if (state.scores[player] > 0) { state.scores[player]--; updateScores(); }
            });
            var inc = Studio.util.el('button', { text: '+' });
            inc.addEventListener('click', function () { state.scores[player]++; updateScores(); });
            chip.appendChild(dec);
            chip.appendChild(inc);
            els.scoresPanel.appendChild(chip);
        });
        var winnerBtn = Studio.util.el('button', { class: 'winner-button', text: '🏆 الفائز' });
        winnerBtn.addEventListener('click', showWinner);
        els.scoresPanel.appendChild(winnerBtn);
    }

    function showWinner() {
        var maxScore = -1;
        for (var p in state.scores) if (state.scores[p] > maxScore) maxScore = state.scores[p];
        if (maxScore <= 0) { Studio.dialog.alert('لا يوجد نقاط بعد!'); return; }
        var winners = state.players.filter(function (p) { return state.scores[p] === maxScore; });

        els.winnerOverlay.innerHTML = '';
        var box = Studio.util.el('div', { class: 'winner-box' });
        var title = winners.length === 1 ? 'مبروك' : 'تعادل';
        var text = winners.length === 1
            ? (winners[0] + ' ب ' + maxScore + ' نقاط')
            : (winners.join(' و ') + ' ب ' + maxScore + ' نقاط');
        box.appendChild(Studio.util.el('h2', { text: title }));
        box.appendChild(Studio.util.el('p', { text: text }));
        var closeBtn = Studio.util.el('button', { text: 'إغلاق' });
        closeBtn.addEventListener('click', function () { els.winnerOverlay.classList.add('hidden'); });
        box.appendChild(closeBtn);
        els.winnerOverlay.appendChild(box);
        els.winnerOverlay.classList.remove('hidden');

        if (window.confetti) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        }
    }

    // ---------- Category grid ----------

    var CATEGORY_MAX_COLS = 5;
    var NUMBER_MAX_COLS = 4;

    function showCategoryView() {
        clearActiveRender();
        stopTimer();
        els.categoryView.innerHTML = '';
        els.categoryView.appendChild(Studio.util.el('h1', { class: 'play-game-title', text: state.game.name }));
        var grid = Studio.util.el('div', { class: 'category-buttons' });
        var sorted = state.game.categories.slice().sort(function (a, b) { return a.order - b.order; });

        var columns = Studio.util.computeBalancedColumns(sorted.length, CATEGORY_MAX_COLS);
        Studio.util.chunk(sorted, columns).forEach(function (rowCats) {
            var row = Studio.util.el('div', { class: 'category-row' });
            rowCats.forEach(function (cat) {
                var total = cat.questions.length;
                var answeredCount = state.answeredQuestionIds[cat.id] ? state.answeredQuestionIds[cat.id].size : 0;
                var btn = Studio.util.el('button', {}, [
                    Studio.util.el('span', { class: 'category-btn-icon', text: cat.icon || '❓' }),
                    Studio.util.el('span', { class: 'category-btn-label', text: cat.name })
                ]);
                if (total > 0 && answeredCount >= total) btn.classList.add('completed');
                btn.addEventListener('click', function () { showNumberView(cat.id); });
                row.appendChild(btn);
            });
            grid.appendChild(row);
        });

        els.categoryView.appendChild(grid);
        showSub(els.categoryView);
    }

    // ---------- Question-number grid ----------

    function showNumberView(categoryId) {
        clearActiveRender();
        stopTimer();
        state.currentCategoryId = categoryId;
        var category = getCategory(categoryId);
        els.numberView.innerHTML = '';

        var backBtn = Studio.util.el('button', { text: '↩ رجوع' });
        backBtn.addEventListener('click', showCategoryView);
        els.numberView.appendChild(Studio.util.el('div', { class: 'back-button-container' }, [backBtn]));

        els.numberView.appendChild(Studio.util.el('h2', { class: 'play-subtitle', text: (category.icon || '') + ' ' + category.name }));

        var randomBtn = Studio.util.el('button', { id: 'random-question-btn', text: '🎲 اختيار عشوائي' });
        randomBtn.addEventListener('click', function () { selectRandomQuestion(category); });
        els.numberView.appendChild(Studio.util.el('div', { class: 'random-button-container' }, [randomBtn]));

        var grid = Studio.util.el('div', { class: 'question-numbers' });
        var sorted = category.questions.slice().sort(function (a, b) { return a.order - b.order; });

        var columns = Studio.util.computeBalancedColumns(sorted.length, NUMBER_MAX_COLS);
        Studio.util.chunk(sorted, columns).forEach(function (rowQuestions, rowIdx) {
            var row = Studio.util.el('div', { class: 'number-row' });
            rowQuestions.forEach(function (q, colIdx) {
                var idx = rowIdx * columns + colIdx;
                var btn = Studio.util.el('button', { text: String(idx + 1) });
                if (state.answeredQuestionIds[category.id].has(q.id)) btn.classList.add('answered');
                btn.addEventListener('click', function () { showQuestion(category, q); });
                row.appendChild(btn);
            });
            grid.appendChild(row);
        });
        els.numberView.appendChild(grid);

        if (sorted.length === 0) {
            els.numberView.appendChild(Studio.util.el('p', { class: 'empty-text', text: 'لا توجد أسئلة في هذه الفئة بعد.' }));
        }

        showSub(els.numberView);
    }

    function selectRandomQuestion(category) {
        var answered = state.answeredQuestionIds[category.id];
        var available = category.questions.filter(function (q) { return !answered.has(q.id); });
        if (available.length === 0) {
            Studio.dialog.alert('تمت الإجابة على جميع أسئلة هذه الفئة!');
            return;
        }
        var q = available[Math.floor(Math.random() * available.length)];
        showQuestion(category, q);
    }

    function getCategory(id) {
        return state.game.categories.find(function (c) { return c.id === id; });
    }

    // ---------- Question view ----------

    var renderToken = 0;

    function clearActiveRender() {
        renderToken++;
        if (state.activeRender) {
            state.activeRender.cleanup();
            state.activeRender = null;
        }
    }

    function stopTimer() {
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        els.timerDisplay.classList.add('hidden');
    }

    function showQuestion(category, question) {
        clearActiveRender();
        stopTimer();

        els.questionView.innerHTML = '';
        var backBtn = Studio.util.el('button', { text: '↩ رجوع' });
        backBtn.addEventListener('click', function () { showNumberView(category.id); });
        els.questionView.appendChild(Studio.util.el('div', { class: 'back-button-container' }, [backBtn]));

        var sorted = category.questions.slice().sort(function (a, b) { return a.order - b.order; });
        var indexInCat = sorted.findIndex(function (q) { return q.id === question.id; }) + 1;
        var numberDisplay = Studio.util.el('div', { id: 'question-number-display' }, [
            Studio.util.el('div', { class: 'number-circle', text: String(indexInCat) })
        ]);
        els.questionView.appendChild(numberDisplay);

        var displayWrap = Studio.util.el('div', { class: 'question-display' });
        els.questionView.appendChild(displayWrap);

        var myToken = renderToken;
        Studio.questionRenderer.render(question, category.type, function (media) {
            return Studio.games.resolveMediaUrl(state.game.id, media);
        }).then(function (result) {
            if (myToken !== renderToken) {
                // User navigated away before this resolved — discard instead of leaking.
                result.cleanup();
                return;
            }
            displayWrap.appendChild(result.el);
            state.activeRender = result;
        });

        state.answeredQuestionIds[category.id].add(question.id);
        showSub(els.questionView);

        els.timerDisplay.classList.remove('hidden');
        var timeLeft = state.game.settings.timerSeconds || 60;
        els.timerDisplay.textContent = timeLeft;
        els.timerDisplay.classList.remove('urgent');
        state.timerInterval = setInterval(function () {
            timeLeft--;
            if (timeLeft >= 0) els.timerDisplay.textContent = timeLeft;
            if (timeLeft < 10 && timeLeft >= 0) els.timerDisplay.classList.add('urgent');
            if (timeLeft < 0) {
                clearInterval(state.timerInterval);
                els.timerDisplay.textContent = "⏰";
            }
        }, 1000);
    }

    Studio.play = {
        mount: mount,
        start: start
    };
})(window.Studio);
