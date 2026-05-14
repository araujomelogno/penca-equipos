export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden">
      {/* Amber radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 800,
          height: 800,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(ellipse at center, rgba(255,225,158,0.05) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 w-full max-w-[480px] px-4">
        {children}
      </div>
    </div>
  );
}
