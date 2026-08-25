import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#313338] text-white flex flex-col font-sans selection:bg-[#5865F2] selection:text-white">
      <header className="flex justify-between items-center p-6 max-w-7xl mx-auto w-full">
        <div className="text-2xl font-black text-white tracking-tighter">NEXUS</div>
        <nav className="hidden md:flex gap-6 font-semibold text-sm">
          <Link href="#" className="hover:underline">Baixar</Link>
          <Link href="#" className="hover:underline">Nitro (Nexus)</Link>
          <Link href="#" className="hover:underline">Descobrir</Link>
          <Link href="#" className="hover:underline">Segurança</Link>
          <Link href="#" className="hover:underline">Suporte</Link>
        </nav>
        <Link 
          href="/login" 
          className="bg-white text-[#313338] px-4 py-2 rounded-full font-medium text-sm hover:text-[#5865F2] transition-colors shadow-sm"
        >
          Entrar
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-[#404EED] relative overflow-hidden">
        {/* Abstract background blobs could go here */}
        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight uppercase font-headline">
            Imagine um <br/> lugar...
          </h1>
          <p className="text-lg md:text-xl font-medium max-w-3xl mx-auto leading-relaxed">
            ...onde você possa pertencer a um clube escolar, um grupo de gamers, ou uma comunidade artística mundial. Onde você e um punhado de amigos possam passar tempo juntos. Um lugar que torna mais fácil conversar todos os dias e se divertir com mais frequência.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
            <Link 
              href="https://github.com/kelvinpvp/nexus/releases/latest" 
              target="_blank"
              className="bg-white text-[#313338] px-8 py-4 rounded-full font-medium text-lg hover:text-[#5865F2] transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <span>Baixar para Windows</span>
            </Link>
            <Link 
              href="/login" 
              className="bg-[#23272A] text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-[#313338] transition-colors shadow-lg"
            >
              Abra o Nexus no seu navegador
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-[#23272A] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-[#5865F2] pt-8">
          <div className="text-2xl font-black text-[#5865F2] tracking-tighter mb-4 md:mb-0">NEXUS</div>
          <Link 
            href="/register" 
            className="bg-[#5865F2] text-white px-4 py-2 rounded-full font-medium text-sm hover:bg-[#4752C4] transition-colors"
          >
            Registrar-se
          </Link>
        </div>
      </footer>
    </div>
  );
}
