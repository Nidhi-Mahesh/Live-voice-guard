import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deviceRegistry } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, deviceFingerprint, deviceInfo, userId } = body;

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

    if (!deviceFingerprint) {
      return NextResponse.json(
        { 
          error: 'deviceFingerprint is required',
          code: 'MISSING_DEVICE_FINGERPRINT'
        },
        { status: 400 }
      );
    }

    if (typeof deviceFingerprint !== 'object' || deviceFingerprint === null) {
      return NextResponse.json(
        { 
          error: 'deviceFingerprint must be an object',
          code: 'INVALID_DEVICE_FINGERPRINT'
        },
        { status: 400 }
      );
    }

    const currentTimestamp = Date.now();

    // Check if device already exists
    const existingDevice = await db
      .select()
      .from(deviceRegistry)
      .where(eq(deviceRegistry.deviceId, deviceId))
      .limit(1);

    if (existingDevice.length > 0) {
      const device = existingDevice[0];
      
      const updateData: any = {
        lastSeen: currentTimestamp,
        updatedAt: currentTimestamp
      };

      if (deviceInfo) {
        updateData.deviceInfo = JSON.stringify(deviceInfo);
      }

      if (userId && !device.userId) {
        updateData.userId = userId;
      }

      const updated = await db
        .update(deviceRegistry)
        .set(updateData)
        .where(eq(deviceRegistry.deviceId, deviceId))
        .returning();

      return NextResponse.json(
        {
          success: true,
          trustScore: updated[0].trustScore,
          isNew: false
        },
        { status: 200 }
      );
    } else {
      const newDevice = await db
        .insert(deviceRegistry)
        .values({
          deviceId,
          deviceFingerprint: JSON.stringify(deviceFingerprint),
          deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
          userId: userId || null,
          trustScore: 50.0,
          firstSeen: currentTimestamp,
          lastSeen: currentTimestamp,
          successfulAuths: 0,
          failedAuths: 0,
          isBlocked: false,
          createdAt: currentTimestamp,
          updatedAt: currentTimestamp
        })
        .returning();

      return NextResponse.json(
        {
          success: true,
          trustScore: newDevice[0].trustScore,
          isNew: true
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}