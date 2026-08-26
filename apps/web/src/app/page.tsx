import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white flex flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.38em] text-cyan-300">Nexus</div>
          <div className="text-xl font-black tracking-tight">Communication OS</div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/register" className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5 sm:inline-flex">
            Criar conta
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 pb-14 pt-6">
        <div className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_140px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.28),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.18),_transparent_30%)]" />
            <div className="relative max-w-2xl space-y-8">
              <p className="text-xs font-bold uppercase tracking-[0.34em] text-cyan-300">Bem-vindo ao Nexus</p>
              <h1 className="text-5xl font-black leading-[0.95] sm:text-6xl lg:text-7xl">
                Um espaço mais vivo, mais claro e menos genérico.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Conversas, voz, chamadas e comunidades com uma identidade própria — visual mais limpo,
                fluxos mais rápidos e menos ruído em tudo que você faz.
              </p>

              <div className="grid gap-3 pt-4 sm:grid-cols-3">
                {[
                  'Perfis e configurações com mais personalidade',
                  'Voz e chamadas com menos atrito',
                  'Interface pensada para crescer como produto',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
                  Abrir o Nexus
                </Link>
                <Link href="https://github.com/kelvinpvp/nexus/releases/latest" target="_blank" className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/5">
                  Baixar desktop
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-6">
            <div className="rounded-[28px] border border-white/10 bg-[#0c1020]/90 p-6 shadow-[0_20px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Foco visual</div>
              <div className="mt-3 text-2xl font-black">Cores mais próprias, menos cara de clone.</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                O app passa a falar a própria linguagem no login, registro, home e painéis.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Fluxo</div>
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">1. Entrar ou criar conta</div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">2. Ajustar voz e perfil</div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">3. Conversar e chamar amigos</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
