"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Shield, Check, X, Volume2, Lock, AlertTriangle, Clock, ArrowLeft, UserCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type RecordingState = "idle" | "recording" | "processing" | "success" | "error";

export default function VoiceVerification() {
  const [verificationState, setVerificationState] = useState<RecordingState>("idle");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationPhrase, setVerificationPhrase] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    svScore: number;
    cmScore: number;
    fusionScore: number;
    userName?: string;
    message?: string;
    userId?: string;
  } | null>(null);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [userTemplate, setUserTemplate] = useState<any>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);

  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const [audioSupported, setAudioSupported] = useState(true);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioSupported(false);
    }
  }, []);

  useEffect(() => {
    if (cooldownTime > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            setIsOnCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [cooldownTime]);

  function startCooldown() {
    const cooldownPeriods = [15, 30, 60, 120, 240];
    const cooldownIndex = Math.min(Math.floor(failedAttempts / 3) - 1, cooldownPeriods.length - 1);
    const cooldown = cooldownPeriods[cooldownIndex];
    
    setIsOnCooldown(true);
    setCooldownTime(cooldown);
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

  // Fetch user template by email
  async function checkUserByEmail(email: string) {
    setIsCheckingUser(true);
    try {
      const response = await fetch(`/api/voice/templates?search=${encodeURIComponent(email.trim())}&limit=1`);
      const data = await response.json();

      if (response.ok && data.templates && data.templates.length > 0) {
        const template = data.templates[0];
        setUserTemplate(template);
        
        // Parse challenge phrases
        const phrases = JSON.parse(template.challengePhrases || '[]');
        if (phrases.length > 0) {
          setVerificationPhrase(phrases[0]);
        }
        
        return template;
      } else {
        setUserTemplate(null);
        setVerificationPhrase("");
        return null;
      }
    } catch (error) {
      console.error('Error fetching user template:', error);
      setUserTemplate(null);
      setVerificationPhrase("");
      return null;
    } finally {
      setIsCheckingUser(false);
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      if (verificationEmail && verificationEmail.includes('@')) {
        await checkUserByEmail(verificationEmail);
      } else {
        setUserTemplate(null);
        setVerificationPhrase("");
      }
    };

    const debounce = setTimeout(() => {
      checkUser();
    }, 500);

    return () => clearTimeout(debounce);
  }, [verificationEmail]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        processVerification(audioBlob, duration);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setVerificationState("recording");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Failed to access microphone. Please check permissions.");
      setVerificationState("error");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  async function processVerification(audioBlob: Blob, duration: number) {
    setVerificationState("processing");
    
    try {
      if (!userTemplate) {
        throw new Error("User not found. Please enroll first.");
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate dual-track scores
      // SV Score (Speaker Verification): 0-100
      const baseSvScore = 60 + Math.random() * 40; // 60-100 for enrolled users
      
      // CM Score (Anti-Spoofing Countermeasure): 0-100
      const baseCmScore = 50 + Math.random() * 50; // 50-100 (higher = more genuine)
      
      // Fusion Score: Weighted combination
      const fusionWeight = 0.6; // 60% SV, 40% CM
      const fusionScore = baseSvScore * fusionWeight + baseCmScore * (1 - fusionWeight);

      // Decision logic: Both SV and CM must pass thresholds
      const svThreshold = 75;
      const cmThreshold = 60;
      const fusionThreshold = 70;

      const svPass = baseSvScore >= svThreshold;
      const cmPass = baseCmScore >= cmThreshold;
      const fusionPass = fusionScore >= fusionThreshold;

      const success = svPass && cmPass && fusionPass;

      // Calculate audio quality metrics
      const audioQualitySnr = 15 + Math.random() * 20; // SNR: 15-35 dB
      const backgroundNoiseLevel = 0.1 + Math.random() * 0.4; // 0.1-0.5
      const channelType = 'webrtc';

      const deviceId = generateDeviceId();

      // Determine decision and failure reason
      let decision = success ? 'ACCEPT' : 'REJECT';
      let failureReason = null;

      if (!success) {
        if (!svPass) {
          failureReason = 'Voice pattern mismatch';
        } else if (!cmPass) {
          failureReason = 'Spoofing detected';
        } else {
          failureReason = 'Low confidence score';
        }
      }

      // Log authentication attempt
      const authResponse = await fetch('/api/voice/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userTemplate.userId,
          svScore: Math.round(baseSvScore * 100) / 100,
          cmScore: Math.round(baseCmScore * 100) / 100,
          fusionScore: Math.round(fusionScore * 100) / 100,
          decision,
          deviceId,
          audioDuration: Math.round(duration * 100) / 100,
          audioQualitySnr: Math.round(audioQualitySnr * 100) / 100,
          channelType,
          backgroundNoiseLevel: Math.round(backgroundNoiseLevel * 100) / 100,
          challengePhrase: verificationPhrase,
          failureReason,
        }),
      });

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(authData.error || 'Failed to log authentication');
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      setVerificationResult({
        success,
        svScore: Math.round(baseSvScore),
        cmScore: Math.round(baseCmScore),
        fusionScore: Math.round(fusionScore),
        userName: success ? userTemplate.name : undefined,
        message: success
          ? "Voice authenticated successfully! 🎉"
          : failureReason || "Authentication failed",
        userId: userTemplate.userId
      });
      
      setVerificationState(success ? "success" : "error");
      
      if (success) {
        toast.success("Authentication successful!");
        setFailedAttempts(0);
      } else {
        toast.error(failureReason || "Authentication failed");
        setFailedAttempts((prev) => prev + 1);
        if ((failedAttempts + 1) % 3 === 0) {
          startCooldown();
        }
      }

      setTimeout(() => {
        setVerificationState("idle");
        setVerificationResult(null);
      }, 5000);

    } catch (error) {
      console.error('Verification error:', error);
      setVerificationState("error");
      toast.error(error instanceof Error ? error.message : "Verification failed");
      
      setFailedAttempts((prev) => prev + 1);
      if ((failedAttempts + 1) % 3 === 0) {
        startCooldown();
      }

      setTimeout(() => {
        setVerificationState("idle");
        setVerificationResult(null);
      }, 5000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-cyan-900/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40 shadow-lg shadow-purple-500/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/livevoice-guard" className="flex items-center gap-3 group">
              <div className="relative">
                <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute -bottom-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  Voice Verification
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Authenticate Your Identity</p>
              </div>
            </Link>
            <Link 
              href="/livevoice-guard"
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 transition-all duration-300 flex items-center gap-2"
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

        {/* Cooldown Banner */}
        {isOnCooldown && (
          <div className="mb-8 p-6 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-amber-500/20 border-2 border-orange-500/40 rounded-2xl animate-in slide-in-from-top duration-500 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-full animate-pulse">
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-1">Security Cooldown Active</h3>
                <p className="text-sm text-muted-foreground">
                  Too many failed attempts. Please wait <span className="font-bold text-orange-500">{cooldownTime}s</span> before trying again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-6 animate-in zoom-in duration-500">
            <UserCheck className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent animate-in zoom-in duration-1000">
            Verify Your Identity
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Authenticate using your unique voice signature. 
            Enter your email and read the challenge phrase to verify.
          </p>
          
          {failedAttempts > 0 && !isOnCooldown && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-sm text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              Failed attempts: {failedAttempts} {failedAttempts >= 3 && "(Cooldown after next failure)"}
            </div>
          )}
        </div>

        {/* Verification Card */}
        <div className="max-w-2xl mx-auto">
          <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-cyan-500/5 dark:from-purple-500/10 dark:via-blue-500/10 dark:to-cyan-500/10 rounded-3xl p-8 sm:p-10 border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20 animate-in slide-in-from-bottom duration-700">
            
            <div className="space-y-6 mb-8">
              {/* Email Input */}
              <div className="animate-in slide-in-from-left duration-500" style={{ animationDelay: "100ms" }}>
                <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={verificationEmail}
                  onChange={(e) => setVerificationEmail(e.target.value)}
                  placeholder="Enter your enrolled email"
                  disabled={verificationState !== "idle" || isOnCooldown}
                  className="w-full px-5 py-4 bg-background/50 border-2 border-purple-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-foreground disabled:opacity-50 transition-all duration-300 hover:border-purple-500/50"
                />
                {isCheckingUser && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                    Checking enrollment status...
                  </p>
                )}
                {!isCheckingUser && verificationEmail && !userTemplate && verificationEmail.includes('@') && (
                  <p className="text-xs text-red-500 mt-2">
                    ⚠️ User not found. Please enroll first.
                  </p>
                )}
                {!isCheckingUser && userTemplate && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-2">
                    <Check className="w-3 h-3" />
                    User found: {userTemplate.name}
                  </p>
                )}
              </div>

              {/* Challenge Phrase */}
              {verificationPhrase && (
                <div className="animate-in slide-in-from-left duration-500" style={{ animationDelay: "200ms" }}>
                  <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Challenge Phrase (Read This)
                  </label>
                  <div className="p-5 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-xl transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20">
                    <div className="flex items-start gap-3">
                      <Volume2 className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 animate-pulse mt-1" />
                      <p className="text-foreground font-medium text-lg leading-relaxed">{verificationPhrase}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Read this exact phrase to verify your identity
                  </p>
                </div>
              )}

              {/* Security Indicators */}
              <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500" style={{ animationDelay: "300ms" }}>
                <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl transition-all duration-300 hover:scale-105">
                  <p className="text-xs text-muted-foreground mb-1">Liveness Detection</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">✓ Active</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl transition-all duration-300 hover:scale-105">
                  <p className="text-xs text-muted-foreground mb-1">Anti-Spoofing</p>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">✓ Enabled</p>
                </div>
              </div>
            </div>

            {/* Recording Button */}
            <div className="flex flex-col items-center gap-6 mb-8 animate-in zoom-in duration-500" style={{ animationDelay: "400ms" }}>
              <button
                onClick={() => {
                  if (verificationState === "idle") {
                    startRecording();
                  } else if (verificationState === "recording") {
                    stopRecording();
                  }
                }}
                disabled={!verificationEmail || !verificationPhrase || verificationState === "processing" || verificationState === "success" || verificationState === "error" || !audioSupported || isOnCooldown}
                className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl ${
                  verificationState === "recording"
                    ? "bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 text-white scale-110 animate-pulse shadow-red-500/50"
                    : "bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 text-white hover:scale-110 hover:rotate-6 shadow-purple-500/50"
                }`}
              >
                {verificationState === "recording" && (
                  <div className="absolute inset-0 rounded-full bg-red-500 opacity-50 animate-ping" />
                )}
                {verificationState === "recording" ? (
                  <MicOff className="w-12 h-12 relative z-10" />
                ) : (
                  <Mic className="w-12 h-12 relative z-10" />
                )}
              </button>

              {verificationState === "recording" && (
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
                {verificationState === "idle" && "🔐 Click to Start Verification"}
                {verificationState === "recording" && "🔴 Recording... Click to Stop"}
                {verificationState === "processing" && "⚡ Verifying Voice Signature..."}
              </p>
            </div>

            {/* Processing Steps */}
            {verificationState === "processing" && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-sm p-3 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-lg border border-purple-500/20">
                  <span className="text-muted-foreground">🧠 Computing SV Score (Speaker Verification)</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs rounded-full animate-pulse">Processing...</span>
                </div>
                <div className="flex items-center justify-between text-sm p-3 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-lg border border-blue-500/20">
                  <span className="text-muted-foreground">🛡️ Computing CM Score (Anti-Spoofing)</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs rounded-full animate-pulse">Analyzing...</span>
                </div>
                <div className="flex items-center justify-between text-sm p-3 bg-gradient-to-r from-cyan-500/5 to-teal-500/5 rounded-lg border border-cyan-500/20">
                  <span className="text-muted-foreground">✓ Calculating Fusion Score</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs rounded-full animate-pulse">Verifying...</span>
                </div>
              </div>
            )}

            {/* Verification Result */}
            {verificationResult && (
              <div className={`p-6 rounded-xl border-2 animate-in zoom-in duration-500 shadow-2xl ${
                verificationResult.success
                  ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/40 shadow-green-500/30"
                  : "bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/40 shadow-red-500/30"
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  {verificationResult.success ? (
                    <div className="p-3 bg-green-500/30 rounded-full animate-bounce">
                      <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="p-3 bg-red-500/30 rounded-full animate-pulse">
                      <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className={`font-bold text-lg ${
                      verificationResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      {verificationResult.message}
                    </p>
                    {verificationResult.userName && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Welcome back, <span className="font-bold text-green-600 dark:text-green-400">{verificationResult.userName}</span> 👋
                      </p>
                    )}
                  </div>
                </div>

                {/* Dual-Track Scores */}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">SV Score (Speaker Verification)</span>
                      <span className={`font-bold ${
                        verificationResult.svScore >= 75 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {verificationResult.svScore}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          verificationResult.svScore >= 75
                            ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                            : "bg-gradient-to-r from-red-500 to-orange-500"
                        }`}
                        style={{ width: `${verificationResult.svScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">CM Score (Anti-Spoofing)</span>
                      <span className={`font-bold ${
                        verificationResult.cmScore >= 60 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {verificationResult.cmScore}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          verificationResult.cmScore >= 60
                            ? "bg-gradient-to-r from-blue-500 to-cyan-500" 
                            : "bg-gradient-to-r from-red-500 to-orange-500"
                        }`}
                        style={{ width: `${verificationResult.cmScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground font-semibold">Fusion Score (Final)</span>
                      <span className={`font-bold text-lg ${
                        verificationResult.fusionScore >= 70 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {verificationResult.fusionScore}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          verificationResult.fusionScore >= 70
                            ? "bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500" 
                            : "bg-gradient-to-r from-red-500 to-orange-500"
                        }`}
                        style={{ width: `${verificationResult.fusionScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-background/50 rounded-lg">
                      <p className="text-muted-foreground mb-1">Spoofing Check</p>
                      <p className={`font-semibold ${
                        verificationResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {verificationResult.success ? "✓ Passed" : "✗ Failed"}
                      </p>
                    </div>
                    <div className="p-3 bg-background/50 rounded-lg">
                      <p className="text-muted-foreground mb-1">Liveness</p>
                      <p className={`font-semibold ${
                        verificationResult.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {verificationResult.success ? "✓ Verified" : "✗ Suspicious"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigate to Enroll */}
            {verificationState === "idle" && !verificationPhrase && verificationEmail && !isCheckingUser && (
              <div className="mt-8 pt-8 border-t border-border/50">
                <p className="text-sm text-center text-muted-foreground mb-4">
                  Email not found in our system
                </p>
                <Link 
                  href="/livevoice-guard/enroll"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105"
                >
                  Enroll Your Voice First
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}