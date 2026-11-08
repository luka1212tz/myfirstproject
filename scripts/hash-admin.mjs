import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

async function readPassword() {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    const rl = createInterface({ input: stdin, output: stdout });
    const value = await rl.question('Choose a strong admin password (terminal input may be visible): ');
    rl.close();
    return value;
  }

  stdout.write('Choose a strong admin password (input is hidden): ');
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
  stdin.resume();
  return new Promise((resolve) => {
    let password = '';
    function finish() {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdout.write('\n');
      resolve(password);
    }
    function onData(chunk) {
      for (const char of chunk) {
        if (char === '\u0003') {
          finish();
          process.exit(130);
        } else if (char === '\r' || char === '\n') {
          finish();
          return;
        } else if (char === '\u007f' || char === '\b') {
          password = password.slice(0, -1);
        } else if (char >= ' ' && char !== '\u007f') {
          password += char;
        }
      }
    }
    stdin.on('data', onData);
  });
}

const password = await readPassword();
if (password.length < 12) {
  console.error('Use at least 12 characters.');
  process.exit(1);
}
const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');
console.log(`\nADMIN_PASSWORD_HASH=scrypt$${salt}$${hash}\n`);
console.log('Copy the complete value into your Vercel environment variables.');
