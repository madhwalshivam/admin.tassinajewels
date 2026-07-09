const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\sonia\\.gemini\\antigravity\\brain\\2c35f1fa-68bb-49d5-834c-f09e725ef117\\.system_generated\\logs\\overview.txt';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('reviews-section') || line.includes('tj-reviews')) {
      console.log(`${index + 1}: ${line.substring(0, 150)}`);
    }
  });
} else {
  console.log("Log path not found");
}
