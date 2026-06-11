const { spawn } = require('child_process');

const backendPath = 'f:\\FYP\\backend';
process.chdir(backendPath);

console.log('Seeding database...');
const seed = spawn('npm', ['run', 'seed'], {
  stdio: 'inherit',
  shell: true
});

seed.on('close', (code) => {
  console.log('Seeding complete');
  process.exit(code);
});

seed.on('error', (err) => {
  console.error('Failed to seed database:', err);
  process.exit(1);
});
