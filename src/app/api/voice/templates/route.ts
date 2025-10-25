import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { voiceTemplates } from '@/db/schema';
import { like, or, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');

    // Build base query excluding voiceEmbedding for performance
    let query = db.select({
      id: voiceTemplates.id,
      userId: voiceTemplates.userId,
      name: voiceTemplates.name,
      email: voiceTemplates.email,
      challengePhrase: voiceTemplates.challengePhrase,
      enrollmentAudioUrl: voiceTemplates.enrollmentAudioUrl,
      deviceId: voiceTemplates.deviceId,
      enrollmentDate: voiceTemplates.enrollmentDate,
      sampleCount: voiceTemplates.sampleCount,
      isActive: voiceTemplates.isActive,
      createdAt: voiceTemplates.createdAt,
      updatedAt: voiceTemplates.updatedAt,
    }).from(voiceTemplates);

    // Apply search filter if provided
    if (search) {
      const searchCondition = or(
        like(voiceTemplates.name, `%${search}%`),
        like(voiceTemplates.email, `%${search}%`),
        like(voiceTemplates.userId, `%${search}%`)
      );
      query = query.where(searchCondition);
    }

    // Get total count for pagination
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(voiceTemplates);
    
    if (search) {
      const searchCondition = or(
        like(voiceTemplates.name, `%${search}%`),
        like(voiceTemplates.email, `%${search}%`),
        like(voiceTemplates.userId, `%${search}%`)
      );
      countQuery = countQuery.where(searchCondition);
    }

    const [countResult] = await countQuery;
    const total = countResult.count;

    // Execute main query with pagination and sorting
    const templates = await query
      .orderBy(desc(voiceTemplates.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      templates,
      total,
      limit,
      offset
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}