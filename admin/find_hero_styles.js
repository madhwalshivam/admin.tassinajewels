const fs = require('fs');
const lines = fs.readFileSync('../theme.liquid', 'utf-8').split('\n');
lines.forEach((line, idx) => {
  if (line.includes('.tj-hero') || line.includes('tj-hero-carousel') || line.includes('tj-hero-slide')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
