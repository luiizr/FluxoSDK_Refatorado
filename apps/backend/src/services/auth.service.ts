import { createHmac } from 'crypto';
import { pg } from '../main';
import { PasswordService } from './password.service';

type DbUser = {
  id: string;
  name: string;
  email: string;
  is_root: boolean;
  urlphoto: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AuthenticatedUser = DbUser & {
  accessToken: string;
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
  ): Promise<AuthenticatedUser> {
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
          urlphoto AS urlphoto,
          createdat AS created_at,
          updatedat AS updated_at
      `,
      [name, email, passwordHash, urlphoto, twoFactor ?? false],
    );

    const user = result.rows[0];
    console.info("user created:", user);

    return {
      ...user,
      accessToken: this.createAccessToken(user),
    };
  }

  async login(email: string, password: string): Promise<AuthenticatedUser> {
    if (!email || !password) throw new Error('E-mail e senha são obrigatórios');

    const authQuery = await pg.query<DbUser & { password_hash: string }>(
      `
        SELECT
          id,
          name,
          email,
          urlphoto AS urlphoto,
          createdat AS created_at,
          updatedat AS updated_at,
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

    if (!this.passwordService.comparePassword(password, user.password_hash)) {
      throw new Error('Senha incorreta');
    }

    // await pg.query(`UPDATE usuarios SET updatedat = NOW() WHERE id = $1`, [user.id]);

    const { password_hash: _passwordHash, ...safeUser } = user;

    return {
      ...safeUser,
      accessToken: this.createAccessToken(safeUser),
    };
  }

  private createAccessToken(user: Pick<DbUser, 'id' | 'email'>): string {
    const header = this.base64UrlEncode({
      alg: 'HS256',
      typ: 'JWT',
    });

    const now = Math.floor(Date.now() / 1000);
    const payload = this.base64UrlEncode({
      sub: String(user.id),
      email: user.email,
      iat: now,
      exp: now + this.accessTokenTtlSeconds,
    });

    const unsignedToken = `${header}.${payload}`;
    const signature = createHmac('sha256', this.accessTokenSecret)
      .update(unsignedToken)
      .digest('base64url');

    return `${unsignedToken}.${signature}`;
  }

  private base64UrlEncode(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
}
