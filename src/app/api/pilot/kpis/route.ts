import { NextResponse } from 'next/server';
import sql from '@/db';
import { getSession } from '@/lib/auth';
import { apiError } from '@/lib/apiError';

/**
 * GET /api/pilot/kpis — Enhanced pilot engagement tracking
 * Uses SQLite-compatible SQL syntax.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiError.unauthorized();
    if (session.role !== 'admin') return apiError.forbidden();

    // Total organizations
    const orgsResult = await sql`SELECT COUNT(*) as count FROM organizations` as { count: number }[];
    const totalOrgs = Number(orgsResult[0]?.count) || 0;

    // Active this week (orgs with metrics in last 7 days)
    const activeResult = await sql`
      SELECT COUNT(DISTINCT org_id) as count
      FROM metrics_daily
      WHERE date >= date('now', '-7 days')
    ` as { count: number }[];
    const activeThisWeek = Number(activeResult[0]?.count) || 0;

    // Daily Active Executive Ratio (DAU / total orgs, avg over 7 days)
    const daerResult = await sql`
      SELECT COALESCE(AVG(daily_active) * 100.0 / MAX(1, ${totalOrgs}), 0) as daer
      FROM (
        SELECT date, COUNT(DISTINCT org_id) as daily_active
        FROM metrics_daily
        WHERE date >= date('now', '-7 days')
        GROUP BY date
      )
    ` as { daer: number }[];
    const daer = Math.round((Number(daerResult[0]?.daer) || 0) * 10) / 10;

    // Total metric entries
    const entriesResult = await sql`SELECT COUNT(*) as count FROM metrics_daily` as { count: number }[];
    const totalMetricsEntries = Number(entriesResult[0]?.count) || 0;

    // Average stability score (latest per org)
    const avgResult = await sql`
      SELECT COALESCE(ROUND(AVG(total_score)), 0) as avg
      FROM (
        SELECT org_id, total_score
        FROM stability_scores s1
        WHERE date = (SELECT MAX(date) FROM stability_scores s2 WHERE s2.org_id = s1.org_id)
      )
    ` as { avg: number }[];
    const avgScore = Number(avgResult[0]?.avg) || 0;

    // 7-day retention
    const retainedResult = await sql`
      SELECT COUNT(DISTINCT org_id) as count FROM metrics_daily
      WHERE date >= date('now', '-7 days')
      AND org_id IN (SELECT DISTINCT org_id FROM metrics_daily WHERE date >= date('now', '-14 days') AND date < date('now', '-7 days'))
    ` as { count: number }[];
    const retained = Number(retainedResult[0]?.count) || 0;

    const lastWeekResult = await sql`
      SELECT COUNT(DISTINCT org_id) as count FROM metrics_daily
      WHERE date >= date('now', '-14 days') AND date < date('now', '-7 days')
    ` as { count: number }[];
    const totalLastWeek = Number(lastWeekResult[0]?.count) || 0;
    const retentionRate = totalLastWeek > 0 ? Math.round((retained / totalLastWeek) * 100) : 0;

    // Score distribution
    const distResult = await sql`
      SELECT
        CASE
          WHEN total_score >= 70 THEN 'Strong'
          WHEN total_score >= 40 THEN 'Moderate'
          ELSE 'AtRisk'
        END as band,
        COUNT(*) as count
      FROM (
        SELECT org_id, total_score
        FROM stability_scores s1
        WHERE date = (SELECT MAX(date) FROM stability_scores s2 WHERE s2.org_id = s1.org_id)
      )
      GROUP BY band
    ` as { band: string; count: number }[];

    const scoreDistribution = [
      { label: 'strong', count: 0, color: 'var(--success)' },
      { label: 'moderate', count: 0, color: 'var(--warning)' },
      { label: 'at_risk', count: 0, color: 'var(--danger)' },
    ];
    for (const row of distResult) {
      if (row.band === 'Strong') scoreDistribution[0].count = Number(row.count);
      else if (row.band === 'Moderate') scoreDistribution[1].count = Number(row.count);
      else scoreDistribution[2].count = Number(row.count);
    }

    // Trajectory distribution
    const trajResult = await sql`
      SELECT trajectory_direction, COUNT(*) as count
      FROM (
        SELECT org_id, trajectory_direction
        FROM stability_scores s1
        WHERE date = (SELECT MAX(date) FROM stability_scores s2 WHERE s2.org_id = s1.org_id)
      )
      GROUP BY trajectory_direction
    ` as { trajectory_direction: string; count: number }[];

    const trajectoryDistribution = {
      strengthening: 0,
      stable: 0,
      weakening: 0,
    };
    for (const row of trajResult) {
      if (row.trajectory_direction in trajectoryDistribution) {
        trajectoryDistribution[row.trajectory_direction as keyof typeof trajectoryDistribution] = Number(row.count);
      }
    }

    // Recent actions (last 15)
    const actionsResult = await sql`
      SELECT action_type, note, created_at
      FROM action_logs
      ORDER BY created_at DESC
      LIMIT 15
    ` as { action_type: string; note: string; created_at: string }[];
    const recentActions = actionsResult.map(a => ({
      type: a.action_type,
      note: a.note || '',
      date: a.created_at ? new Date(a.created_at).toLocaleDateString() : '',
    }));

    return NextResponse.json({
      totalOrgs,
      activeThisWeek,
      daer,
      retentionRate,
      totalMetricsEntries,
      avgScore,
      scoreDistribution,
      trajectoryDistribution,
      recentActions,
    });
  } catch (error) {
    return apiError.internal(error, 'Pilot KPI error');
  }
}
