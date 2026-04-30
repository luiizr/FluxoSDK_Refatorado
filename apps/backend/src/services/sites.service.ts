import { pg } from '../main';
import * as crypto from 'crypto';

export class SitesService {
  async registerSite(name: string, domain: string, userId: string) {
    if (!name) throw new Error('O nome do site e obrigatorio');
    if (!domain) throw new Error('O dominio e obrigatorio');
    if (!userId) throw new Error('Usuario invalido');

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    const result = await pg.query(
      `
        INSERT INTO sites (name, domain, user_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, domain, active, created_at
      `,
      [name, cleanDomain, userId],
    );
    const site = result.rows[0];

    const publicKey = `pk_${crypto.randomUUID().replace(/-/g, '')}`;

    const keyResult = await pg.query(
      `
        INSERT INTO site_keys (site_id, public_key)
        VALUES ($1, $2)
        RETURNING public_key
      `,
      [site.id, publicKey],
    );

    return {
      id: site.id,
      name: site.name,
      domain: site.domain,
      active: site.active,
      created_at: site.created_at,
      siteKey: keyResult.rows[0].public_key,
    };
  }

  async listSites(userId: string) {
    const user = await this.getUser(userId);
    if (!user) throw new Error('Usuario invalido');

    const values: string[] = [];
    let whereClause = '';

    if (!user.is_root) {
      values.push(userId);
      whereClause = 'WHERE s.user_id = $1';
    }

    const result = await pg.query(
      `
        SELECT
          s.id,
          s.name,
          s.domain,
          s.active,
          s.created_at,
          s.user_id as "userId",
          u.name as "ownerName",
          u.email as "ownerEmail",
          k.public_key as "siteKey"
        FROM sites s
        LEFT JOIN users u ON u.id = s.user_id
        LEFT JOIN site_keys k ON s.id = k.site_id AND k.active = true
        ${whereClause}
        ORDER BY s.created_at DESC
      `,
      values,
    );

    return result.rows;
  }

  async deleteSite(id: string, userId: string) {
    const user = await this.getUser(userId);
    if (!user) throw new Error('Usuario invalido');

    const values = user.is_root ? [id] : [id, userId];
    const whereClause = user.is_root ? 'id = $1' : 'id = $1 AND user_id = $2';

    const check = await pg.query(`SELECT id FROM sites WHERE ${whereClause}`, values);
    if (check.rows.length === 0) {
      throw new Error('Site nao encontrado ou sem permissao');
    }

    await pg.query(`DELETE FROM sites WHERE id = $1`, [id]);
  }

  private async getUser(userId: string) {
    if (!userId) return null;

    const result = await pg.query(`SELECT id, is_root FROM users WHERE id = $1`, [userId]);
    return result.rows[0] ?? null;
  }
}
