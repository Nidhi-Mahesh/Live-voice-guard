import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { voiceTemplates } from '@/db/schema';
import { eq, or } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // STEP 1: PARSE REQUEST BODY SAFELY
    // ==========================================
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[JSON PARSE ERROR]:', parseError);
      return NextResponse.json({ 
        error: "Invalid JSON in request body",
        code: "INVALID_JSON" 
      }, { status: 400 });
    }

    // ==========================================
    // STEP 2: EXTRACT AND VALIDATE REQUIRED STRING FIELDS
    // ==========================================
    
    // userId - REQUIRED, non-empty string
    const userId = body.userId;
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      console.error('[VALIDATION] Missing or invalid userId:', userId);
      return NextResponse.json({ 
        error: "userId is required and must be a non-empty string",
        code: "MISSING_USER_ID" 
      }, { status: 400 });
    }

    // name - REQUIRED, non-empty string
    const name = body.name;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.error('[VALIDATION] Missing or invalid name:', name);
      return NextResponse.json({ 
        error: "name is required and must be a non-empty string",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    // email - REQUIRED, valid email format
    const email = body.email;
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      console.error('[VALIDATION] Missing or invalid email:', email);
      return NextResponse.json({ 
        error: "email is required and must be a non-empty string",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.error('[VALIDATION] Invalid email format:', email);
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    // ==========================================
    // STEP 3: VALIDATE AND CONVERT VOICE EMBEDDING ARRAY
    // ==========================================
    
    const voiceEmbedding = body.voiceEmbedding;
    
    if (!voiceEmbedding || !Array.isArray(voiceEmbedding)) {
      console.error('[VALIDATION] voiceEmbedding is not an array:', voiceEmbedding);
      return NextResponse.json({ 
        error: "voiceEmbedding is required and must be an array of numbers",
        code: "INVALID_VOICE_EMBEDDING" 
      }, { status: 400 });
    }

    if (voiceEmbedding.length !== 512) {
      console.error('[VALIDATION] voiceEmbedding wrong length:', voiceEmbedding.length);
      return NextResponse.json({ 
        error: `voiceEmbedding must contain exactly 512 numbers (received ${voiceEmbedding.length})`,
        code: "INVALID_VOICE_EMBEDDING_LENGTH" 
      }, { status: 400 });
    }

    // Validate all array elements are valid numbers
    const hasInvalidNumbers = voiceEmbedding.some(
      num => typeof num !== 'number' || isNaN(num) || !isFinite(num)
    );
    
    if (hasInvalidNumbers) {
      console.error('[VALIDATION] voiceEmbedding contains invalid numbers');
      return NextResponse.json({ 
        error: "voiceEmbedding must contain only valid finite numbers",
        code: "INVALID_VOICE_EMBEDDING_VALUES" 
      }, { status: 400 });
    }

    // Convert array to JSON string for database storage
    const voiceEmbeddingJson = JSON.stringify(voiceEmbedding);
    console.log('[SUCCESS] voiceEmbedding validated and converted to JSON (length:', voiceEmbeddingJson.length, 'chars)');

    // ==========================================
    // STEP 4: VALIDATE AND CONVERT CHALLENGE PHRASES ARRAY
    // ==========================================
    
    // Support both singular (challengePhrase) and plural (challengePhrases)
    const challengePhrase = body.challengePhrase;
    const challengePhrases = body.challengePhrases;
    
    let challengePhrasesArray: string[] = [];

    // Priority: challengePhrases (plural) > challengePhrase (singular)
    if (challengePhrases !== undefined && challengePhrases !== null) {
      if (Array.isArray(challengePhrases)) {
        // Filter out invalid entries (non-strings or empty strings)
        challengePhrasesArray = challengePhrases
          .filter(p => typeof p === 'string' && p.trim().length > 0)
          .map(p => p.trim());
      } else if (typeof challengePhrases === 'string' && challengePhrases.trim().length > 0) {
        challengePhrasesArray = [challengePhrases.trim()];
      }
    } else if (challengePhrase !== undefined && challengePhrase !== null) {
      if (typeof challengePhrase === 'string' && challengePhrase.trim().length > 0) {
        challengePhrasesArray = [challengePhrase.trim()];
      }
    }

    if (challengePhrasesArray.length === 0) {
      console.error('[VALIDATION] No valid challenge phrases provided');
      return NextResponse.json({ 
        error: "At least one challenge phrase is required (challengePhrase or challengePhrases)",
        code: "MISSING_CHALLENGE_PHRASE" 
      }, { status: 400 });
    }

    // Convert array to JSON string for database storage
    const challengePhrasesJson = JSON.stringify(challengePhrasesArray);
    console.log('[SUCCESS] Challenge phrases validated:', challengePhrasesArray.length, 'phrase(s)');

    // ==========================================
    // STEP 5: VALIDATE AND INITIALIZE AUDIO METRICS WITH FALLBACKS
    // ==========================================
    
    // enrollmentAudioDuration - REQUIRED by schema, fallback to 3.5 seconds
    let audioDuration: number = 3.5; // Default fallback
    
    const providedDuration = body.enrollmentAudioDuration;
    if (providedDuration !== undefined && providedDuration !== null) {
      if (typeof providedDuration === 'number' && providedDuration > 0 && isFinite(providedDuration)) {
        audioDuration = providedDuration;
        console.log('[SUCCESS] Using provided enrollmentAudioDuration:', audioDuration);
      } else {
        console.warn('[FALLBACK] Invalid enrollmentAudioDuration:', providedDuration, '- using default:', audioDuration);
      }
    } else {
      console.warn('[FALLBACK] Missing enrollmentAudioDuration - using default:', audioDuration);
    }

    // enrollmentAudioQuality - REQUIRED by schema, fallback to 85.0
    let audioQuality: number = 85.0; // Default fallback
    
    const providedQuality = body.enrollmentAudioQuality;
    if (providedQuality !== undefined && providedQuality !== null) {
      if (typeof providedQuality === 'number' && providedQuality >= 0 && providedQuality <= 100 && isFinite(providedQuality)) {
        audioQuality = providedQuality;
        console.log('[SUCCESS] Using provided enrollmentAudioQuality:', audioQuality);
      } else {
        console.warn('[FALLBACK] Invalid enrollmentAudioQuality:', providedQuality, '- using default:', audioQuality);
      }
    } else {
      console.warn('[FALLBACK] Missing enrollmentAudioQuality - using default:', audioQuality);
    }

    // ==========================================
    // STEP 6: VALIDATE DEVICE ID (REQUIRED)
    // ==========================================
    
    const deviceId = body.deviceId;
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
      console.error('[VALIDATION] Missing or invalid deviceId:', deviceId);
      return NextResponse.json({ 
        error: "deviceId is required and must be a non-empty string",
        code: "MISSING_DEVICE_ID" 
      }, { status: 400 });
    }

    // ==========================================
    // STEP 7: EXTRACT OPTIONAL FIELDS WITH SAFE DEFAULTS
    // ==========================================
    
    // sampleCount - optional, default to 1
    let sampleCount: number = 1;
    const providedSampleCount = body.sampleCount;
    if (providedSampleCount !== undefined && providedSampleCount !== null) {
      if (typeof providedSampleCount === 'number' && providedSampleCount > 0 && isFinite(providedSampleCount)) {
        sampleCount = Math.floor(providedSampleCount);
        console.log('[SUCCESS] Using provided sampleCount:', sampleCount);
      } else {
        console.warn('[FALLBACK] Invalid sampleCount:', providedSampleCount, '- using default:', sampleCount);
      }
    }

    // ==========================================
    // STEP 8: CHECK FOR DUPLICATE USER
    // ==========================================
    
    console.log('[DATABASE] Checking for existing user with userId:', userId.trim(), 'or email:', email.trim().toLowerCase());
    
    const existingUser = await db.select()
      .from(voiceTemplates)
      .where(
        or(
          eq(voiceTemplates.userId, userId.trim()),
          eq(voiceTemplates.email, email.trim().toLowerCase())
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      const conflictField = existingUser[0].userId === userId.trim() ? 'userId' : 'email';
      console.error('[CONFLICT] User already exists with', conflictField, ':', existingUser[0][conflictField]);
      return NextResponse.json({ 
        error: `User with this ${conflictField} already exists`,
        code: "USER_ALREADY_EXISTS",
        conflictField
      }, { status: 409 });
    }

    // ==========================================
    // STEP 9: PREPARE INSERT DATA WITH ALL FIELDS INITIALIZED
    // ==========================================
    
    const timestamp = Date.now();
    
    const insertData = {
      userId: userId.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      voiceEmbedding: voiceEmbeddingJson,           // JSON string (converted from array)
      challengePhrases: challengePhrasesJson,        // JSON string (converted from array)
      deviceId: deviceId.trim(),
      sampleCount: sampleCount,                      // Number with fallback
      enrollmentDate: timestamp,
      enrollmentAudioDuration: audioDuration,        // Number with fallback (REQUIRED)
      enrollmentAudioQuality: audioQuality,          // Number with fallback (REQUIRED)
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // ==========================================
    // STEP 10: FINAL SAFETY CHECK - NO NULL/UNDEFINED VALUES
    // ==========================================
    
    const nullFields: string[] = [];
    Object.entries(insertData).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        nullFields.push(key);
      }
    });

    if (nullFields.length > 0) {
      console.error('[VALIDATION ERROR] Insert data contains null/undefined fields:', nullFields);
      console.error('[DEBUG] Full insert data:', insertData);
      return NextResponse.json({ 
        error: 'Data validation failed: some fields are null or undefined',
        code: "VALIDATION_ERROR",
        nullFields
      }, { status: 400 });
    }

    // ==========================================
    // STEP 11: INSERT INTO DATABASE WITH ERROR HANDLING
    // ==========================================
    
    console.log('[DATABASE] Inserting voice template for userId:', userId.trim());
    console.log('[DEBUG] Insert data keys:', Object.keys(insertData));
    
    let newTemplate;
    try {
      newTemplate = await db.insert(voiceTemplates)
        .values(insertData)
        .returning();
      
      console.log('[SUCCESS] Voice template inserted with ID:', newTemplate[0].id);
    } catch (dbError) {
      console.error('[DATABASE INSERT ERROR]:', dbError);
      
      // Log detailed error information
      if (dbError instanceof Error) {
        console.error('DB Error message:', dbError.message);
        console.error('DB Error name:', dbError.name);
        console.error('DB Error stack:', dbError.stack);
      }
      
      // Log the data that failed to insert (for debugging)
      console.error('[FAILED INSERT DATA]:', JSON.stringify(insertData, null, 2));
      
      return NextResponse.json({ 
        error: 'Database insert failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        code: "DATABASE_INSERT_ERROR"
      }, { status: 500 });
    }

    // ==========================================
    // STEP 12: RETURN SUCCESS RESPONSE
    // ==========================================
    
    return NextResponse.json({
      success: true,
      templateId: newTemplate[0].id,
      message: "Voice template enrolled successfully",
      data: {
        userId: newTemplate[0].userId,
        email: newTemplate[0].email,
        name: newTemplate[0].name,
        enrollmentDate: newTemplate[0].enrollmentDate,
        sampleCount: newTemplate[0].sampleCount,
        audioQuality: newTemplate[0].enrollmentAudioQuality,
        audioDuration: newTemplate[0].enrollmentAudioDuration
      }
    }, { status: 201 });

  } catch (error) {
    // ==========================================
    // GLOBAL ERROR HANDLER
    // ==========================================
    
    console.error('[ENROLLMENT ERROR - GLOBAL CATCH]:', error);
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check for specific error types
      if (error.message.includes('JSON')) {
        return NextResponse.json({ 
          error: 'JSON processing error',
          details: error.message,
          code: "JSON_ERROR"
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error during enrollment',
      details: error instanceof Error ? error.message : 'Unknown error',
      code: "INTERNAL_ERROR"
    }, { status: 500 });
  }
}