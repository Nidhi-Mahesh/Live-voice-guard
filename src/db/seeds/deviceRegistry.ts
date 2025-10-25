import { db } from '@/db';
import { deviceRegistry } from '@/db/schema';

async function main() {
    const now = Date.now();
    
    const sampleDeviceRegistry = [
        {
            device_id: 'device_chrome_mac_001',
            user_id: 'user_test_001',
            device_fingerprint: JSON.stringify({
                browser: 'Chrome',
                version: '120.0',
                os: 'macOS',
                osVersion: '14.2.1',
                screenResolution: '2560x1600',
                timezone: 'America/Los_Angeles',
                language: 'en-US',
                hardwareConcurrency: 8,
                colorDepth: 24
            }),
            trust_score: 98.5,
            first_seen: now - (30 * 24 * 60 * 60 * 1000),
            last_seen: now - (1 * 24 * 60 * 60 * 1000),
            successful_auths: 42,
            failed_auths: 1,
            is_blocked: 0,
            block_reason: null,
            device_info: JSON.stringify({
                deviceType: 'Desktop',
                manufacturer: 'Apple',
                model: 'MacBook Pro',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }),
            created_at: now - (30 * 24 * 60 * 60 * 1000),
            updated_at: now - (1 * 24 * 60 * 60 * 1000),
        },
        {
            device_id: 'device_firefox_win_002',
            user_id: 'user_test_001',
            device_fingerprint: JSON.stringify({
                browser: 'Firefox',
                version: '121.0',
                os: 'Windows',
                osVersion: '11',
                screenResolution: '1920x1080',
                timezone: 'America/New_York',
                language: 'en-US',
                hardwareConcurrency: 16,
                colorDepth: 24
            }),
            trust_score: 95.2,
            first_seen: now - (20 * 24 * 60 * 60 * 1000),
            last_seen: now - (2 * 60 * 60 * 1000),
            successful_auths: 28,
            failed_auths: 2,
            is_blocked: 0,
            block_reason: null,
            device_info: JSON.stringify({
                deviceType: 'Desktop',
                manufacturer: 'Dell',
                model: 'XPS 15',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
            }),
            created_at: now - (20 * 24 * 60 * 60 * 1000),
            updated_at: now - (2 * 60 * 60 * 1000),
        },
        {
            device_id: 'device_safari_ios_003',
            user_id: 'user_test_002',
            device_fingerprint: JSON.stringify({
                browser: 'Safari',
                version: '17.2',
                os: 'iOS',
                osVersion: '17.2.1',
                screenResolution: '1170x2532',
                timezone: 'America/Chicago',
                language: 'en-US',
                hardwareConcurrency: 6,
                colorDepth: 32
            }),
            trust_score: 92.8,
            first_seen: now - (15 * 24 * 60 * 60 * 1000),
            last_seen: now - (30 * 60 * 1000),
            successful_auths: 15,
            failed_auths: 0,
            is_blocked: 0,
            block_reason: null,
            device_info: JSON.stringify({
                deviceType: 'Mobile',
                manufacturer: 'Apple',
                model: 'iPhone 15 Pro',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
            }),
            created_at: now - (15 * 24 * 60 * 60 * 1000),
            updated_at: now - (30 * 60 * 1000),
        },
        {
            device_id: 'device_edge_win_004',
            user_id: 'user_test_002',
            device_fingerprint: JSON.stringify({
                browser: 'Edge',
                version: '120.0',
                os: 'Windows',
                osVersion: '11',
                screenResolution: '2560x1440',
                timezone: 'America/Denver',
                language: 'en-US',
                hardwareConcurrency: 12,
                colorDepth: 24
            }),
            trust_score: 88.4,
            first_seen: now - (10 * 24 * 60 * 60 * 1000),
            last_seen: now - (5 * 24 * 60 * 60 * 1000),
            successful_auths: 8,
            failed_auths: 3,
            is_blocked: 0,
            block_reason: null,
            device_info: JSON.stringify({
                deviceType: 'Desktop',
                manufacturer: 'HP',
                model: 'Pavilion',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
            }),
            created_at: now - (10 * 24 * 60 * 60 * 1000),
            updated_at: now - (5 * 24 * 60 * 60 * 1000),
        },
        {
            device_id: 'device_chrome_android_005',
            user_id: 'user_test_003',
            device_fingerprint: JSON.stringify({
                browser: 'Chrome',
                version: '120.0',
                os: 'Android',
                osVersion: '14',
                screenResolution: '1080x2400',
                timezone: 'America/Los_Angeles',
                language: 'en-US',
                hardwareConcurrency: 8,
                colorDepth: 24
            }),
            trust_score: 52.1,
            first_seen: now - (3 * 24 * 60 * 60 * 1000),
            last_seen: now - (12 * 60 * 60 * 1000),
            successful_auths: 2,
            failed_auths: 5,
            is_blocked: 1,
            block_reason: 'Multiple failed authentication attempts',
            device_info: JSON.stringify({
                deviceType: 'Mobile',
                manufacturer: 'Samsung',
                model: 'Galaxy S23',
                userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S911U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            }),
            created_at: now - (3 * 24 * 60 * 60 * 1000),
            updated_at: now - (12 * 60 * 60 * 1000),
        }
    ];

    await db.insert(deviceRegistry).values(sampleDeviceRegistry);
    
    console.log('✅ Device registry seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});