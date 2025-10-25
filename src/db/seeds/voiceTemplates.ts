import { db } from '@/db';
import { voiceTemplates } from '@/db/schema';

async function main() {
    // Generate realistic voice embedding (512-dimensional vector)
    const generateVoiceEmbedding = (): string => {
        const embedding = Array.from({ length: 512 }, () => 
            (Math.random() * 2 - 1).toFixed(6)
        );
        return JSON.stringify(embedding);
    };

    const now = Date.now();

    const sampleVoiceTemplates = [
        {
            userId: 'user_test_001',
            email: 'john.smith@example.com',
            name: 'John Smith',
            voiceEmbedding: generateVoiceEmbedding(),
            enrollmentDate: now - 86400000 * 30, // 30 days ago
            challengePhrase: 'My voice is my password',
            enrollmentAudioUrl: null,
            sampleCount: 3,
            deviceId: 'device_chrome_mac_001',
            isActive: 1,
            createdAt: now - 86400000 * 30,
            updatedAt: now - 86400000 * 30,
        },
        {
            userId: 'user_test_002',
            email: 'sarah.j@company.com',
            name: 'Sarah Johnson',
            voiceEmbedding: generateVoiceEmbedding(),
            enrollmentDate: now - 86400000 * 15, // 15 days ago
            challengePhrase: 'My voice is my password',
            enrollmentAudioUrl: null,
            sampleCount: 5,
            deviceId: 'device_firefox_win_002',
            isActive: 1,
            createdAt: now - 86400000 * 15,
            updatedAt: now - 86400000 * 15,
        },
        {
            userId: 'user_test_003',
            email: 'mchen@tech.io',
            name: 'Michael Chen',
            voiceEmbedding: generateVoiceEmbedding(),
            enrollmentDate: now - 86400000 * 7, // 7 days ago
            challengePhrase: 'My voice is my password',
            enrollmentAudioUrl: null,
            sampleCount: 4,
            deviceId: 'device_safari_ios_003',
            isActive: 1,
            createdAt: now - 86400000 * 7,
            updatedAt: now - 86400000 * 7,
        },
    ];

    await db.insert(voiceTemplates).values(sampleVoiceTemplates);
    
    console.log('✅ Voice templates seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});