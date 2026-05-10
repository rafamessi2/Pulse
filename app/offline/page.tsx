export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 shadow-lg"
        style={{ boxShadow: '0 0 40px rgba(255,61,127,0.4)' }}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <path d="M4 22 L12 10 L20 28 L28 16 L36 22 L40 18"
            stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-2">Você está offline</h1>
      <p className="text-muted-foreground mb-6">Seus dados estão salvos no dispositivo. Conecte-se para sincronizar.</p>
    </div>
  );
}
