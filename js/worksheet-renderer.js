const WorksheetRenderer = {
    segmentText: function (text) {
        const chars = text.split('');
        const rows = [];
        let currentRow = [];

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const isPunctuation = (char === '.' || char === ',');

            // If punctuation AND current row is FULL (15 items), merge with last item
            if (isPunctuation && currentRow.length === 15) {
                if (currentRow.length > 0) {
                    currentRow[14] += char;
                } else {
                    // Should not happen if length is 15, but safe guard
                    currentRow.push(char);
                }
            } else {
                if (currentRow.length === 15) {
                    rows.push(currentRow);
                    currentRow = [];
                }
                currentRow.push(char);
            }
        }
        if (currentRow.length > 0) rows.push(currentRow);
        return rows;
    },

    generate: function (type, vocabList) {
        let content = '';
        let writerScript = '';
        const self = this;

        if (type === 'meaning') {
            content = `
                <div class="worksheet-section">
                    ${vocabList.map(v => {
                const meaningText = ' ' + v.meaning.replace(/\s+/g, ' ');
                const chunks = self.segmentText(meaningText);
                if (chunks.length === 0) chunks.push(['']);

                return `
                            <div class="vocab-15-section">
                                <div class="vocab-info-header">
                                    <div class="word-box">${v.word}</div>
                                    <div class="hanja-box">${v.hanja}</div>
                                </div>
                                
                                <div class="penmanship-grid-container">
                                    ${[1, 2, 3].map(i => {
                    return chunks.map(chunk => {
                        const chars = [...chunk];
                        while (chars.length < 15) chars.push('');

                        return `
                                                <div class="grid-row trace-row">
                                                    ${chars.map(char => {
                            let mainChar = char;
                            let subChar = '';
                            if (char.length > 1) {
                                mainChar = char[0];
                                subChar = char.substring(1);
                            }

                            const isStandalonePunctuation = char === '.' || char === ',';
                            const style = isStandalonePunctuation ? 'position: absolute; left: 10%; bottom: 10%;' : '';
                            const subStyle = 'position: absolute; right: 5px; bottom: 5px; font-size: 0.7em; line-height: 1;';

                            return `<div class="grid-cell">
                                                            <span class="grid-cell-text" style="${style}">${mainChar}</span>
                                                            ${subChar ? `<span class="grid-cell-text" style="${subStyle}">${subChar}</span>` : ''}
                                                        </div>`;
                        }).join('')}
                                                </div>
                                            `;
                    }).join('');
                }).join('')}
                                </div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        } else if (type === 'sentence') {
            content = `
                <div class="worksheet-section">
                    ${vocabList.map(v => `
                        <div class="vocab-section-break"></div>
                        <div class="vocab-15-section">
                            <div class="vocab-info-header">
                                <div class="word-box">${v.word}</div>
                                <div class="hanja-box">${v.hanja}</div>
                                <div style="margin-left: auto; font-size: 0.9rem; color: #666;">${v.meaning}</div>
                            </div>
                            
                            ${v.examples.map((ex, i) => {
                const exText = ' ' + ex.replace(/\s+/g, ' ');
                const chunks = self.segmentText(exText);
                if (chunks.length === 0) chunks.push([' ']);

                return `
                                    <div style="margin-bottom: 5px;">
                                        <div class="penmanship-grid-container sentence-grid" style="width: 90%; margin: 0 auto;">
                                            ${chunks.map(chunk => {
                    const chars = [...chunk];
                    while (chars.length < 15) chars.push('');

                    return `
                                                    <div class="grid-row trace-row">
                                                        ${chars.map(char => {
                        let mainChar = char;
                        let subChar = '';
                        if (char.length > 1) {
                            mainChar = char[0];
                            subChar = char.substring(1);
                        }

                        const isStandalonePunctuation = char === '.' || char === ',';
                        const style = isStandalonePunctuation ? 'position: absolute; left: 10%; bottom: 10%;' : '';
                        const subStyle = 'position: absolute; right: 5px; bottom: 5px; font-size: 0.7em; line-height: 1;';

                        return `<div class="grid-cell">
                                                                <span class="grid-cell-text" style="${style}">${mainChar}</span>
                                                                ${subChar ? `<span class="grid-cell-text" style="${subStyle}">${subChar}</span>` : ''}
                                                            </div>`;
                    }).join('')}
                                                    </div>
                                                `;
                }).join('')}
                                        </div>
                                    </div>
                                `;
            }).join('')}
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (type === 'hanja') {
            const uniqueHanja = new Set();
            const hanjaDetails = [];
            writerScript = 'window.onload = function() {';

            let charIndex = 0;
            vocabList.forEach(v => {
                if (!v.hanja) return;
                const cleanHanja = v.hanja.replace(/[^\u4e00-\u9fa5]/g, '');
                for (const char of cleanHanja) {
                    if (!uniqueHanja.has(char)) {
                        uniqueHanja.add(char);

                        let eum = '';
                        const sourceVocab = vocabDB.vocabulary.find(item => item.hanja && item.hanja.includes(char));
                        if (sourceVocab) {
                            const idx = sourceVocab.hanja.indexOf(char);
                            if (idx !== -1 && idx < sourceVocab.word.length) {
                                eum = sourceVocab.word[idx];
                            }
                        }

                        let hun = '';
                        let dicEntries = (typeof hanjaDic !== 'undefined' && hanjaDic[char]) ? hanjaDic[char] : [];
                        if (eum && dicEntries.length > 0) {
                            const match = dicEntries.find(e => e.kor === eum);
                            if (match) hun = match.def;
                            else hun = dicEntries[0].def;
                        } else if (dicEntries.length > 0) {
                            eum = dicEntries[0].kor;
                            hun = dicEntries[0].def;
                        }

                        let relatedWords = [];
                        const dbRelated = vocabDB.vocabulary
                            .filter(item => item.hanja && item.hanja.includes(char))
                            .map(item => `${item.word} (${item.hanja})`);
                        relatedWords = relatedWords.concat(dbRelated);

                        if (typeof hanjaCompounds !== 'undefined' && hanjaCompounds[char]) {
                            relatedWords = relatedWords.concat(hanjaCompounds[char]);
                        }

                        const uniqueRelated = [...new Set(relatedWords)];
                        const related = uniqueRelated.slice(0, 10).join(', ');

                        const writerId = `hanzi-writer-${charIndex}`;
                        hanjaDetails.push({ char, related, eum, hun, writerId, index: charIndex });

                        writerScript += `
                            HanziWriter.create('${writerId}', '${char}', {
                                width: 100, height: 100, padding: 0, showOutline: true, strokeColor: '#000', outlineColor: '#ddd'
                            });
                            HanziWriter.loadCharacterData('${char}').then(function(charData) {
                                var container = document.getElementById('stroke-order-${charIndex}');
                                if (container) {
                                    for (var i = 0; i < charData.strokes.length; i++) {
                                        (function(index) {
                                            var stepDiv = document.createElement('div');
                                            stepDiv.className = 'stroke-order-step';
                                            container.appendChild(stepDiv);
                                            var stepWriter = HanziWriter.create(stepDiv, '${char}', {
                                                width: 40, height: 40, padding: 2, showOutline: true, strokeColor: '#333'
                                            });
                                            stepWriter._withDataPromise.then(function() {
                                                stepWriter.hideCharacter();
                                                stepWriter.animateStroke(index);
                                            });
                                        })(i);
                                    }
                                }
                            });
                        `;

                        charIndex++;
                    }
                }
            });

            writerScript += '};';

            content = `
                <div class="worksheet-section">
                    ${hanjaDetails.map((h) => `
                        <div style="break-inside: avoid; margin-bottom: 20px; border-bottom: 1px dashed #ddd; padding-bottom: 15px;">
                            <div style="display: flex; gap: 20px; margin-bottom: 10px; align-items: start;">
                                <div style="border: 2px solid #333; width: 104px; height: 104px; display: flex; align-items: center; justify-content: center; background: #fff;">
                                    <div id="${h.writerId}"></div>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-size: 1.2rem; margin-bottom: 10px; font-weight: bold;">
                                        음: <span style="display: inline-block; min-width: 50px; border-bottom: 1px solid #333; text-align: center;">${h.eum}</span>
                                        &nbsp;&nbsp;
                                        훈: <span style="display: inline-block; min-width: 80px; border-bottom: 1px solid #333; text-align: center;">${h.hun}</span> 
                                    </div>
                                    <div style="font-size: 1rem; color: #444;">
                                        <strong>관련 단어:</strong> ${h.related}
                                    </div>
                                </div>
                            </div>
                            <div class="stroke-order-container" id="stroke-order-${h.index}"></div>
                            <div class="hanja-writing-box">
                                ${Array(10).fill(0).map(() => `
                                    <div class="writing-box" style="position: relative;">
                                        <div style="position: absolute; top: 50%; left: 0; right: 0; border-top: 1px dotted #ccc;"></div>
                                        <div style="position: absolute; left: 50%; top: 0; bottom: 0; border-left: 1px dotted #ccc;"></div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (type === 'quiz') {
            content = `
                <div class="worksheet-section" style="padding: 40px; max-width: 800px; margin: 0 auto; font-family: 'KoPub Batang', serif;">
                    <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
                        <h1 style="margin:0; font-size: 2rem;">어휘력 쪽지 시험</h1>
                        <p style="margin: 10px 0 0 0; color: #666; font-size: 1rem;">
                            날짜: ____년 __월 __일 &nbsp;&nbsp;|&nbsp;&nbsp; 
                            학년: _______ &nbsp;&nbsp;|&nbsp;&nbsp; 
                            이름: ______________ &nbsp;&nbsp;|&nbsp;&nbsp; 
                            점수: ________ / 100
                        </p>
                    </div>

                    <div style="margin-bottom: 40px;">
                        <h3 style="border-left: 5px solid #000; padding-left: 10px; margin-bottom: 15px;">
                            1. 다음 단어의 올바른 뜻을 고르세요. (각 5점)
                        </h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; row-gap: 30px; align-items: start;">
                            ${vocabList.map((v, i) => {
                // Generating Options
                let pool = [];
                if (typeof vocabDB !== 'undefined' && vocabDB.vocabulary) {
                    pool = vocabDB.vocabulary.filter(item => item.id !== v.id);
                } else {
                    pool = vocabList.filter(item => item.id !== v.id);
                }

                // Shuffle pool and pick 3
                const distractors = pool.sort(() => 0.5 - Math.random()).slice(0, 3);
                const options = [v, ...distractors].sort(() => 0.5 - Math.random());

                return `
                                <div style="border-bottom: 1px dotted #ccc; padding-bottom: 15px; break-inside: avoid;">
                                    <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 8px;">
                                        ${i + 1}. ${v.word} <span style="font-size: 0.9rem; color: #666;">(${v.hanja || ''})</span>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.95rem;">
                                        ${options.map((opt, idx) => {
                    let displayMeaning = opt.meaning;
                    try {
                        const escapedOwn = opt.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const escapedTarget = v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        displayMeaning = displayMeaning.replace(new RegExp(escapedOwn, 'gi'), '○○');
                        displayMeaning = displayMeaning.replace(new RegExp(escapedTarget, 'gi'), '○○');
                    } catch (e) { }
                    return `
                                            <div>
                                                <span style="display:inline-block; width:20px; border:1px solid #ddd; border-radius:50%; text-align:center; margin-right:5px; font-size:0.8rem;">${idx + 1}</span>
                                                ${displayMeaning}
                                            </div>
                                        `;
                }).join('')}
                                    </div>
                                </div>
                                `;
            }).join('')}
                        </div>
                    </div>

                    <div style="margin-bottom: 40px;">
                        <h3 style="border-left: 5px solid #000; padding-left: 10px; margin-bottom: 15px;">
                            2. 다음 문장의 빈칸에 들어갈 알맞은 말을 쓰세요. (각 5점)
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 25px;">
                            ${vocabList.map((v, i) => {
                let ex = v.examples[0] || v.meaning;
                if (!ex.includes(v.word)) {
                    ex = v.word + " : " + v.examples[0];
                }
                const escapedWord = v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const blanked = ex.replace(new RegExp(escapedWord, 'g'), '<span style="display:inline-block; width:80px; border-bottom:1px solid #333; margin:0 5px; vertical-align: bottom;"></span>');
                return `
                                    <div style="display: flex; gap: 10px; align-items: baseline; line-height: 1.6; break-inside: avoid;">
                                        <div style="font-weight: bold; min-width: 25px;">${i + 1}.</div>
                                        <div>
                                            ${blanked}
                                            <div style="margin-top: 5px; font-size: 0.85rem; color: #888;">
                                                 (힌트: ${v.meaning.substring(0, 10)}...)
                                            </div>
                                        </div>
                                    </div>
                                `;
            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        return { content, writerScript };
    }
};
