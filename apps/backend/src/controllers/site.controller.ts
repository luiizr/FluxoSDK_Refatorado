import { Request, Response } from 'express';
import { pg } from '../main';
import { v4 as uuidv4 } from 'uuid';

export class SiteController {
  create = async (req: Request, res: Response) => {
    try {
      const { name, domain } = req.body;
      const user = (req as any).user;

      if (!name || !domain) {
        return res.status(400).json({ ok: false, message: 'Nome e domínio são obrigatórios' });
      }

      // 1. Criar o site
      const siteResult = await pg.query(
        'INSERT INTO sites (user_id, name, domain) VALUES ($1, $2, $3) RETURNING *',
        [user.id, name, domain]
      );
      const site = siteResult.rows[0];

      // 2. Gerar a chave pública
      const publicKey = `pk_${uuidv4().replace(/-/g, '')}`;
      await pg.query(
        'INSERT INTO site_keys (site_id, public_key) VALUES ($1, $2)',
        [site.id, publicKey]
      );

      return res.status(201).json({ ok: true, data: { ...site, publicKey } });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, message: 'Erro ao criar site' });
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const result = await pg.query(
        `SELECT s.*, sk.public_key 
         FROM sites s 
         LEFT JOIN site_keys sk ON s.id = sk.site_id 
         WHERE s.user_id = $1`,
        [user.id]
      );

      return res.status(200).json({ ok: true, data: result.rows });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Erro ao listar sites' });
    }
  };

  getSnippet = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const result = await pg.query(
        `SELECT sk.public_key 
         FROM site_keys sk 
         JOIN sites s ON s.id = sk.site_id 
         WHERE s.id = $1 AND s.user_id = $2`,
        [id, user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, message: 'Site não encontrado' });
      }

      const publicKey = result.rows[0].public_key;
      const backendUrl = process.env.PUBLIC_BACKEND_URL || 'http://localhost:3333';
      
      const snippet = `<script 
  src="${backendUrl}/assets/embed.js" 
  data-key="${publicKey}" 
  data-backend="${backendUrl}" 
  async>
</script>`;

      return res.status(200).json({ ok: true, data: { snippet, publicKey } });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Erro ao buscar snippet' });
    }
  };
}
