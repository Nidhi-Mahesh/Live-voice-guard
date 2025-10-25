import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { authenticationLogs } from '@/db/schema';
import { eq, and, gte, lte, desc, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Parse filter parameters
    const decision = searchParams.get('decision');
    const deviceId = searchParams.get('deviceId');
    const userId = searchParams.get('userId');
    const channelType = searchParams.get('channelType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build dynamic where conditions
    const conditions: any[] = [];

    if (decision) {
      conditions.push(eq(authenticationLogs.finalDecision, decision));
    }

    if (deviceId) {
      conditions.push(eq(authenticationLogs.deviceId, deviceId));
    }

    if (userId) {
      conditions.push(eq(authenticationLogs.userId, userId));
    }

    if (channelType) {
      conditions.push(eq(authenticationLogs.audioQuality, channelType));
    }

    if (startDate) {
      const startTimestamp = parseInt(startDate);
      if (!isNaN(startTimestamp)) {
        conditions.push(gte(authenticationLogs.timestamp, startTimestamp));
      }
    }

    if (endDate) {
      const endTimestamp = parseInt(endDate);
      if (!isNaN(endTimestamp)) {
        conditions.push(lte(authenticationLogs.timestamp, endTimestamp));
      }
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count of matching logs
    const totalCountResult = await db
      .select({ count: count() })
      .from(authenticationLogs)
      .where(whereClause);

    const total = totalCountResult[0]?.count ?? 0;

    // Get paginated logs
    let query = db
      .select()
      .from(authenticationLogs)
      .orderBy(desc(authenticationLogs.timestamp))
      .limit(limit)
      .offset(offset);

    if (whereClause) {
      query = query.where(whereClause) as any;
    }

    const logs = await query;

    // Build applied filters object
    const appliedFilters: Record<string, any> = {};
    if (decision) appliedFilters.decision = decision;
    if (deviceId) appliedFilters.deviceId = deviceId;
    if (userId) appliedFilters.userId = userId;
    if (channelType) appliedFilters.channelType = channelType;
    if (startDate) appliedFilters.startDate = parseInt(startDate);
    if (endDate) appliedFilters.endDate = parseInt(endDate);

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      offset,
      filters: appliedFilters
    }, { status: 200 });

  } catch (error: any) {
    console.error('GET authentication logs error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error.message,
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}