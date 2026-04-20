import { pg } from '../main';

export class AuthService {
  async register(email: string, pass: string, name?: string) {
    if (!email) throw new Error('E-mail é obrigatório');
    if (!pass) throw new Error('Senha é obrigatória');

    const result = await pg.query(
      `
        INSERT INTO users (email, password_hash, name)
        VALUES ($1, crypt($2, gen_salt('bf')), $3)
        RETURNING id, name, email, is_root, profile_picture_url, is_first_login, is_active, created_at, updated_at
      `,
      [email, pass, name || null]
    );
    return result.rows[0];
  }

  async login(email: string, pass: string) {
    if (!email || !pass) throw new Error('E-mail e senha são obrigatórios');

    // Autenticar e retornar dados do usuário
    const authQuery = await pg.query(
      `
        SELECT 
          id, name, email, is_root, profile_picture_url, is_first_login, is_active, created_at, updated_at,
          (password_hash = crypt($2, password_hash)) AS is_valid_password
        FROM users 
        WHERE email = $1
      `,
      [email, pass]
    );

    if (authQuery.rows.length === 0) {
      throw new Error('E-mail não cadastrado');
    }

    const user = authQuery.rows[0];

    if (!user.is_valid_password) {
      throw new Error('Senha incorreta');
    }

    if (!user.is_active) {
      throw new Error('Usuário está inativo ou bloqueado');
    }

    // Atualizar last_login_at
    await pg.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [user.id]
    );

    return user;
  }
}