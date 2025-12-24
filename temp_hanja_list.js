
// Mock localStorage
global.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { }
};

const { vocabDB } = require('./js/vocab-data');

const hanjaByGrade = {};

vocabDB.vocabulary.forEach(v => {
    // Skip if no hanja or placeholder
    if (!v.hanja || v.hanja === '─' || v.hanja === '-') return;

    if (!hanjaByGrade[v.grade]) {
        hanjaByGrade[v.grade] = new Set();
    }
    hanjaByGrade[v.grade].add(`${v.word}(${v.hanja})`);
});

const sortedGrades = Object.keys(hanjaByGrade).sort((a, b) => Number(a) - Number(b));

sortedGrades.forEach(grade => {
    console.log(`\n### ${grade}학년 (${hanjaByGrade[grade].size}개)`);
    // Convert Set to Array and join
    const list = Array.from(hanjaByGrade[grade]).join(', ');
    console.log(list);
});
