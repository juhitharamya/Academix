import { spawn } from 'node:child_process';
import net from 'node:net';

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function run(command, args, name, extraEnv = {}) {
  const finalCommand = isWin ? 'cmd.exe' : command;
  const finalArgs = isWin ? ['/d', '/s', '/c', command, ...args] : args;
  const child = spawn(finalCommand, finalArgs, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });
  return child;
}

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port, host: '127.0.0.1' }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickHmrPort(basePort) {
  if (process.env.HMR_PORT) return process.env.HMR_PORT;
  const start = Number(basePort) + 1000;
  for (let p = start; p < start + 20; p++) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(p)) return String(p);
  }
  return String(start);
}

const apiPort = process.env.API_PORT || '3002';
const port = process.env.PORT || '3001';
(async () => {
  const hmrPort = await pickHmrPort(port);

  console.log(`[dev] Frontend: http://localhost:${port}  (HMR ${hmrPort})`);
  console.log(`[dev] Backend : http://localhost:${apiPort}  (Swagger /swagger)`);

  const server = run(npmCmd, ['--prefix', 'backend', 'run', 'dev'], 'server', { API_PORT: apiPort, API_ONLY: 'true' });
  const client = run(npmCmd, ['--prefix', 'frontend', 'run', 'dev'], 'client', { PORT: port, API_PORT: apiPort, HMR_PORT: hmrPort });

  function shutdown() {
    server.kill('SIGINT');
    client.kill('SIGINT');
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
