const path = require('path');
const spawn = require('child_process').spawn;

function cmd(program, args) {
  console.log('CMD:', program, args);
  const p = spawn(program, args.flat(), { stdio: 'inherit' });

  // Handle termination signals
  process.on('SIGINT', () => {
    p.kill('SIGINT');
    process.exit();
  });

  p.on('close', (code) => {
    if (code !== 0) {
      console.error(program, args, 'exited with', code);
    }
  });
  return p;
}

const tscPath = path.resolve('node_modules', '.bin', 'tsc');
cmd(tscPath, ['-w']);
cmd('http-server', ['-p', '8080', '-a', '127.0.0.1', '-s']);

