"use client";

import { Shield, Lock, UserPlus, UserCheck, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LiveVoiceGuard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-cyan-900/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40 shadow-lg shadow-purple-500/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <Shield className="w-8 h-8 text-purple-600 dark:text-purple-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute -bottom-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  LiveVoice Guard
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Anti-Spoofing Voice Authentication</p>
              </div>
            </Link>
            <Link 
              href="/"
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10 transition-all duration-300"
            >
              ← Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom duration-700">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 mb-8 animate-in zoom-in duration-500 shadow-2xl shadow-purple-500/20">
            <Shield className="w-12 h-12 text-purple-600 dark:text-purple-400" />
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent animate-in zoom-in duration-1000">
            Secure Voice Authentication
          </h2>
          
          <p className="text-muted-foreground text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed mb-4">
            Advanced biometric voice recognition with real-time anti-spoofing detection. 
            Enroll your voice once, verify your identity anywhere.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Military-grade security • Sub-second verification • 99.9% accuracy</span>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
          {/* Enrollment Card */}
          <Link href="/livevoice-guard/enroll">
            <div className="group backdrop-blur-xl bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5 dark:from-blue-500/10 dark:via-cyan-500/10 dark:to-teal-500/10 rounded-3xl p-8 sm:p-10 border-2 border-blue-500/30 shadow-2xl shadow-blue-500/20 animate-in slide-in-from-left duration-700 hover:shadow-blue-500/40 hover:scale-105 hover:border-blue-500/50 transition-all duration-500 cursor-pointer">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <UserPlus className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                    Voice Enrollment
                  </h3>
                  <p className="text-sm text-muted-foreground">Create your voice profile</p>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                Register your unique voice signature in less than a minute. 
                Our AI analyzes hundreds of vocal characteristics to create your secure biometric profile.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "📝 Enter your details",
                  "🎤 Record challenge phrase",
                  "✅ Voice profile created"
                ].map((step, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 text-sm text-foreground bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-3 rounded-lg"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                      {idx + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-cyan-500 transition-all duration-300">
                <span className="font-semibold text-foreground group-hover:text-white">Get Started</span>
                <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:text-white group-hover:translate-x-2 transition-all duration-300" />
              </div>
            </div>
          </Link>

          {/* Verification Card */}
          <Link href="/livevoice-guard/verify">
            <div className="group backdrop-blur-xl bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-indigo-500/5 dark:from-purple-500/10 dark:via-blue-500/10 dark:to-indigo-500/10 rounded-3xl p-8 sm:p-10 border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20 animate-in slide-in-from-right duration-700 hover:shadow-purple-500/40 hover:scale-105 hover:border-purple-500/50 transition-all duration-500 cursor-pointer">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <UserCheck className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
                    Voice Verification
                  </h3>
                  <p className="text-sm text-muted-foreground">Authenticate your identity</p>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                Verify your identity in seconds using your voice. 
                Advanced anti-spoofing technology detects deepfakes and replay attacks in real-time.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "📧 Enter your email",
                  "🔊 Read challenge phrase",
                  "🎉 Instant authentication"
                ].map((step, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 text-sm text-foreground bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-3 rounded-lg"
                  >
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">
                      {idx + 1}
                    </div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl group-hover:bg-gradient-to-r group-hover:from-purple-500 group-hover:to-blue-500 transition-all duration-300">
                <span className="font-semibold text-foreground group-hover:text-white">Verify Now</span>
                <ArrowRight className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:text-white group-hover:translate-x-2 transition-all duration-300" />
              </div>
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-bold text-center mb-12 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
            Security Features
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Anti-Spoofing",
                description: "Advanced detection of replay attacks and synthetic voices",
                gradient: "from-purple-500/10 to-blue-500/10",
                border: "border-purple-500/20"
              },
              {
                icon: Lock,
                title: "Encryption",
                description: "Voice data encrypted during transmission and storage",
                gradient: "from-blue-500/10 to-cyan-500/10",
                border: "border-blue-500/20"
              },
              {
                icon: Sparkles,
                title: "AI Analysis",
                description: "Multi-layer voice pattern recognition",
                gradient: "from-cyan-500/10 to-teal-500/10",
                border: "border-cyan-500/20"
              },
              {
                icon: UserCheck,
                title: "Real-Time",
                description: "Instant authentication with sub-second response",
                gradient: "from-teal-500/10 to-green-500/10",
                border: "border-teal-500/20"
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className={`backdrop-blur-xl bg-gradient-to-br ${feature.gradient} rounded-2xl p-6 border ${feature.border} animate-in slide-in-from-bottom duration-700 hover:scale-105 transition-all shadow-lg hover:shadow-xl`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl w-fit mb-4">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h4 className="font-bold text-foreground mb-2 text-lg">{feature.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-border/40 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            LiveVoice Guard • Advanced Voice Authentication System • Demo Mode
          </p>
        </div>
      </footer>
    </div>
  );
}