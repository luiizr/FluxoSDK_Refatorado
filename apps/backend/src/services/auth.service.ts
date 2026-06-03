import { createHmac, timingSafeEqual } from 'crypto';
import { pg } from '../main';
import { PasswordService } from './password.service';

type DbUser = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
};

export type AuthenticatedUser = {
  name: string;
  email: string;
};

export type AuthenticatedSession = {
  user: AuthenticatedUser;
  accessToken: string;
};

type AccessTokenPayload = {
  sub: string;
  iat: number;
  exp: number;
};

export class AuthService {
  private readonly passwordService = new PasswordService();
  private readonly accessTokenSecret = process.env.API_ACCESS_TOKEN_SECRET as string;
  private readonly accessTokenTtlSeconds = 60 * 60 * 24 * 7;

  async register(
    name: string,
    email: string,
    password: string,
    twoFactor: boolean,
    urlphoto?: string,
  ): Promise<AuthenticatedSession> {
    if (!name) throw new Error('Nome é obrigatório');
    if (!email) throw new Error('E-mail é obrigatório');
    if (!password) throw new Error('Senha é obrigatória');

    const userExists = await pg.query(
      `SELECT id FROM usuarios WHERE email = $1`,
      [email],
    );

    if (userExists.rows.length > 0) {
      throw new Error('E-mail já cadastrado');
    }

    // Criptografa a senha antes de persistir no banco.
    const passwordHash = this.passwordService.hashPassword(password);

    const result = await pg.query<DbUser>(
      `
        INSERT INTO usuarios (
          name,
          email,
          password,
          urlphoto,
          doisfatores,
          createdat,
          updatedat
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING
          id,
          name,
          email,
          isactive AS is_active
      `,
      [name, email, passwordHash, urlphoto, twoFactor ?? false],
    );

    const user = result.rows[0];

    return this.createSession(user);
  }

  async login(email: string, password: string): Promise<AuthenticatedSession> {
    if (!email || !password) throw new Error('E-mail e senha são obrigatórios');

    const authQuery = await pg.query<DbUser & { password_hash: string }>(
      `
        SELECT
          id,
          name,
          email,
          isactive AS is_active,
          password AS password_hash
        FROM usuarios
        WHERE email = $1
      `,
      [email],
    );

    if (authQuery.rows.length === 0) {
      throw new Error('E-mail não cadastrado');
    }

    const user = authQuery.rows[0];

    if (!user.is_active) {
      throw new Error('Usuário inativo');
    }

    if (!this.passwordService.comparePassword(password, user.password_hash)) {
      throw new Error('Senha incorreta');
    }

    // await pg.query(`UPDATE usuarios SET updatedat = NOW() WHERE id = $1`, [user.id]);

    const { password_hash: _passwordHash, ...safeUser } = user;

    return this.createSession(safeUser);
  }

  async getUserFromToken(accessToken: string): Promise<AuthenticatedUser> {
    const payload = this.verifyAccessToken(accessToken);
    const result = await pg.query<DbUser>(
      `
        SELECT
          id,
          name,
          email,
          isactive AS is_active
        FROM usuarios
        WHERE id = $1
      `,
      [payload.sub],
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      throw new Error('Token de acesso inválido');
    }

    return this.toPublicUser(user);
  }

  private createSession(user: DbUser): AuthenticatedSession {
    return {
      user: this.toPublicUser(user),
      accessToken: this.createAccessToken(user),
    };
  }

  private createAccessToken(user: Pick<DbUser, 'id'>): string {
    const header = this.base64UrlEncode({
      alg: 'HS256',
      typ: 'JWT',
    });

    const now = Math.floor(Date.now() / 1000);
    const payload = this.base64UrlEncode({
      sub: String(user.id),
      iat: now,
      exp: now + this.accessTokenTtlSeconds,
    });

    const unsignedToken = `${header}.${payload}`;
    const signature = this.signToken(unsignedToken);

    return `${unsignedToken}.${signature}`;
  }

  private verifyAccessToken(accessToken: string): AccessTokenPayload {
    const [headerPart, payloadPart, signature] = accessToken.split('.');

    if (!headerPart || !payloadPart || !signature) {
      throw new Error('Token de acesso inválido');
    }

    const header = this.base64UrlDecode<{ alg?: string; typ?: string }>(headerPart);
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new Error('Token de acesso inválido');
    }

    const unsignedToken = `${headerPart}.${payloadPart}`;
    const expectedSignature = this.signToken(unsignedToken);
    const received = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new Error('Token de acesso inválido');
    }

    const payload = this.base64UrlDecode<AccessTokenPayload>(payloadPart);
    const now = Math.floor(Date.now() / 1000);

    if (!payload.sub || !payload.exp || payload.exp <= now) {
      throw new Error('Token de acesso expirado');
    }

    return payload;
  }

  private signToken(unsignedToken: string): string {
    if (!this.accessTokenSecret) {
      throw new Error('Segredo do token de acesso não configurado');
    }

    return createHmac('sha256', this.accessTokenSecret)
      .update(unsignedToken)
      .digest('base64url');
  }

  private base64UrlEncode(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private base64UrlDecode<T>(value: string): T {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  }

  private toPublicUser(user: Pick<DbUser, 'name' | 'email'>): AuthenticatedUser {
    return {
      name: user.name,
      email: user.email,
    };
  }
}
