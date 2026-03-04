const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, 'src/app/(dashboard)');
const reps = {
    'ðŸ’¾': '💾', 'ðŸ —ï¸ ': '🗺️', 'ðŸ—‘ï¸ ': '🗑️', 'ðŸ—‘': '🗑️', 'ðŸ“…': '📅',
    'ðŸ“‹': '📋', 'ðŸ“ ': '📝', 'ðŸ «': '🏫', 'ðŸ“š': '📚', 'ðŸ“Œ': '📌',
    'ðŸŸ¢': '🟢', 'ðŸŸ¡': '🟡', 'ðŸ”´': '🔴', 'ðŸ †': '🏆', 'ðŸŽ“': '🎓',
    'ðŸŽ™ï¸ ': '🎙️', 'ðŸš€': '🚀', 'ðŸ”‡': '🔇', 'ðŸŒŸ': '🌟', 'ðŸ“·': '📸',
    'ðŸ¤–': '🤖', 'ðŸ§ ': '🧠', 'ðŸ“„': '📄', 'ðŸ’¡': '💡', 'ðŸ§‘': '🧑',
    'ðŸ”¬': '🔬', 'ðŸ”„': '🔄', 'ðŸŽ¨': '🎨', 'ðŸ–¼ï¸ ': '🖼️', 'ðŸŽ¥': '📹',
    'â ³': '⏳', 'âœ¨': '✨', 'ðŸ“¥': '📥', 'ðŸ –ï¸ ': '🏖️'
};
function walk(d) {
    let results = [];
    const list = fs.readdirSync(d);
    list.forEach(file => {
        file = path.join(d, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}
const files = walk(dir);
files.forEach(f => {
    let text = fs.readFileSync(f, 'utf8');
    let mod = false;
    for (let k in reps) {
        if (text.includes(k)) {
            text = text.split(k).join(reps[k]);
            mod = true;
        }
    }
    if (mod) {
        fs.writeFileSync(f, text, 'utf8');
        console.log('Fixed', f);
    }
});
