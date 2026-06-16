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
      const backendUrl = process.env.API_URL || 'http://localhost:3000';
      
      const snippet = `<script 
  src="${backendUrl}/assets/embed.js" 
  data-key="${publicKey}" 
  async>
</script>`;

      return res.status(200).json({ ok: true, data: { snippet, publicKey } });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Erro ao buscar snippet' });
    }
  };

  getSettingsByPublicKey = async (req: Request, res: Response) => {
    try {
      const { publicKey } = req.params;
      const result = await pg.query(
        `SELECT s.settings 
         FROM sites s 
         JOIN site_keys sk ON s.id = sk.site_id 
         WHERE sk.public_key = $1 AND sk.active = true AND s.active = true`,
        [publicKey]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, message: 'Configurações não encontradas' });
      }

      return res.status(200).json({ ok: true, data: result.rows[0].settings });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Erro ao buscar configurações' });
    }
  };

  updateSettings = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { settings } = req.body;
      const user = (req as any).user;

      const result = await pg.query(
        'UPDATE sites SET settings = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
        [JSON.stringify(settings), id, user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, message: 'Site não encontrado' });
      }

      return res.status(200).json({ ok: true, data: result.rows[0] });
    } catch (error) {
      return res.status(500).json({ ok: false, message: 'Erro ao atualizar configurações' });
    }
  };
}
