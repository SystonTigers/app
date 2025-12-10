const { spawn } = require('child_process');

const child = spawn('npx.cmd', ['wrangler', 'd1', 'migrations', 'apply', 'DB', '--local'], {
    stdio: ['pipe', 'inherit', 'inherit'], // Pipe stdin, inherit stdout/stderr
    shell: true
});

child.on('error', (err) => {
    console.error('Failed to start:', err);
});

// Wait 2s then send 'y'
setTimeout(() => {
    child.stdin.write('y\n');
}, 2000);

child.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
});
