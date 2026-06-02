import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export class PasswordService {
  private readonly saltLength = 16;
  private readonly keyLength = 64;
  private readonly encoding = 'hex';

  hashPassword(password: string): string {
    if (!password) {
      throw new Error('Senha é obrigatória');
    }

    const salt = randomBytes(this.saltLength).toString(this.encoding);
    const derivedKey = scryptSync(password, salt, this.keyLength).toString(this.encoding);

    return `${salt}:${derivedKey}`;
  }

  comparePassword(password: string, storedHash: string): boolean {
    if (!password) {
      throw new Error('Senha é obrigatória');
    }

    if (!storedHash || !storedHash.includes(':')) {
      return false;
    }

    const [salt, expectedHash] = storedHash.split(':');
    if (!salt || !expectedHash) {
      return false;
    }

    const actualHash = scryptSync(password, salt, this.keyLength);
    const expectedHashBuffer = Buffer.from(expectedHash, this.encoding);

    if (actualHash.length !== expectedHashBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualHash, expectedHashBuffer);
  }

  decryptPassword(): never {
    throw new Error('Senha não pode ser descriptografada. Use comparePassword para validação.');
  }
}
