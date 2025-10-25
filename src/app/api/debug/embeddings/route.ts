import { NextResponse } from 'next/server';
import { db } from '@/db';
import { voiceTemplates } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(voiceTemplates)
      .orderBy(desc(voiceTemplates.id))
      .limit(10);

    const mapped = rows.map((r: any) => {
      let vectorLength: number | null = null;
      let preview: string | null = null;
      try {
        const arr = JSON.parse(r.voiceEmbedding);
        if (Array.isArray(arr)) {
          vectorLength = arr.length;
          preview = JSON.stringify(arr.slice(0, 8));
        }
      } catch (_) {}

      return {
        id: r.id,
        userId: r.userId,
        email: r.email,
        createdAt: r.createdAt,
        vectorLength,
        embeddingPreview: preview,
      };
    });

    return NextResponse.json({ success: true, count: mapped.length, items: mapped });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
