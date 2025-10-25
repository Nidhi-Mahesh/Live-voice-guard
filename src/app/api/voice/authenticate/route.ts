import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { authenticationLogs, deviceRegistry } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      svScore,
      cmScore,
      fusionScore,
      decision,
      deviceId,
      audioDuration,
      audioQualitySnr,
      channelType,
      backgroundNoiseLevel,
      challengePhrase,
      failureReason,
      userAgent
    } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required', code: 'MISSING_DEVICE_ID' },
        { status: 400 }
      );
    }

    if (svScore === undefined || svScore === null) {
      return NextResponse.json(
        { error: 'svScore is required', code: 'MISSING_SV_SCORE' },
        { status: 400 }
      );
    }

    if (cmScore === undefined || cmScore === null) {
      return NextResponse.json(
        { error: 'cmScore is required', code: 'MISSING_CM_SCORE' },
        { status: 400 }
      );
    }

    if (fusionScore === undefined || fusionScore === null) {
      return NextResponse.json(
        { error: 'fusionScore is required', code: 'MISSING_FUSION_SCORE' },
        { status: 400 }
      );
    }

    if (!decision) {
      return NextResponse.json(
        { error: 'decision is required', code: 'MISSING_DECISION' },
        { status: 400 }
      );
    }

    if (audioDuration === undefined || audioDuration === null) {
      return NextResponse.json(
        { error: 'audioDuration is required', code: 'MISSING_AUDIO_DURATION' },
        { status: 400 }
      );
    }

    if (audioQualitySnr === undefined || audioQualitySnr === null) {
      return NextResponse.json(
        { error: 'audioQualitySnr is required', code: 'MISSING_AUDIO_QUALITY_SNR' },
        { status: 400 }
      );
    }

    if (!channelType) {
      return NextResponse.json(
        { error: 'channelType is required', code: 'MISSING_CHANNEL_TYPE' },
        { status: 400 }
      );
    }

    if (backgroundNoiseLevel === undefined || backgroundNoiseLevel === null) {
      return NextResponse.json(
        { error: 'backgroundNoiseLevel is required', code: 'MISSING_BACKGROUND_NOISE_LEVEL' },
        { status: 400 }
      );
    }

    if (!challengePhrase) {
      return NextResponse.json(
        { error: 'challengePhrase is required', code: 'MISSING_CHALLENGE_PHRASE' },
        { status: 400 }
      );
    }

    // Validate score ranges (0-100)
    if (typeof svScore !== 'number' || svScore < 0 || svScore > 100) {
      return NextResponse.json(
        { error: 'svScore must be a number between 0 and 100', code: 'INVALID_SV_SCORE' },
        { status: 400 }
      );
    }

    if (typeof cmScore !== 'number' || cmScore < 0 || cmScore > 100) {
      return NextResponse.json(
        { error: 'cmScore must be a number between 0 and 100', code: 'INVALID_CM_SCORE' },
        { status: 400 }
      );
    }

    if (typeof fusionScore !== 'number' || fusionScore < 0 || fusionScore > 100) {
      return NextResponse.json(
        { error: 'fusionScore must be a number between 0 and 100', code: 'INVALID_FUSION_SCORE' },
        { status: 400 }
      );
    }

    // Validate decision enum
    const validDecisions = ['ACCEPT', 'REJECT', 'FALLBACK'];
    if (!validDecisions.includes(decision.toUpperCase())) {
      return NextResponse.json(
        { 
          error: `decision must be one of: ${validDecisions.join(', ')}`, 
          code: 'INVALID_DECISION' 
        },
        { status: 400 }
      );
    }

    // Validate channelType enum
    const validChannelTypes = ['microphone', 'phone', 'webrtc', 'voip'];
    if (!validChannelTypes.includes(channelType.toLowerCase())) {
      return NextResponse.json(
        { 
          error: `channelType must be one of: ${validChannelTypes.join(', ')}`, 
          code: 'INVALID_CHANNEL_TYPE' 
        },
        { status: 400 }
      );
    }

    // Extract IP address from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

    // Extract user agent
    const userAgentHeader = userAgent || request.headers.get('user-agent') || 'unknown';

    // Generate Unix timestamp (seconds)
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Determine audio quality based on SNR
    let audioQuality = 'poor';
    if (audioQualitySnr >= 25) {
      audioQuality = 'excellent';
    } else if (audioQualitySnr >= 15) {
      audioQuality = 'good';
    } else if (audioQualitySnr >= 10) {
      audioQuality = 'fair';
    }

    // Generate spoofing indicators based on background noise and channel
    const spoofingIndicators = {
      backgroundNoiseLevel,
      channelType,
      suspiciousPatterns: backgroundNoiseLevel > 0.8 || cmScore < 30
    };

    // Insert authentication log
    const newLog = await db.insert(authenticationLogs)
      .values({
        userId,
        timestamp: currentTimestamp,
        svScore,
        cmScore,
        fusionScore,
        finalDecision: decision.toUpperCase(),
        deviceId,
        ipAddress,
        userAgent: userAgentHeader,
        audioDuration,
        snrScore: audioQualitySnr,
        audioQuality,
        spoofingIndicators: JSON.stringify(spoofingIndicators),
        failureReason: failureReason || null,
        createdAt: currentTimestamp,
      })
      .returning();

    // Update device registry based on decision
    const normalizedDecision = decision.toUpperCase();
    
    if (normalizedDecision === 'ACCEPT') {
      // Check if device exists
      const existingDevice = await db.select()
        .from(deviceRegistry)
        .where(eq(deviceRegistry.deviceId, deviceId))
        .limit(1);

      if (existingDevice.length > 0) {
        // Update existing device
        const currentDevice = existingDevice[0];
        const newSuccessfulAuths = currentDevice.successfulAuths + 1;
        const newTrustScore = Math.min(100, currentDevice.trustScore + 2);

        await db.update(deviceRegistry)
          .set({
            successfulAuths: newSuccessfulAuths,
            trustScore: newTrustScore,
            lastSeen: currentTimestamp,
            updatedAt: currentTimestamp,
            userId,
          })
          .where(eq(deviceRegistry.deviceId, deviceId));
      } else {
        // Create new device entry
        await db.insert(deviceRegistry)
          .values({
            deviceId,
            userId,
            deviceFingerprint: JSON.stringify({ ipAddress, userAgent: userAgentHeader }),
            trustScore: 60.0,
            firstSeen: currentTimestamp,
            lastSeen: currentTimestamp,
            successfulAuths: 1,
            failedAuths: 0,
            isBlocked: false,
            deviceInfo: JSON.stringify({ channelType, initialAuth: currentTimestamp }),
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
          });
      }
    } else if (normalizedDecision === 'REJECT') {
      // Check if device exists
      const existingDevice = await db.select()
        .from(deviceRegistry)
        .where(eq(deviceRegistry.deviceId, deviceId))
        .limit(1);

      if (existingDevice.length > 0) {
        // Update existing device
        const currentDevice = existingDevice[0];
        const newFailedAuths = currentDevice.failedAuths + 1;
        const newTrustScore = Math.max(0, currentDevice.trustScore - 5);
        const shouldBlock = newFailedAuths >= 5 || newTrustScore < 20;

        await db.update(deviceRegistry)
          .set({
            failedAuths: newFailedAuths,
            trustScore: newTrustScore,
            lastSeen: currentTimestamp,
            updatedAt: currentTimestamp,
            isBlocked: shouldBlock,
            blockReason: shouldBlock ? 'Multiple failed authentication attempts' : currentDevice.blockReason,
          })
          .where(eq(deviceRegistry.deviceId, deviceId));
      } else {
        // Create new device entry with failed attempt
        await db.insert(deviceRegistry)
          .values({
            deviceId,
            userId,
            deviceFingerprint: JSON.stringify({ ipAddress, userAgent: userAgentHeader }),
            trustScore: 40.0,
            firstSeen: currentTimestamp,
            lastSeen: currentTimestamp,
            successfulAuths: 0,
            failedAuths: 1,
            isBlocked: false,
            deviceInfo: JSON.stringify({ channelType, initialFailedAuth: currentTimestamp }),
            createdAt: currentTimestamp,
            updatedAt: currentTimestamp,
          });
      }
    }

    return NextResponse.json(
      {
        success: true,
        logId: newLog[0].id,
        decision: normalizedDecision,
        message: `Authentication log created successfully with decision: ${normalizedDecision}`,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('POST authentication log error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}