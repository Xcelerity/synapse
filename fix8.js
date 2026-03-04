const fs = require('fs');

function replaceLine(file, regex, replacement) {
    let t = fs.readFileSync(file, 'utf8');
    if (regex.test(t)) {
        t = t.replace(regex, replacement);
        fs.writeFileSync(file, t, 'utf8');
        console.log('Fixed', file, regex);
    }
}

const f1 = 'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/essay-grader/page.tsx';
replaceLine(f1, /.*icon: "â ³".*/g, '          { icon: "⏳" },');
replaceLine(f1, /.*âœ ï¸  AI Writing Tools.*/g, '          ✍️ AI Writing Tools');
replaceLine(f1, /.*â ³ \$.*/g, '                ? `⏳ ${activeTool === "humanize" ? "Humanizing + checking..." : "Processing..."}`');
replaceLine(f1, /.*âœ… Strengths.*/g, '                      ✅ Strengths');
replaceLine(f1, /.*âš ï¸  Remaining.*/g, '                          ⚠️ Remaining: {humanizeResult.remainingSignals}');
replaceLine(f1, /.*âœ… No remaining AI patterns.*/g, '                        ✅ No remaining AI patterns detected');
replaceLine(f1, /.*âœ… Humanized Output.*/g, '                    ✅ Humanized Output');
replaceLine(f1, /.*â†™ï¸  Load into input.*/g, '                  ↙️ Load into input (run Detector tab for deeper analysis)');

const f2 = 'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/ocr/page.tsx';
replaceLine(f2, /.*toast.*âœ….*/g, "            toast.success('✅ Text extracted successfully!');");

const f3 = 'c:/Users/kchir/Downloads/New folder (2)/synapse/src/app/(dashboard)/timetable/page.tsx';
replaceLine(f3, /.*title: b.title \+ \(b.completed \? .*/g, '    title: b.title + (b.completed ? " ✅" : ""),');

