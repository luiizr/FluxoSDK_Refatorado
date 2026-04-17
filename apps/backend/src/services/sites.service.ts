import { pg } from '../main';
import * as crypto from 'crypto';

export class SitesService {
  async registerSite(name: string, domain: string, userId: string) {
    if (!name) throw new Error('O nome do site é obrigatório');
    if (!domain) throw new Error('O domínio é obrigatório');
    if (!userId) throw new Error('Usuário inválido');

    // Remove protocolo e path
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];       

    const result = await pg.query(
      `
        INSERT INTO sites (name, domain, user_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, domain
      `,
      [name, cleanDomain, userId]
    );
    const site = result.rows[0];

const generateKey = () => `pk_${crypto.randomUUID().replace(/-/g, '')}`;
    const publicKey = generateKey();

    const keyResult = await pg.query(
      `
        INSERT INTO site_keys (site_id, public_key)
        VALUES ($1, $2)
        RETURNING public_key
      `,
      [site.id, publicKey]
    );

    return {
      siteId: site.id,
      name: site.name,
      domain: site.domain,
      siteKey: keyResult.rows[0].public_key
    };
  }

  async listSites(userId: string) {
    const result = await pg.query(`
      SELECT s.id, s.name, s.domain, s.active, s.created_at, k.public_key as "siteKey"
      FROM sites s
      LEFT JOIN site_keys k ON s.id = k.site_id AND k.active = true
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
    `, [userId]);

    return result.rows;
  }

  async deleteSite(id: string, userId: string) {
    const check = await pg.query(`SELECT id FROM sites WHERE id = $1 AND user_id = $2`, [id, userId]);
    if (check.rows.length === 0) {
      throw new Error('Site não encontrado ou sem permissão');
    }

    await pg.query(`DELETE FROM sites WHERE id = $1`, [id]);
  }
}