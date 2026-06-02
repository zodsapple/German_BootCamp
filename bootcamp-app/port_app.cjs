const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync('../deutsch_b1_bootcamp.html', 'utf8');

// The React code starts after <script type="text/babel">
const scriptStart = htmlContent.indexOf('<script type="text/babel">');
const scriptEnd = htmlContent.indexOf('</script>', scriptStart);

if (scriptStart === -1 || scriptEnd === -1) {
  console.error("Could not find React script block.");
  process.exit(1);
}

let reactCode = htmlContent.substring(scriptStart + 26, scriptEnd);

// Remove the `const { useState, useEffect } = React;`
reactCode = reactCode.replace(/const\s*{\s*useState\s*,\s*useEffect\s*}\s*=\s*React\s*;\s*/, '');

// Remove the `bootCampCurriculum` object completely.
const match = reactCode.match(/const bootCampCurriculum = (\{[\s\S]*?\n        \});/);
if (match) {
  reactCode = reactCode.replace(match[0], '');
}

// Remove ReactDOM.createRoot part at the bottom
reactCode = reactCode.replace(/const root = ReactDOM\.createRoot[\s\S]*/, '');

// Inject Vite imports and data loading logic
const appImports = `import { useState, useEffect } from 'react';

// Load curriculum data dynamically
const modules = import.meta.glob('./data/day*.json', { eager: true });
const bootCampCurriculum = {};
for (const path in modules) {
    const dayMatch = path.match(/day(\\d+)\\.json/);
    if (dayMatch) {
        bootCampCurriculum[dayMatch[1]] = modules[path].default || modules[path];
    }
}
`;

let finalAppCode = appImports + '\n' + reactCode.trim() + '\n\nexport default App;';

fs.writeFileSync(path.join(__dirname, 'src', 'App.jsx'), finalAppCode, 'utf8');

// Create main.jsx
const mainCode = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
fs.writeFileSync(path.join(__dirname, 'src', 'main.jsx'), mainCode, 'utf8');

console.log("Successfully ported App.jsx and main.jsx");
