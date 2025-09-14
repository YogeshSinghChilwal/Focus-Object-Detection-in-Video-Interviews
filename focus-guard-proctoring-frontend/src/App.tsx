import Dashboard from "./components/Dashboard";

function App() {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] relative">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
        linear-gradient(to right, #e2e8f0 1px, transparent 1px),
        linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
      `,
          backgroundSize: "20px 30px",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 0%, #000 60%, transparent 100%)",
        }}
      />
      <div className="relative z-10">
         <Dashboard />
         
      </div>
     
    </div>
  );
}

export default App;
