const fs = require('fs');

const content = fs.readFileSync('theme.liquid', 'utf8');
const lines = content.split(/\r?\n/);

lines.forEach((line, index) => {
  if (line.includes('reels') || line.includes('tj-reel')) {
    console.log(`${index + 1}: ${line.trim().substring(0, 150)}`);
  }
});
