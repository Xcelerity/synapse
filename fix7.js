const fs = require('fs');

function replaceLine(file, regex, replacement) {
    let t = fs.readFileSync(file, 'utf8');
    if (regex.test(t)) {
        t = t.replace(regex, replacement);
        fs.writeFileSync(file, t, 'utf8');
        console.log('Fixed', file, regex);
    }
}

const f1 = 'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/timetable/page.tsx';
replaceLine(f1, /.*Weekend/g, '                🏖️ Weekend');

const f2 = 'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/tasks/page.tsx';
replaceLine(f2, /.*Assignment.*<\/option>/g, '              <option value="assignment">📝 Assignment</option>');
replaceLine(f2, /.*Class.*<\/option>/g, '              <option value="class">🏫 Class</option>');

const f3 = 'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/skill-tree/page.tsx';
replaceLine(f3, /.*The Trophy Room/g, '              🏆 The Trophy Room');

const f4 = 'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/oral-interview/page.tsx';
replaceLine(f4, /.*score >= 80.*\.score >= 60.*/g, "                                <div className=\"page-container\" style={{ fontSize: 48, marginBottom: 16 }}>{r.score >= 80 ? '🏆' : r.score >= 60 ? '🎓' : '📚'}</div>");
replaceLine(f4, /.*Oral Interview Practice/g, '                        🎙️ Oral Interview Practice');
replaceLine(f4, /.*Mic Active.*/g, "                            {isMuted ? '🔇 Unmute' : '🎙️ Mic Active'}");

const f5 = 'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/ocr/page.tsx';
replaceLine(f5, /.*Open in Notes.*/g, '                                📝 Open in Notes');

const f6 = 'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/essay-grader/page.tsx';
replaceLine(f6, /.*icon:.*",/g, '      icon: "📝",');
replaceLine(f6, /.*Your Essay.*/g, '                ? "📝 Your Essay"');

const f7 = 'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/cheatsheets/page.tsx';
replaceLine(f7, /.*Type \/ Paste.*/g, '                    {tab === "text" && "📝 Type / Paste"}');
replaceLine(f7, /.*Image".*/g, '                    {tab === "image" && "🖼️ Image"}');
replaceLine(f7, /.*fontSize: 32, marginBottom: 12.*/g, '                  <div className="page-container" style={{ fontSize: 32, marginBottom: 12 }}>📝</div>');
