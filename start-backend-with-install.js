const { spawn } = require('child_process');
const path = require('path');

const backendPath = 'f:\\FYP\\backend';
process.chdir(backendPath);

console.log('Installing dependencies...');
const npm = spawn('npm', ['install'], {
  stdio: 'inherit',
  shell: true
});

npm.on('close', (code) => {
  if (code !== 0) {
    console.error('npm install failed with code', code);
    process.exit(code);
  }
  
  console.log('\nStarting backend...');
  const dev = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  dev.on('error', (err) => {
    console.error('Failed to start backend:', err);
    process.exit(1);
  });
});

npm.on('error', (err) => {
  console.error('Failed to run npm install:', err);
  process.exit(1);
});
