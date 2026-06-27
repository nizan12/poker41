'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const HeroBackground = dynamic(
  () => import('@/features/lobby/components/HeroBackground'),
  { ssr: false }
);

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* 3D Background */}
      <HeroBackground />

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 md:px-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-heading font-bold text-white text-lg shadow-glow">
              41
            </div>
            <span className="font-heading font-bold text-xl text-text-bright">
              Remi 41
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-text-muted">
            <a href="#features" className="hover:text-primary transition-colors">
              Fitur
            </a>
            <a href="#rules" className="hover:text-primary transition-colors">
              Aturan
            </a>
            <Link href="/lobby" className="btn-primary text-sm px-4 py-2">
              Mulai Bermain
            </Link>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-3xl mx-auto animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border-accent bg-primary-50 text-primary text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Multiplayer Realtime
            </div>

            {/* Title */}
            <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
              <span className="text-gradient">Remi 41</span>
              <br />
              <span className="text-text-bright">Online</span>
            </h1>

            {/* Subtitle */}
            <p className="text-text-muted text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
              Pengalaman bermain kartu 3D terbaik. Mainkan Remi 41 bersama
              teman-temanmu di mana saja, kapan saja.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/lobby"
                className="btn-gold text-lg px-8 py-4 rounded-xl flex items-center gap-3 min-w-[200px] justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Mulai Bermain
              </Link>
              <a
                href="#rules"
                className="btn-secondary text-lg px-8 py-4 rounded-xl flex items-center gap-3 min-w-[200px] justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Cara Bermain
              </a>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mt-12 text-text-muted">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">3D</div>
                <div className="text-xs">Visual</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">2-6</div>
                <div className="text-xs">Pemain</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">RT</div>
                <div className="text-xs">Realtime</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-6 py-20 md:px-12">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">
              Kenapa <span className="text-gradient">Remi 41?</span>
            </h2>
            <p className="text-text-muted text-center mb-12 max-w-xl mx-auto">
              Dibangun dengan teknologi modern untuk pengalaman bermain terbaik
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: '🎮',
                  title: '3D Interaktif',
                  desc: 'Meja dan kartu dirender dalam 3D penuh dengan animasi yang halus dan realistis.',
                },
                {
                  icon: '⚡',
                  title: 'Realtime Sync',
                  desc: 'Setiap aksi langsung terlihat oleh semua pemain tanpa delay berkat Firebase.',
                },
                {
                  icon: '🔒',
                  title: 'Anti Cheat',
                  desc: 'Server-authoritative logic memastikan tidak ada pemain yang bisa curang.',
                },
                {
                  icon: '🎨',
                  title: 'Premium Design',
                  desc: 'Tampilan modern dengan tema casino premium yang elegan dan responsif.',
                },
                {
                  icon: '🔊',
                  title: 'Sound Effects',
                  desc: 'Audio imersif untuk setiap aksi — shuffle, deal, draw, dan efek kemenangan.',
                },
                {
                  icon: '📱',
                  title: 'Cross Platform',
                  desc: 'Mainkan di desktop, tablet, atau smartphone — cukup buka browser.',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="glass-card p-6 hover:border-border-accent transition-all duration-300 group"
                >
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="font-heading font-semibold text-lg text-text-bright mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Rules Section */}
        <section id="rules" className="px-6 py-20 md:px-12 bg-surface-dark/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">
              Cara <span className="text-gradient-gold">Bermain</span>
            </h2>
            <p className="text-text-muted text-center mb-12 max-w-xl mx-auto">
              Pelajari aturan Remi 41 dalam hitungan menit
            </p>

            <div className="space-y-6">
              {[
                {
                  step: '01',
                  title: 'Setiap pemain mendapat 4 kartu',
                  desc: 'Kartu dibagikan secara acak dari deck 52 kartu standar (tanpa Joker).',
                },
                {
                  step: '02',
                  title: 'Ambil & Buang',
                  desc: 'Setiap giliran, ambil 1 kartu dari deck atau tumpukan buangan, lalu buang 1 kartu.',
                },
                {
                  step: '03',
                  title: 'Kumpulkan suit yang sama',
                  desc: 'Tujuanmu adalah mengumpulkan 4 kartu dengan suit (♥♦♣♠) yang sama.',
                },
                {
                  step: '04',
                  title: 'Capai total 41!',
                  desc: 'Ace = 11, J/Q/K = 10, kartu angka sesuai nomor. Total 41 dengan suit sama = MENANG!',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="glass-card p-6 flex items-start gap-6"
                >
                  <div className="text-3xl font-heading font-black text-gradient-gold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-text-bright mb-1">
                      {item.title}
                    </h3>
                    <p className="text-text-muted text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Card values table */}
            <div className="glass-card p-6 mt-8">
              <h3 className="font-heading font-semibold text-lg text-text-bright mb-4 text-center">
                Nilai Kartu
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-surface-dark">
                  <div className="text-2xl font-bold text-danger mb-1">A</div>
                  <div className="text-text-muted text-sm">= 11 poin</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-dark">
                  <div className="text-2xl font-bold text-secondary mb-1">J Q K</div>
                  <div className="text-text-muted text-sm">= 10 poin</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-dark">
                  <div className="text-2xl font-bold text-primary mb-1">2-10</div>
                  <div className="text-text-muted text-sm">= sesuai angka</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 py-8 border-t border-border text-center text-text-muted text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-heading font-bold text-white text-xs">
              41
            </div>
            <span className="font-heading font-semibold text-text">Remi 41 Online</span>
          </div>
          <p>© 2024 Remi 41 Online. Built with Next.js, Three.js & Firebase.</p>
        </footer>
      </div>
    </main>
  );
}
