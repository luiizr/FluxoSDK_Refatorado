import { Request, Response } from 'express';
import { pg } from '../main';
import * as fs from 'fs';
import * as path from 'path';

export class SessionController {
  list = async (req: Request, res: Response) => {
    try {
      const { siteId } = req.query;
      const user = (req as any).user;

      // Se houver siteId, filtrar. Se não, trazer todos os sites do usuário.
      let query = `
        SELECT bs.*, sm.event_count, sm.click_count, sm.duration_seconds
        FROM browser_sessions bs
        JOIN site_keys sk ON bs.site_key = sk.public_key
        JOIN sites s ON s.id = sk.site_id
        LEFT JOIN session_metrics sm ON bs.session_id = sm.session_id
        WHERE s.user_id = $1
      `;
      const params = [user.id];

      if (siteId) {
        query += ` AND s.id = $2`;
        params.push(siteId as string);
      }

      query += ` ORDER BY bs.last_seen_at DESC`;

      const result = await pg.query(query, params);
      return res.status(200).json({ ok: true, data: result.rows });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, message: 'Erro ao listar sessões' });
    }
  };

  getEvents = async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const user = (req as any).user;

      // Validar se o usuário tem acesso a esta sessão
      const accessCheck = await pg.query(
        `SELECT bs.site_key 
         FROM browser_sessions bs
         JOIN site_keys sk ON bs.site_key = sk.public_key
         JOIN sites s ON s.id = sk.site_id
         WHERE bs.session_id = $1 AND s.user_id = $2`,
        [sessionId, user.id]
      );

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ ok: false, message: 'Acesso negado' });
      }

      const siteKey = accessCheck.rows[0].site_key;
      const recordingsDir = path.join(process.cwd(), 'recordings');
      const filePath = path.join(recordingsDir, `${siteKey}_${sessionId}.json`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ ok: false, message: 'Gravação não encontrada' });
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const events = JSON.parse(content);

      return res.status(200).json({ ok: true, data: events });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, message: 'Erro ao buscar eventos' });
    }
  };
}
