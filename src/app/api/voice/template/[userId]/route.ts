import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { voiceTemplates } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    // Validate userId parameter
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'userId parameter is required',
          code: 'MISSING_USER_ID' 
        },
        { status: 400 }
      );
    }

    // Query for voice template
    const template = await db
      .select()
      .from(voiceTemplates)
      .where(eq(voiceTemplates.userId, userId))
      .limit(1);

    // Check if template exists
    if (template.length === 0) {
      return NextResponse.json(
        { 
          error: 'User template not found',
          code: 'TEMPLATE_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        template: template[0]
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('GET voice template error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}

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
    const { 
      name, 
      email, 
      voiceEmbedding, 
      enrollmentAudioDuration,
      enrollmentAudioQuality,
      sampleCount,
      deviceId, 
      challengePhrases 
    } = body;

    // Check if template exists
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

    // Validate optional fields if provided
    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          {
            error: 'Invalid email format',
            code: 'INVALID_EMAIL'
          },
          { status: 400 }
        );
      }

      // Check email uniqueness
      const emailExists = await db
        .select()
        .from(voiceTemplates)
        .where(eq(voiceTemplates.email, email.trim().toLowerCase()))
        .limit(1);

      if (emailExists.length > 0 && emailExists[0].userId !== userId) {
        return NextResponse.json(
          {
            error: 'Email already exists',
            code: 'EMAIL_EXISTS'
          },
          { status: 409 }
        );
      }
    }

    if (voiceEmbedding !== undefined) {
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

      if (!voiceEmbedding.every(num => typeof num === 'number' && !isNaN(num))) {
        return NextResponse.json(
          {
            error: 'Voice embedding must contain only valid numbers',
            code: 'INVALID_VOICE_EMBEDDING_VALUES'
          },
          { status: 400 }
        );
      }
    }

    if (challengePhrases !== undefined) {
      if (!Array.isArray(challengePhrases) || challengePhrases.length === 0) {
        return NextResponse.json(
          {
            error: 'Challenge phrases must be a non-empty array',
            code: 'INVALID_CHALLENGE_PHRASES'
          },
          { status: 400 }
        );
      }

      if (!challengePhrases.every(phrase => typeof phrase === 'string' && phrase.trim().length > 0)) {
        return NextResponse.json(
          {
            error: 'Challenge phrases must contain only non-empty strings',
            code: 'INVALID_CHALLENGE_PHRASES_VALUES'
          },
          { status: 400 }
        );
      }
    }

    if (enrollmentAudioDuration !== undefined && (typeof enrollmentAudioDuration !== 'number' || enrollmentAudioDuration <= 0)) {
      return NextResponse.json(
        {
          error: 'enrollmentAudioDuration must be a positive number',
          code: 'INVALID_AUDIO_DURATION'
        },
        { status: 400 }
      );
    }

    if (enrollmentAudioQuality !== undefined && (typeof enrollmentAudioQuality !== 'number' || enrollmentAudioQuality < 0 || enrollmentAudioQuality > 100)) {
      return NextResponse.json(
        {
          error: 'enrollmentAudioQuality must be a number between 0 and 100',
          code: 'INVALID_AUDIO_QUALITY'
        },
        { status: 400 }
      );
    }

    if (sampleCount !== undefined && (typeof sampleCount !== 'number' || sampleCount < 0)) {
      return NextResponse.json(
        {
          error: 'sampleCount must be a non-negative number',
          code: 'INVALID_SAMPLE_COUNT'
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const updateData: any = {
      updatedAt: currentTimestamp
    };

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (voiceEmbedding !== undefined) updateData.voiceEmbedding = JSON.stringify(voiceEmbedding);
    if (enrollmentAudioDuration !== undefined) updateData.enrollmentAudioDuration = enrollmentAudioDuration;
    if (enrollmentAudioQuality !== undefined) updateData.enrollmentAudioQuality = enrollmentAudioQuality;
    if (sampleCount !== undefined) updateData.sampleCount = sampleCount;
    if (deviceId !== undefined) updateData.deviceId = deviceId.trim();
    if (challengePhrases !== undefined) updateData.challengePhrases = JSON.stringify(challengePhrases);

    // Update voice template
    const updated = await db
      .update(voiceTemplates)
      .set(updateData)
      .where(eq(voiceTemplates.userId, userId))
      .returning();

    return NextResponse.json(
      {
        success: true,
        template: updated[0],
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

export async function DELETE(
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

    // Check if template exists
    const existingTemplate = await db
      .select()
      .from(voiceTemplates)
      .where(eq(voiceTemplates.userId, userId))
      .limit(1);

    if (existingTemplate.length === 0) {
      return NextResponse.json(
        {
          error: 'Voice template not found',
          code: 'TEMPLATE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Delete the voice template
    await db
      .delete(voiceTemplates)
      .where(eq(voiceTemplates.userId, userId));

    return NextResponse.json(
      {
        success: true,
        message: 'Voice template deleted successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE voice template error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}