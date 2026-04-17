import { pg } from '../main';

export class AuthService {
  async register(email: string, pass: string) {
    if (!email) throw new Error('E-mail é obrigatório');
    if (!pass) throw new Error('Senha é obrigatória');

    const result = await pg.query(
      `
        INSERT INTO users (email, password_hash)
        VALUES ($1, crypt($2, gen_salt('bf')))
        RETURNING id, email, created_at
      `,
      [email, pass]
    );
    return result.rows[0];
  }

  async login(email: string, pass: string) {
    if (!email || !pass) throw new Error('E-mail e senha são obrigatórios');

    const result = await pg.query(
      `
        SELECT id, email, created_at 
        FROM users 
        WHERE email = $1 AND password_hash = crypt($2, password_hash)
      `,
      [email, pass]
    );

    if (result.rows.length === 0) {
      throw new Error('E-mail ou senha inválidos');
    }

    return result.rows[0];
  }
}