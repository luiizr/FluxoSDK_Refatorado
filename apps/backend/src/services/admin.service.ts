import { pg } from '../main';

function asInt(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

export class AdminService {
  async getOverview(userId: string) {
    await this.assertRoot(userId);

    const [usersResult, sitesResult, totalsResult] = await Promise.all([
      pg.query(
        `
          SELECT id, name, email, is_root, is_active, last_login_at, created_at
          FROM users
          ORDER BY created_at DESC
          LIMIT 100
        `,
      ),
      pg.query(
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
            k.public_key as "siteKey",
            COUNT(DISTINCT bs.session_id)::int as sessions,
            COUNT(DISTINCT e.id)::int as events
          FROM sites s
          LEFT JOIN users u ON u.id = s.user_id
          LEFT JOIN site_keys k ON k.site_id = s.id AND k.active = true
          LEFT JOIN browser_sessions bs ON bs.site_key = k.public_key
          LEFT JOIN sdk_events e ON e.site_key = k.public_key
            AND e.occurred_at >= NOW() - INTERVAL '24 hours'
          GROUP BY s.id, u.id, k.public_key
          ORDER BY s.created_at DESC
          LIMIT 100
        `,
      ),
      pg.query(
        `
          SELECT
            (SELECT COUNT(*) FROM users)::int as users,
            (SELECT COUNT(*) FROM sites)::int as sites,
            (SELECT COUNT(*) FROM site_keys WHERE active = true)::int as active_keys,
            (SELECT COUNT(*) FROM sdk_events WHERE occurred_at >= NOW() - INTERVAL '24 hours')::int as events_24h,
            (SELECT COUNT(DISTINCT session_id) FROM browser_sessions WHERE last_seen_at >= NOW() - INTERVAL '5 minutes')::int as active_sessions
        `,
      ),
    ]);

    const totals = totalsResult.rows[0] ?? {};

    return {
      totals: {
        users: asInt(totals.users),
        sites: asInt(totals.sites),
        activeKeys: asInt(totals.active_keys),
        events24h: asInt(totals.events_24h),
        activeSessions: asInt(totals.active_sessions),
      },
      users: usersResult.rows,
      sites: sitesResult.rows.map((site) => ({
        ...site,
        sessions: asInt(site.sessions),
        events: asInt(site.events),
      })),
    };
  }

  private async assertRoot(userId: string) {
    if (!userId) throw new Error('Usuario nao autenticado');

    const result = await pg.query(`SELECT is_root FROM users WHERE id = $1`, [userId]);
    if (result.rowCount === 0 || !result.rows[0].is_root) {
      throw new Error('Acesso restrito ao administrador');
    }
  }
}
