import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { voiceTemplates, authenticationLogs, deviceRegistry } from '@/db/schema';
import { eq, or, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, voiceEmbedding, deviceId, audioMetadata } = body;

    // Validation: Either userId or email must be provided
    if (!userId && !email) {
      return NextResponse.json({
        error: 'Either userId or email must be provided',
        code: 'MISSING_USER_IDENTIFIER'
      }, { status: 400 });
    }

    // Validation: voiceEmbedding must be array of 512 numbers
    if (!voiceEmbedding || !Array.isArray(voiceEmbedding)) {
      return NextResponse.json({
        error: 'voiceEmbedding must be an array',
        code: 'INVALID_VOICE_EMBEDDING_FORMAT'
      }, { status: 400 });
    }

    if (voiceEmbedding.length !== 512) {
      return NextResponse.json({
        error: 'voiceEmbedding must contain exactly 512 numbers',
        code: 'INVALID_VOICE_EMBEDDING_LENGTH'
      }, { status: 400 });
    }

    if (!voiceEmbedding.every((val: any) => typeof val === 'number')) {
      return NextResponse.json({
        error: 'voiceEmbedding must contain only numbers',
        code: 'INVALID_VOICE_EMBEDDING_VALUES'
      }, { status: 400 });
    }

    // Validation: deviceId is required
    if (!deviceId || typeof deviceId !== 'string') {
      return NextResponse.json({
        error: 'deviceId is required and must be a string',
        code: 'MISSING_DEVICE_ID'
      }, { status: 400 });
    }

    // Validation: audioMetadata is required
    if (!audioMetadata || typeof audioMetadata !== 'object') {
      return NextResponse.json({
        error: 'audioMetadata is required and must be an object',
        code: 'MISSING_AUDIO_METADATA'
      }, { status: 400 });
    }

    // Validation: audioMetadata.duration is required
    if (typeof audioMetadata.duration !== 'number') {
      return NextResponse.json({
        error: 'audioMetadata.duration is required and must be a number',
        code: 'MISSING_AUDIO_DURATION'
      }, { status: 400 });
    }

    // Validation: audioMetadata.quality is required
    if (!audioMetadata.quality || typeof audioMetadata.quality !== 'string') {
      return NextResponse.json({
        error: 'audioMetadata.quality is required and must be a string',
        code: 'MISSING_AUDIO_QUALITY'
      }, { status: 400 });
    }

    const validQualities = ['excellent', 'good', 'fair', 'poor'];
    if (!validQualities.includes(audioMetadata.quality.toLowerCase())) {
      return NextResponse.json({
        error: 'audioMetadata.quality must be one of: excellent, good, fair, poor',
        code: 'INVALID_AUDIO_QUALITY'
      }, { status: 400 });
    }

    // Step 1: Find voice template by userId or email
    let voiceTemplate;
    if (userId) {
      const result = await db.select()
        .from(voiceTemplates)
        .where(eq(voiceTemplates.userId, userId))
        .limit(1);
      voiceTemplate = result[0];
    } else {
      const result = await db.select()
        .from(voiceTemplates)
        .where(eq(voiceTemplates.email, email.toLowerCase().trim()))
        .limit(1);
      voiceTemplate = result[0];
    }

    // Step 2: If not found, return 404
    if (!voiceTemplate) {
      return NextResponse.json({
        error: userId 
          ? `User with ID ${userId} not found` 
          : `User with email ${email} not found`,
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    // Step 3: Check if template is active
    if (!voiceTemplate.isActive) {
      return NextResponse.json({
        error: 'Voice template is inactive',
        code: 'TEMPLATE_INACTIVE'
      }, { status: 403 });
    }

    // Step 4: Simulate authentication scoring
    const svScore = parseFloat((Math.random() * (95 - 75) + 75).toFixed(2));
    const cmScore = parseFloat((Math.random() * (90 - 70) + 70).toFixed(2));
    const fusionScore = parseFloat((svScore * 0.6 + cmScore * 0.4).toFixed(2));

    // Step 5: Determine final decision
    let finalDecision: string;
    let failureReason: string | null = null;
    if (fusionScore >= 75) {
      finalDecision = 'accept';
    } else if (fusionScore < 60) {
      finalDecision = 'reject';
      failureReason = `Low confidence score: fusion=${fusionScore}`;
    } else {
      finalDecision = 'fallback_required';
      failureReason = `Moderate confidence score: fusion=${fusionScore}`;
    }

    // Step 6: Extract IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';

    // Step 7: Extract user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Generate spoofing indicators
    const spoofingIndicators = {
      replayDetected: cmScore < 75,
      synthesisDetected: cmScore < 80,
      livenessPassed: cmScore >= 85,
      confidenceLevel: cmScore >= 85 ? 'high' : cmScore >= 75 ? 'medium' : 'low'
    };

    const timestamp = Date.now();

    // Step 8: Create authentication log entry
    const authLog = await db.insert(authenticationLogs)
      .values({
        userId: voiceTemplate.userId,
        timestamp: timestamp,
        svScore: svScore,
        cmScore: cmScore,
        fusionScore: fusionScore,
        finalDecision: finalDecision,
        deviceId: deviceId,
        ipAddress: ipAddress,
        userAgent: userAgent,
        audioDuration: audioMetadata.duration,
        snrScore: audioMetadata.snr || null,
        audioQuality: audioMetadata.quality.toLowerCase(),
        spoofingIndicators: JSON.stringify(spoofingIndicators),
        failureReason: failureReason,
        createdAt: timestamp
      })
      .returning();

    const logId = authLog[0].id;

    // Step 9: Update device registry
    const existingDevice = await db.select()
      .from(deviceRegistry)
      .where(eq(deviceRegistry.deviceId, deviceId))
      .limit(1);

    if (existingDevice.length > 0) {
      const device = existingDevice[0];
      const isSuccess = finalDecision === 'accept';
      
      let newTrustScore = device.trustScore || 50;
      if (isSuccess) {
        newTrustScore = Math.min(100, newTrustScore + 2);
      } else {
        newTrustScore = Math.max(0, newTrustScore - 5);
      }

      await db.update(deviceRegistry)
        .set({
          lastSeen: timestamp,
          successfulAuths: isSuccess ? (device.successfulAuths || 0) + 1 : device.successfulAuths,
          failedAuths: !isSuccess ? (device.failedAuths || 0) + 1 : device.failedAuths,
          trustScore: newTrustScore,
          updatedAt: timestamp
        })
        .where(eq(deviceRegistry.deviceId, deviceId));
    } else {
      await db.insert(deviceRegistry)
        .values({
          deviceId: deviceId,
          userId: voiceTemplate.userId,
          deviceFingerprint: JSON.stringify({ deviceId }), // Basic fingerprint
          trustScore: 50,
          firstSeen: timestamp,
          lastSeen: timestamp,
          successfulAuths: finalDecision === 'accept' ? 1 : 0,
          failedAuths: finalDecision === 'accept' ? 0 : 1,
          isBlocked: false,
          createdAt: timestamp,
          updatedAt: timestamp
        });
    }

    let message: string;
    switch (finalDecision) {
      case 'accept':
        message = 'Authentication successful';
        break;
      case 'reject':
        message = 'Authentication failed';
        break;
      case 'fallback_required':
        message = 'Additional verification required';
        break;
      default:
        message = 'Unknown decision';
    }

    return NextResponse.json({
      success: finalDecision === 'accept',
      svScore: svScore,
      cmScore: cmScore,
      fusionScore: fusionScore,
      decision: finalDecision,
      userName: voiceTemplate.name,
      message: message,
      logId: logId
    }, { status: 200 });

  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error.message
    }, { status: 500 });
  }
}