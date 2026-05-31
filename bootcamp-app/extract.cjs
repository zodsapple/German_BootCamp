const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync('../deutsch_b1_bootcamp.html', 'utf8');

// The bootCampCurriculum object is defined as: const bootCampCurriculum = { ... };
const match = htmlContent.match(/const bootCampCurriculum = (\{[\s\S]*?\n        \});/);

if (!match) {
    console.error("Could not find bootCampCurriculum object in the HTML file.");
    process.exit(1);
}

// Evaluate the object string
let bootCampCurriculum;
try {
    const fn = new Function('return ' + match[1]);
    bootCampCurriculum = fn();
} catch (e) {
    console.error("Error parsing the curriculum object:", e);
    process.exit(1);
}

const dataDir = path.join(__dirname, 'src', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let curriculumIndex = [];

for (const [day, data] of Object.entries(bootCampCurriculum)) {
    curriculumIndex.push({
        day: parseInt(day),
        title: data.title,
        focus: data.focus
    });

    // Standardize dictations
    let dictations = [];
    if (data.dictations && Array.isArray(data.dictations)) {
        dictations = data.dictations;
    } else if (data.dictation) {
        dictations = [data.dictation];
    }

    // Standardize grammars
    let grammars = [];
    if (data.grammars && Array.isArray(data.grammars)) {
        grammars = data.grammars;
    } else if (data.grammar) {
        grammars = [data.grammar];
    }

    const standardizedData = {
        day: parseInt(day),
        title: data.title,
        focus: data.focus,
        vocab: data.vocab || [],
        dictations: dictations,
        grammars: grammars
    };

    fs.writeFileSync(
        path.join(dataDir, `day${day}.json`),
        JSON.stringify(standardizedData, null, 2),
        'utf8'
    );
}

fs.writeFileSync(
    path.join(dataDir, 'curriculum_index.json'),
    JSON.stringify(curriculumIndex, null, 2),
    'utf8'
);

console.log("Successfully extracted data into src/data/");
