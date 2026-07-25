(function (Studio) {
    'use strict';

    var LEGACY_ID = 'eid-legacy';

    var LEGACY_DEFINITION = {
        name: 'لعبة العائلة (الأصلية)',
        categories: [
            {
                name: 'سؤال وجواب', icon: '📖', type: 'text',
                questions: [
                    'ماهي السوره التي تسمى بأم الكتاب؟',
                    'ماهي السوره التي تسمى بقلب القران؟',
                    'ماذا يسمى صغير الجمل؟',
                    'ماهي اكبر منطقه في المملكه؟',
                    'كم عدد مناطق المملكه الرئيسيه؟',
                    'ماهي اصغر منطقه في المملكه؟',
                    'ماهو اسم اخو يوسف الصغير؟'
                ].map(function (prompt) { return { prompt: prompt }; })
            },
            {
                name: 'من في الصوره؟', icon: '🖼️', type: 'image', sourceFolder: 'GAMEFAM',
                questions: [
                    'ابو صامل.jpg', 'خالد الجليل.jpg', 'الملك سعود.jfif', 'ذاكر نايك.webp',
                    'نجر.jpg', 'الكلباني.jpg', 'تركي الشيخ.jpeg', 'فيصل بن تركي.png',
                    'ميسي.jpg', 'لوفي.jpg'
                ].map(function (f) { return { sourceFile: f }; })
            },
            {
                name: 'من القارئ', icon: '🎙️', type: 'audio', sourceFolder: 'audio',
                questions: [
                    'سلمان العتيبي.mp3', 'مشاري العفاسي.mp3', 'خالد الجليل.mp3', 'Spongebob.mp3',
                    'قص ناصر القصبي.mp3', 'Donald Trump.mp3', 'الملك سلمان.mp3', 'خالد الفيصل.mp3',
                    'محمد هنيدي.mp3', 'Itachi Uchiha.mp3'
                ].map(function (f) { return { sourceFile: f }; })
            },
            {
                name: 'شعار أو مكان', icon: '🏷️', type: 'image', sourceFolder: 'GAMEFAM',
                questions: [
                    'هواوي.jpg', 'متحف.jpg', 'وزارة الثقافة.png', 'بنك الجزيره.png', 'مترو.png',
                    'sixglags.jpg', 'kingdom_arena.webp', 'برج التوام.jpg', 'vox.jpg', 'levis.jpg'
                ].map(function (f) { return { sourceFile: f }; })
            },
            {
                name: 'ماهو اسم التطبيق؟', icon: '📱', type: 'image', sourceFolder: 'GAMEFAM',
                questions: [
                    'chatgpt.png', 'd360.png', 'photos.webp', 'مرسول.webp', 'amazon.png',
                    'telegram.png', 'outlook.png', 'freeform.jpg', 'Apple_Support.webp', 'aliexpress.webp'
                ].map(function (f) { return { sourceFile: f }; })
            },
            {
                name: 'اكمل الفراغ', icon: '📜', type: 'text',
                questions: [
                    '﴿وَاضمُم يَدَكَ إِلىٰ جَناحِكَ تَخرُج بَيضاءَ مِن غَيرِ ___ ءايَةً أُخرىٰ﴾',
                    '﴿اللَّهُ يَصطَفى مِنَ المَلٰئِكَةِ ___ وَمِنَ النّاسِ إِنَّ اللَّهَ سَميعٌ بَصيرٌ﴾',
                    '﴿وَيَومَ يَحشُرُهُم وَما يَعبُدونَ مِن دونِ اللَّهِ فَيَقولُ ءَأَنتُم ___ عِبادى هٰؤُلاءِ أَم هُم ضَلُّوا السَّبيلَ﴾',
                    '﴿أَحَسِبَ النّاسُ أَن ___ أَن يَقولوا ءامَنّا وَهُم لا يُفتَنونَ﴾',
                    '﴿وَإِذا تُتلىٰ عَلَيهِ ءايٰتُنا وَلّىٰ ___ كَأَن لَم يَسمَعها كَأَنَّ فى أُذُنَيهِ وَقرًا فَبَشِّرهُ بِعَذابٍ أَليمٍ﴾',
                    '﴿فَلا تَعلَمُ نَفسٌ ____ لَهُم مِن قُرَّةِ أَعيُنٍ جَزاءً بِما كانوا يَعمَلونَ﴾',
                    '﴿أَفَمَن زُيِّنَ لَهُ سوءُ عَمَلِهِ فَرَءاهُ حَسَنًا فَإِنَّ اللَّهَ يُضِلُّ مَن يَشاءُ وَيَهدى مَن يَشاءُ فَلا ___ نَفسُكَ عَلَيهِم حَسَرٰتٍ إِنَّ اللَّهَ عَليمٌ بِما يَصنَعونَ﴾',
                    '﴿وَالَّذينَ اتَّخَذوا مِن دونِهِ أَولِياءَ اللَّهُ حَفيظٌ عَلَيهِم وَما أَنتَ عَلَيهِم ___',
                    '﴿تِلكَ ءايٰتُ اللَّهِ نَتلوها عَلَيكَ بِالحَقِّ فَبِأَىِّ ___ بَعدَ اللَّهِ وَءايٰتِهِ يُؤمِنونَ﴾',
                    '﴿وَأَرسَلنَا الرِّيٰحَ لَوٰقِحَ فَأَنزَلنا مِنَ السَّماءِ ماءً ___ وَما أَنتُم لَهُ بِخٰزِنينَ﴾'
                ].map(function (prompt) { return { prompt: prompt }; })
            }
        ]
    };

    function getExt(filename) {
        var parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    function findLegacySourceDir(name) {
        return Studio.state.rootHandle.getDirectoryHandle(name, { create: false }).catch(function () {
            Studio.util.showToast('لم يتم العثور على مجلد ' + name + ' — الرجاء اختياره يدوياً.', 'info');
            return window.showDirectoryPicker({ mode: 'read' });
        });
    }

    function run() {
        return Studio.games.exists(LEGACY_ID).then(function (already) {
            if (already) return { skipped: true };
            return doImport();
        });
    }

    function doImport() {
        var gameData;
        var sourceDirs = {};

        return Studio.games.createWithId(LEGACY_ID, { name: LEGACY_DEFINITION.name, themePresetId: 'purple-pink' })
            .then(function (created) {
                gameData = created;
                return findLegacySourceDir('GAMEFAM');
            }).then(function (dir) {
                sourceDirs.GAMEFAM = dir;
                return findLegacySourceDir('audio');
            }).then(function (dir) {
                sourceDirs.audio = dir;

                var chain = Promise.resolve();
                LEGACY_DEFINITION.categories.forEach(function (catDef, catIdx) {
                    var category = Studio.schema.blankCategory({
                        name: catDef.name, icon: catDef.icon, type: catDef.type, order: catIdx
                    });
                    gameData.categories.push(category);

                    catDef.questions.forEach(function (qDef, qIdx) {
                        chain = chain.then(function () {
                            return buildQuestion(category, catDef, qDef, qIdx, sourceDirs);
                        }).then(function (question) {
                            category.questions.push(question);
                        });
                    });
                });
                return chain;
            }).then(function () {
                return Studio.games.save(LEGACY_ID, gameData);
            }).then(function () {
                return { skipped: false };
            });
    }

    function buildQuestion(category, catDef, qDef, qIdx, sourceDirs) {
        var question = Studio.schema.blankQuestion(qIdx);

        if (catDef.type === 'text') {
            question.prompt = qDef.prompt;
            return Promise.resolve(question);
        }

        var srcDir = sourceDirs[catDef.sourceFolder];
        var ext = getExt(qDef.sourceFile);
        var kindDir = catDef.type === 'image' ? 'images' : catDef.type;
        var filename = question.id + '.' + ext;

        return srcDir.getFileHandle(qDef.sourceFile, { create: false })
            .then(function (fh) { return fh.getFile(); })
            .then(function (file) {
                return Studio.games.getMediaDir(LEGACY_ID, kindDir).then(function (destDir) {
                    return Studio.fs.writeBinary(destDir, filename, file).then(function () { return file; });
                });
            }).then(function (file) {
                question.media = {
                    kind: catDef.type,
                    file: 'media/' + kindDir + '/' + filename,
                    originalName: qDef.sourceFile
                };
                if (catDef.type === 'audio' || catDef.type === 'video') {
                    question.media.trimStart = 0;
                    question.media.trimEnd = null;
                    question.media.sizeBytes = file.size;
                }
                return question;
            }).catch(function (err) {
                Studio.util.showToast('تعذّر استيراد ملف: ' + qDef.sourceFile, 'error');
                return question;
            });
    }

    Studio.legacyImport = { run: run };
})(window.Studio);
