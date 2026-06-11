const { spawn } = require('child_process');
const path = require('path');

const backendPath = 'f:\\FYP\\backend';
process.chdir(backendPath);

const npm = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

npm.on('error', (err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
