const fs = require('fs');
const files = [
    'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/essay-grader/page.tsx',
    'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/timetable/page.tsx'
];
for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    console.log(`--- ${file} ---`);
    lines.forEach((line, i) => {
        if (line.match(/[^\x00-\x7F]/)) {
            console.log(`${i + 1}: ${line.trim()}`);
        }
    });
}
