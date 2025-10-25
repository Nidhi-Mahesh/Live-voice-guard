import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deviceRegistry } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, userId, deviceInfo } = body;

    // Validate required fields
    if (!deviceId) {
      return NextResponse.json(
        { 
          error: 'deviceId is required',
          code: 'MISSING_DEVICE_ID'
        },
        { status: 400 }
      );
    }

    if (!deviceInfo) {
      return NextResponse.json(
        { 
          error: 'deviceInfo is required',
          code: 'MISSING_DEVICE_INFO'
        },
        { status: 400 }
      );
    }

    // Validate deviceInfo is a valid object
    if (typeof deviceInfo !== 'object' || deviceInfo === null || Array.isArray(deviceInfo)) {
      return NextResponse.json(
        { 
          error: 'deviceInfo must be a valid object',
          code: 'INVALID_DEVICE_INFO'
        },
        { status: 400 }
      );
    }

    // Check if device already exists
    const existingDevice = await db
      .select()
      .from(deviceRegistry)
      .where(eq(deviceRegistry.deviceId, deviceId))
      .limit(1);

    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (existingDevice.length > 0) {
      // Device exists - update it
      const updateData: any = {
        lastSeen: currentTimestamp,
        updatedAt: currentTimestamp,
      };

      // Update userId if provided and different
      if (userId && userId !== existingDevice[0].userId) {
        updateData.userId = userId;
      }

      // Update deviceInfo if provided
      if (deviceInfo) {
        updateData.deviceInfo = JSON.stringify(deviceInfo);
      }

      const updated = await db
        .update(deviceRegistry)
        .set(updateData)
        .where(eq(deviceRegistry.deviceId, deviceId))
        .returning();

      return NextResponse.json(
        {
          success: true,
          device: {
            ...updated[0],
            deviceInfo: updated[0].deviceInfo ? JSON.parse(updated[0].deviceInfo) : null,
            deviceFingerprint: updated[0].deviceFingerprint ? JSON.parse(updated[0].deviceFingerprint) : null,
          },
          message: 'Device updated',
          isNew: false,
        },
        { status: 200 }
      );
    } else {
      // Device doesn't exist - create new one
      const deviceFingerprint = {
        browser: deviceInfo.browser || 'unknown',
        os: deviceInfo.os || 'unknown',
        device: deviceInfo.device || 'unknown',
        timestamp: currentTimestamp,
      };

      const newDevice = await db
        .insert(deviceRegistry)
        .values({
          deviceId,
          userId: userId || null,
          deviceFingerprint: JSON.stringify(deviceFingerprint),
          trustScore: 50.0,
          firstSeen: currentTimestamp,
          lastSeen: currentTimestamp,
          successfulAuths: 0,
          failedAuths: 0,
          isBlocked: false,
          deviceInfo: JSON.stringify(deviceInfo),
          createdAt: currentTimestamp,
          updatedAt: currentTimestamp,
        })
        .returning();

      return NextResponse.json(
        {
          success: true,
          device: {
            ...newDevice[0],
            deviceInfo: JSON.parse(newDevice[0].deviceInfo || '{}'),
            deviceFingerprint: JSON.parse(newDevice[0].deviceFingerprint),
          },
          message: 'Device registered',
          isNew: true,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}