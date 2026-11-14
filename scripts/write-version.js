// Stamps each build with a unique id. The running app compares its own id with
// /version.json on the server; if they differ, it offers the user an update.
const fs = require('fs');
const path = require('path');

const id = String(Date.now());
const info = { id, builtAt: new Date().toISOString() };

fs.writeFileSync(path.join(__dirname, '..', 'src', 'buildInfo.json'), JSON.stringify(info, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, '..', 'public', 'version.json'), JSON.stringify(info) + '\n');
console.log(`build id ${id}`);
