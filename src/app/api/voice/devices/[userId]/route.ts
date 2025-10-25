import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deviceRegistry } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Validate userId is provided
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'User ID is required',
          code: 'MISSING_USER_ID' 
        },
        { status: 400 }
      );
    }

    // Extract and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const isTrustedParam = searchParams.get('isTrusted');

    // Parse and validate limit (default 20, max 100)
    const limit = limitParam 
      ? Math.min(Math.max(parseInt(limitParam), 1), 100) 
      : 20;

    // Parse and validate offset (default 0)
    const offset = offsetParam 
      ? Math.max(parseInt(offsetParam), 0) 
      : 0;

    // Parse isTrusted filter if provided
    let isTrustedFilter: boolean | null = null;
    if (isTrustedParam !== null) {
      isTrustedFilter = isTrustedParam === 'true' || isTrustedParam === '1';
    }

    // Build where conditions
    const whereConditions = [eq(deviceRegistry.userId, userId)];
    
    if (isTrustedFilter !== null) {
      // isTrusted is derived from isBlocked being false and trustScore >= 70
      // We'll filter in application code since it's a computed field
    }

    // Query devices with userId filter
    let devicesQuery = db
      .select()
      .from(deviceRegistry)
      .where(and(...whereConditions))
      .orderBy(desc(deviceRegistry.lastSeen));

    // Execute query
    const allDevices = await devicesQuery;

    // Apply isTrusted filter in application code if needed
    let filteredDevices = allDevices;
    if (isTrustedFilter !== null) {
      filteredDevices = allDevices.filter(device => {
        const isTrusted = !device.isBlocked && device.trustScore >= 70;
        return isTrusted === isTrustedFilter;
      });
    }

    // Get total count after filtering
    const total = filteredDevices.length;

    // Apply pagination
    const paginatedDevices = filteredDevices.slice(offset, offset + limit);

    // Parse JSON fields for each device
    const devicesWithParsedData = paginatedDevices.map(device => {
      let deviceFingerprint = null;
      let deviceInfo = null;

      try {
        if (device.deviceFingerprint) {
          deviceFingerprint = JSON.parse(device.deviceFingerprint);
        }
      } catch (e) {
        console.error('Error parsing deviceFingerprint:', e);
      }

      try {
        if (device.deviceInfo) {
          deviceInfo = JSON.parse(device.deviceInfo);
        }
      } catch (e) {
        console.error('Error parsing deviceInfo:', e);
      }

      // Compute isTrusted status
      const isTrusted = !device.isBlocked && device.trustScore >= 70;

      return {
        ...device,
        deviceFingerprint,
        deviceInfo,
        isTrusted,
      };
    });

    return NextResponse.json(
      {
        success: true,
        devices: devicesWithParsedData,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('GET devices error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}