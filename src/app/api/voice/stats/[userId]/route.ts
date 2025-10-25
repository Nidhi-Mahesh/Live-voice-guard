import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { voiceTemplates, authenticationLogs, deviceRegistry } from '@/db/schema';
import { eq, sql, count } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    if (!userId) {
      return NextResponse.json(
        { 
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    // Verify user exists and get enrollment info
    const userTemplate = await db
      .select({
        id: voiceTemplates.id,
        userId: voiceTemplates.userId,
        enrollmentDate: voiceTemplates.enrollmentDate,
        sampleCount: voiceTemplates.sampleCount
      })
      .from(voiceTemplates)
      .where(eq(voiceTemplates.userId, userId))
      .limit(1);

    if (userTemplate.length === 0) {
      return NextResponse.json(
        { 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const enrollmentDate = userTemplate[0].enrollmentDate;

    // Calculate authentication statistics
    const authStats = await db
      .select({
        totalAttempts: count(),
        successfulAttempts: sql<number>`SUM(CASE WHEN ${authenticationLogs.decision} = 'ACCEPT' THEN 1 ELSE 0 END)`.as('successfulAttempts'),
        rejectedAttempts: sql<number>`SUM(CASE WHEN ${authenticationLogs.decision} = 'REJECT' THEN 1 ELSE 0 END)`.as('rejectedAttempts'),
        fallbackAttempts: sql<number>`SUM(CASE WHEN ${authenticationLogs.decision} = 'FALLBACK' THEN 1 ELSE 0 END)`.as('fallbackAttempts'),
        avgSvScore: sql<number>`AVG(CASE WHEN ${authenticationLogs.decision} = 'ACCEPT' THEN ${authenticationLogs.svScore} END)`.as('avgSvScore'),
        avgCmScore: sql<number>`AVG(CASE WHEN ${authenticationLogs.decision} = 'ACCEPT' THEN ${authenticationLogs.cmScore} END)`.as('avgCmScore'),
        avgFusionScore: sql<number>`AVG(CASE WHEN ${authenticationLogs.decision} = 'ACCEPT' THEN ${authenticationLogs.fusionScore} END)`.as('avgFusionScore'),
        lastAuthDate: sql<number>`MAX(${authenticationLogs.timestamp})`.as('lastAuthDate')
      })
      .from(authenticationLogs)
      .where(eq(authenticationLogs.userId, userId));

    // Get unique device count
    const deviceCount = await db
      .select({
        count: count()
      })
      .from(deviceRegistry)
      .where(eq(deviceRegistry.userId, userId));

    const stats = authStats[0];
    const totalAttempts = stats.totalAttempts || 0;
    const successfulAttempts = stats.successfulAttempts || 0;
    const rejectedAttempts = stats.rejectedAttempts || 0;
    const fallbackAttempts = stats.fallbackAttempts || 0;
    const lastAuthDate = stats.lastAuthDate || null;
    const registeredDevices = deviceCount[0]?.count || 0;

    // Calculate success rate
    const successRate = totalAttempts > 0 
      ? parseFloat(((successfulAttempts / totalAttempts) * 100).toFixed(2))
      : 0;

    // Calculate average scores (only for successful attempts)
    const averageScores = {
      svScore: stats.avgSvScore ? parseFloat(stats.avgSvScore.toFixed(2)) : 0,
      cmScore: stats.avgCmScore ? parseFloat(stats.avgCmScore.toFixed(2)) : 0,
      fusionScore: stats.avgFusionScore ? parseFloat(stats.avgFusionScore.toFixed(2)) : 0
    };

    return NextResponse.json(
      {
        success: true,
        stats: {
          userId,
          enrollmentDate: enrollmentDate,
          totalAttempts,
          successfulAttempts,
          rejectedAttempts,
          fallbackAttempts,
          successRate,
          averageScores,
          lastAuthenticationDate: lastAuthDate,
          registeredDevices
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET user stats error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}