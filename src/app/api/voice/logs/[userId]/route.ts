import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { authenticationLogs } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    if (!userId || userId.trim() === '') {
      return NextResponse.json(
        {
          error: 'Valid userId is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const decisionFilter = searchParams.get('decision');

    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50;
    const offset = offsetParam ? parseInt(offsetParam) : 0;

    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        {
          error: 'Limit must be a positive number',
          code: 'INVALID_LIMIT'
        },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        {
          error: 'Offset must be a non-negative number',
          code: 'INVALID_OFFSET'
        },
        { status: 400 }
      );
    }

    // Build where conditions
    const conditions = [eq(authenticationLogs.userId, userId)];
    
    if (decisionFilter) {
      conditions.push(eq(authenticationLogs.decision, decisionFilter.toUpperCase()));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const logs = await db
      .select()
      .from(authenticationLogs)
      .where(whereClause)
      .orderBy(desc(authenticationLogs.timestamp))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: db.$count(authenticationLogs.id) })
      .from(authenticationLogs)
      .where(whereClause);

    const total = totalResult[0]?.count || 0;

    return NextResponse.json(
      {
        success: true,
        logs,
        total,
        limit,
        offset
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET authentication logs error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}