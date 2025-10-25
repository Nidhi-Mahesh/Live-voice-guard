import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deviceRegistry } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const deviceId = params.deviceId;

    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
      return NextResponse.json(
        {
          error: 'Valid deviceId is required',
          code: 'MISSING_DEVICE_ID'
        },
        { status: 400 }
      );
    }

    const device = await db
      .select()
      .from(deviceRegistry)
      .where(eq(deviceRegistry.deviceId, deviceId.trim()))
      .limit(1);

    if (device.length === 0) {
      return NextResponse.json(
        {
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        device: device[0]
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET error:', error);
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
  { params }: { params: { deviceId: string } }
) {
  try {
    const { deviceId } = params;

    if (!deviceId) {
      return NextResponse.json(
        {
          error: 'Device ID is required',
          code: 'MISSING_DEVICE_ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { trustScore, isTrusted, userId, deviceInfo, totalAuthentications, failedAttempts } = body;

    // Check if device exists
    const existingDevice = await db
      .select()
      .from(deviceRegistry)
      .where(eq(deviceRegistry.deviceId, deviceId))
      .limit(1);

    if (existingDevice.length === 0) {
      return NextResponse.json(
        {
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Validate optional fields
    if (trustScore !== undefined) {
      if (typeof trustScore !== 'number' || trustScore < 0 || trustScore > 100) {
        return NextResponse.json(
          {
            error: 'trustScore must be a number between 0 and 100',
            code: 'INVALID_TRUST_SCORE'
          },
          { status: 400 }
        );
      }
    }

    if (isTrusted !== undefined && typeof isTrusted !== 'boolean') {
      return NextResponse.json(
        {
          error: 'isTrusted must be a boolean',
          code: 'INVALID_IS_TRUSTED'
        },
        { status: 400 }
      );
    }

    if (totalAuthentications !== undefined && (typeof totalAuthentications !== 'number' || totalAuthentications < 0)) {
      return NextResponse.json(
        {
          error: 'totalAuthentications must be a non-negative number',
          code: 'INVALID_TOTAL_AUTHENTICATIONS'
        },
        { status: 400 }
      );
    }

    if (failedAttempts !== undefined && (typeof failedAttempts !== 'number' || failedAttempts < 0)) {
      return NextResponse.json(
        {
          error: 'failedAttempts must be a non-negative number',
          code: 'INVALID_FAILED_ATTEMPTS'
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const updateData: any = {
      updatedAt: currentTimestamp
    };

    if (trustScore !== undefined) updateData.trustScore = trustScore;
    if (isTrusted !== undefined) updateData.isTrusted = isTrusted;
    if (userId !== undefined) updateData.userId = userId;
    if (deviceInfo !== undefined) updateData.deviceInfo = JSON.stringify(deviceInfo);
    if (totalAuthentications !== undefined) updateData.totalAuthentications = totalAuthentications;
    if (failedAttempts !== undefined) updateData.failedAttempts = failedAttempts;

    // Update device
    const updated = await db
      .update(deviceRegistry)
      .set(updateData)
      .where(eq(deviceRegistry.deviceId, deviceId))
      .returning();

    return NextResponse.json(
      {
        success: true,
        device: updated[0],
        message: 'Device updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT error:', error);
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
  { params }: { params: { deviceId: string } }
) {
  try {
    const { deviceId } = params;

    if (!deviceId) {
      return NextResponse.json(
        {
          error: 'Device ID is required',
          code: 'MISSING_DEVICE_ID'
        },
        { status: 400 }
      );
    }

    // Check if device exists
    const existingDevice = await db
      .select()
      .from(deviceRegistry)
      .where(eq(deviceRegistry.deviceId, deviceId))
      .limit(1);

    if (existingDevice.length === 0) {
      return NextResponse.json(
        {
          error: 'Device not found',
          code: 'DEVICE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Delete the device
    await db
      .delete(deviceRegistry)
      .where(eq(deviceRegistry.deviceId, deviceId));

    return NextResponse.json(
      {
        success: true,
        message: 'Device deleted successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}