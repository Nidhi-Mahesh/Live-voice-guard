"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Shield, User, Check, Volume2, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const challengePhrases = [
  "The quick brown fox jumps over the lazy dog",
  "She sells seashells by the seashore",
  "How much wood would a woodchuck chuck",
  "Peter Piper picked a peck of pickled peppers",
  "I scream, you scream, we all scream for ice cream",
  "Unique New York, you need unique New York",
  "Red lorry, yellow lorry, red lorry, yellow lorry",
  "The blue bluebird blinks in the bright blue sky"
];

type RecordingState = "idle" | "recording" | "processing" | "success" | "error";

export default function VoiceEnrollment() {
  const [enrollmentState, setEnrollmentState] = useState<RecordingState>("idle");
  const [enrollmentPhrase, setEnrollmentPhrase] = useState("");
  const [enrollmentName, setEnrollmentName] = useState("");
  const [enrollmentEmail, setEnrollmentEmail] = useState("");
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  const [audioSupported, setAudioSupported] = useState(true);
  const [audioDuration, setAudioDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioSupported(false);
    }
    setEnrollmentPhrase(getRandomPhrase());
  }, []);

  function getRandomPhrase() {
    return challengePhrases[Math.floor(Math.random() * challengePhrases.length)];
  }

  // Generate device fingerprint
  function generateDeviceId(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const txt = 'LiveVoiceGuard';
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText(txt, 2, 2);
    }
    const fingerprint = canvas.toDataURL();
    const hash = Array.from(fingerprint).reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
    }, 0);
    return `device_${Math.abs(hash)}_${Date.now()}`;
  }

  // Generate mock 512-dim voice embedding
  function generateVoiceEmbedding(): number[] {
    const embedding: number[] = [];
    for (let i = 0; i < 512; i++) {
      // Generate normalized random values between -1 and 1
      embedding.push((Math.random() * 2 - 1) * 0.8);
    }
    return embedding;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1, // Mono
          sampleRate: 16000, // 16kHz for better compatibility
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // Try to use audio/wav if supported, fallback to webm
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        setAudioDuration(duration);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        processEnrollment(audioBlob, duration);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setEnrollmentState("recording");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Failed to access microphone. Please check permissions.");
      setEnrollmentState("error");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  async function processEnrollment(audioBlob: Blob, duration: number) {
    setEnrollmentState("processing");
    
    try {
      // Progress: Starting
      setEnrollmentProgress(10);
      
      // STEP 1: Extract real voice embedding from audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      setEnrollmentProgress(20);
      
      // Call Python voice embedding service
      const embeddingResponse = await fetch('http://localhost:8000/extract-embedding', {
        method: 'POST',
        body: formData,
      });
      
      if (!embeddingResponse.ok) {
        const errorData = await embeddingResponse.json();
        throw new Error(errorData.detail || 'Failed to extract voice embedding');
      }
      
      const embeddingData = await embeddingResponse.json();
      const voiceEmbedding = embeddingData.embedding;
      const audioQuality = embeddingData.audio_quality_snr;
      
      setEnrollmentProgress(50);
      
      // Generate device fingerprint
      const deviceId = generateDeviceId();
      
      // Generate unique userId
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Call enrollment API
      const response = await fetch('/api/voice/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: enrollmentName.trim(),
          email: enrollmentEmail.trim(),
          voiceEmbedding,
          enrollmentAudioDuration: Math.round(duration * 100) / 100,
          enrollmentAudioQuality: Math.round(audioQuality * 100) / 100,
          sampleCount: 3,
          challengePhrase: enrollmentPhrase, // Fixed: Send as string, not array
          deviceId,
        }),
      });

      setEnrollmentProgress(80);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Enrollment failed');
      }

      setEnrollmentProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      setEnrollmentState("success");
      toast.success("Voice profile created successfully! 🎉");
      
      // Store userId in localStorage for demo purposes
      localStorage.setItem('lastEnrolledUserId', userId);
      localStorage.setItem('lastEnrolledEmail', enrollmentEmail.trim());
      
      setTimeout(() => {
        setEnrollmentState("idle");
        setEnrollmentProgress(0);
        setEnrollmentName("");
        setEnrollmentEmail("");
        setEnrollmentPhrase(getRandomPhrase());
        setAudioDuration(0);
      }, 3000);

    } catch (error) {
      console.error('Enrollment error:', error);
      setEnrollmentState("error");
      toast.error(error instanceof Error ? error.message : "Enrollment failed. Please try again.");
      
      setTimeout(() => {
        setEnrollmentState("idle");
        setEnrollmentProgress(0);
      }, 3000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 dark:from-blue-900/20 dark:via-cyan-900/20 dark:to-teal-900/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40 shadow-lg shadow-blue-500/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/livevoice-guard" className="flex items-center gap-3 group">
              <div className="relative">
                <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
                <Lock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 absolute -bottom-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent">
                  Voice Enrollment
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Register Your Voice Profile</p>
              </div>
            </Link>
            <Link 
              href="/livevoice-guard"
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-cyan-500/10 transition-all duration-300 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {!audioSupported && (
          <div className="mb-8 p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg text-destructive animate-in slide-in-from-top duration-500">
            <p className="text-sm">
              ⚠️ Your browser doesn't support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 mb-6 animate-in zoom-in duration-500">
            <User className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent animate-in zoom-in duration-1000">
            Create Your Voice Profile
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Register your unique voice signature for secure authentication. 
            Complete the form and record your voice reading the challenge phrase.
          </p>
        </div>

        {/* Enrollment Card */}
        <div className="max-w-2xl mx-auto">
          <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5 dark:from-blue-500/10 dark:via-cyan-500/10 dark:to-teal-500/10 rounded-3xl p-8 sm:p-10 border-2 border-blue-500/30 shadow-2xl shadow-blue-500/20 animate-in slide-in-from-bottom duration-700">
            
            <div className="space-y-6 mb-8">
              {/* Name Input */}
              <div className="animate-in slide-in-from-left duration-500" style={{ animationDelay: "100ms" }}>
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={enrollmentName}
                  onChange={(e) => setEnrollmentName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={enrollmentState !== "idle"}
                  className="w-full px-5 py-4 bg-background/50 border-2 border-blue-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-foreground disabled:opacity-50 transition-all duration-300 hover:border-blue-500/50"
                />
              </div>

              {/* Email Input */}
              <div className="animate-in slide-in-from-left duration-500" style={{ animationDelay: "200ms" }}>
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={enrollmentEmail}
                  onChange={(e) => setEnrollmentEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={enrollmentState !== "idle"}
                  className="w-full px-5 py-4 bg-background/50 border-2 border-cyan-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-foreground disabled:opacity-50 transition-all duration-300 hover:border-cyan-500/50"
                />
              </div>

              {/* Challenge Phrase */}
              <div className="animate-in slide-in-from-left duration-500" style={{ animationDelay: "300ms" }}>
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Challenge Phrase
                </label>
                <div className="p-5 bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 border-2 border-teal-500/30 rounded-xl transition-all duration-300 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/20">
                  <div className="flex items-start gap-3">
                    <Volume2 className="w-6 h-6 text-teal-600 dark:text-teal-400 flex-shrink-0 animate-pulse mt-1" />
                    <p className="text-foreground font-medium text-lg leading-relaxed">{enrollmentPhrase}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                  Read this phrase clearly and naturally when recording
                </p>
              </div>
            </div>

            {/* Recording Section */}
            <div className="flex flex-col items-center gap-6 mb-8 animate-in zoom-in duration-500" style={{ animationDelay: "400ms" }}>
              <button
                onClick={() => {
                  if (enrollmentState === "idle") {
                    startRecording();
                  } else if (enrollmentState === "recording") {
                    stopRecording();
                  }
                }}
                disabled={!enrollmentName || !enrollmentEmail || enrollmentState === "processing" || enrollmentState === "success" || !audioSupported}
                className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl ${
                  enrollmentState === "recording"
                    ? "bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 text-white scale-110 animate-pulse shadow-red-500/50"
                    : "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 text-white hover:scale-110 hover:rotate-6 shadow-blue-500/50"
                }`}
              >
                {enrollmentState === "recording" && (
                  <div className="absolute inset-0 rounded-full bg-red-500 opacity-50 animate-ping" />
                )}
                {enrollmentState === "recording" ? (
                  <MicOff className="w-12 h-12 relative z-10" />
                ) : (
                  <Mic className="w-12 h-12 relative z-10" />
                )}
              </button>

              {enrollmentState === "recording" && (
                <div className="flex items-center gap-3 h-16">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 bg-gradient-to-t from-red-500 via-orange-500 to-amber-500 rounded-full animate-[waveform_0.8s_ease-in-out_infinite]"
                      style={{ 
                        animationDelay: `${i * 0.1}s`,
                        height: '50%'
                      }}
                    />
                  ))}
                </div>
              )}

              <p className="text-base text-center font-semibold text-foreground">
                {enrollmentState === "idle" && "🎤 Click to Start Recording"}
                {enrollmentState === "recording" && "🔴 Recording... Click to Stop"}
                {enrollmentState === "processing" && "⚡ Processing Voice Sample..."}
                {enrollmentState === "success" && "✅ Voice Enrolled Successfully!"}
                {enrollmentState === "error" && "❌ Enrollment Failed"}
              </p>
            </div>

            {/* Processing Progress */}
            {enrollmentState === "processing" && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="w-full h-4 bg-muted rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 transition-all duration-300 animate-[shimmer_1.5s_infinite]"
                    style={{ width: `${enrollmentProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {enrollmentProgress < 40 && "🎙️ Extracting voice features..."}
                    {enrollmentProgress >= 40 && enrollmentProgress < 70 && "🧠 Creating 512-dim embedding..."}
                    {enrollmentProgress >= 70 && "💾 Storing voice profile..."}
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{enrollmentProgress}%</span>
                </div>
              </div>
            )}

            {/* Success Message */}
            {enrollmentState === "success" && (
              <div className="p-6 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 border-2 border-green-500/40 rounded-xl flex items-center gap-4 animate-in zoom-in duration-500 shadow-2xl shadow-green-500/30">
                <div className="p-3 bg-green-500/30 rounded-full animate-bounce">
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 mb-1">
                    Enrollment Complete! 🎉
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your voice profile has been created. You can now verify your identity.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {enrollmentState === "error" && (
              <div className="p-6 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20 border-2 border-red-500/40 rounded-xl flex items-center gap-4 animate-in zoom-in duration-500 shadow-2xl shadow-red-500/30">
                <div className="p-3 bg-red-500/30 rounded-full animate-pulse">
                  <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400 mb-1">
                    Enrollment Failed
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please try again or check your connection.
                  </p>
                </div>
              </div>
            )}

            {/* Navigate to Verify */}
            {enrollmentState === "idle" && (
              <div className="mt-8 pt-8 border-t border-border/50">
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Already enrolled?
                </p>
                <Link 
                  href="/livevoice-guard/verify"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105"
                >
                  Verify Your Voice
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Secure Storage",
                description: "Voice data encrypted at rest",
                gradient: "from-blue-500/10 to-cyan-500/10",
                border: "border-blue-500/20"
              },
              {
                icon: Lock,
                title: "Privacy First",
                description: "Your data never leaves secure servers",
                gradient: "from-cyan-500/10 to-teal-500/10",
                border: "border-cyan-500/20"
              },
              {
                icon: Check,
                title: "Quick Setup",
                description: "Enrollment takes less than a minute",
                gradient: "from-teal-500/10 to-green-500/10",
                border: "border-teal-500/20"
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className={`backdrop-blur-xl bg-gradient-to-br ${feature.gradient} rounded-xl p-6 border ${feature.border} animate-in slide-in-from-bottom duration-700 hover:scale-105 transition-all shadow-lg hover:shadow-xl`}
                style={{ animationDelay: `${0.5 + idx * 0.1}s` }}
              >
                <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg w-fit mb-3">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2 text-sm">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}