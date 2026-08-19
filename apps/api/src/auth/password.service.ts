import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const FORMAT = 'scrypt';

function scryptAsync(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(password, salt);

    return `${FORMAT}:${salt}:${derivedKey.toString('hex')}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [format, salt, expectedHex] = storedHash.split(':');

    if (
      format !== FORMAT ||
      !salt ||
      !expectedHex ||
      expectedHex.length !== KEY_LENGTH * 2
    ) {
      return false;
    }

    const derivedKey = await scryptAsync(password, salt);
    const expected = Buffer.from(expectedHex, 'hex');

    return (
      expected.length === derivedKey.length &&
      timingSafeEqual(expected, derivedKey)
    );
  }
}
