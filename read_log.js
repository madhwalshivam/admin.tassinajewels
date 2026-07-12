const fs = require('fs');
const path = require('path');

const targetConvs = [
  'a787ec0c-0e05-45bf-bca3-4265c163c82f',
  '2c35f1fa-68bb-49d5-834c-f09e725ef117',
  '0224f656-608d-4018-92a9-52e4ce323dcc',
  '55f436a5-b444-4bcb-b367-a0780416a217'
];

targetConvs.forEach(convId => {
  const logPath = `C:\\Users\\sonia\\.gemini\\antigravity\\brain\\${convId}\\.system_generated\\logs\\overview.txt`;
  console.log(`Checking ${convId}...`);
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8');
    // Search for matches
    let pos = 0;
    while (true) {
      pos = content.indexOf('Table categories: OK', pos);
      if (pos === -1) break;
      const context = content.substring(pos, pos + 1000);
      console.log(`Found categories print in ${convId}:\n${context}\n==================================================`);
      pos += 20;
    }
  } else {
    console.log(`Log path not found for ${convId}`);
  }
});
