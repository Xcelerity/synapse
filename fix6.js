const fs = require('fs');

const reps = {
    'ðŸ –ï¸ ': '🏖️',
    'ðŸ“ ': '📝',
    'ðŸ «': '🏫',
    'ðŸ †': '🏆',
    'ðŸŽ™ï¸ ': '🎙️',
    'ðŸ–¼ï¸ ': '🖼️',
    'ðŸ§ ': '🧠'
};

const files = [
    'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/timetable/page.tsx',
    'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/tasks/page.tsx',
    'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/skill-tree/page.tsx',
    'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/oral-interview/page.tsx',
    'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/ocr/page.tsx',
    'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/essay-grader/page.tsx',
    'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/cheatsheets/page.tsx'
];

files.forEach(f => {
    let t = fs.readFileSync(f, 'utf8');
    let mod = false;
    for (let k in reps) {
        if (t.includes(k)) {
            t = t.split(k).join(reps[k]);
            mod = true;
        }
    }
    if (mod) {
        fs.writeFileSync(f, t, 'utf8');
        console.log('Fixed', f);
    }
});
