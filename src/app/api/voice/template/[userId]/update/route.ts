import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { voiceTemplates } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { voiceEmbedding, challengePhrase, deviceId, sampleCount } = body;

    // Validate required fields
    if (!voiceEmbedding) {
      return NextResponse.json(
        {
          error: 'Voice embedding is required',
          code: 'MISSING_VOICE_EMBEDDING'
        },
        { status: 400 }
      );
    }

    if (!challengePhrase) {
      return NextResponse.json(
        {
          error: 'Challenge phrase is required',
          code: 'MISSING_CHALLENGE_PHRASE'
        },
        { status: 400 }
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        {
          error: 'Device ID is required',
          code: 'MISSING_DEVICE_ID'
        },
        { status: 400 }
      );
    }

    // Validate voiceEmbedding format
    if (!Array.isArray(voiceEmbedding)) {
      return NextResponse.json(
        {
          error: 'Voice embedding must be an array',
          code: 'INVALID_VOICE_EMBEDDING_FORMAT'
        },
        { status: 400 }
      );
    }

    if (voiceEmbedding.length !== 512) {
      return NextResponse.json(
        {
          error: 'Voice embedding must contain exactly 512 numbers',
          code: 'INVALID_VOICE_EMBEDDING_LENGTH'
        },
        { status: 400 }
      );
    }

    // Validate all elements are numbers
    const allNumbers = voiceEmbedding.every(
      (item) => typeof item === 'number' && !isNaN(item)
    );

    if (!allNumbers) {
      return NextResponse.json(
        {
          error: 'Voice embedding must contain only valid numbers',
          code: 'INVALID_VOICE_EMBEDDING_VALUES'
        },
        { status: 400 }
      );
    }

    // Check if voice template exists for the user
    const existingTemplate = await db
      .select()
      .from(voiceTemplates)
      .where(eq(voiceTemplates.userId, userId))
      .limit(1);

    if (existingTemplate.length === 0) {
      return NextResponse.json(
        {
          error: 'Voice template not found for this user',
          code: 'TEMPLATE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Prepare update data
    const currentTimestamp = Date.now();
    const updateData: any = {
      voiceEmbedding: JSON.stringify(voiceEmbedding),
      challengePhrase: challengePhrase.trim(),
      deviceId: deviceId.trim(),
      enrollmentDate: currentTimestamp,
      updatedAt: currentTimestamp
    };

    // Add sampleCount if provided
    if (sampleCount !== undefined && sampleCount !== null) {
      if (typeof sampleCount !== 'number' || sampleCount < 0) {
        return NextResponse.json(
          {
            error: 'Sample count must be a non-negative number',
            code: 'INVALID_SAMPLE_COUNT'
          },
          { status: 400 }
        );
      }
      updateData.sampleCount = sampleCount;
    }

    // Update voice template
    const updated = await db
      .update(voiceTemplates)
      .set(updateData)
      .where(eq(voiceTemplates.userId, userId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to update voice template',
          code: 'UPDATE_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Voice template updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT voice template error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}