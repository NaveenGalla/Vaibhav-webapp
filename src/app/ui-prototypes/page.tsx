const fleetRows = [
  ["AP16BZ5001", "Fortuner", "Head Office", "Active", "12.4 km/L"],
  ["TS09FX1182", "Activa", "Dwaraka Nagar", "Active", "44.8 km/L"],
  ["AP31EA7781", "Innova", "Gajuwaka", "Service", "10.1 km/L"],
];

const nav = ["Overview", "Fleet", "Fuel", "Service", "Reports"];

function Dot({ tone }: { tone: string }) {
  return <span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden="true" />;
}

function PhoneShell({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`mx-auto w-full max-w-[360px] rounded-[2rem] border p-2 shadow-2xl ${dark ? "border-white/10 bg-black" : "border-slate-200 bg-slate-950"}`}>
      <div className={`min-h-[620px] overflow-hidden rounded-[1.5rem] ${dark ? "bg-zinc-950 text-zinc-50" : "bg-white text-slate-950"}`}>
        {children}
      </div>
    </div>
  );
}

function PrototypeOne() {
  return (
    <section id="prototype-1" className="min-h-screen bg-[#f5f5f7] px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Prototype 01</p>
            <h1 className="mt-2 text-3xl font-semibold">Apple-style Command Center</h1>
            <p className="mt-1 text-sm text-slate-500">Quiet, spacious, white glass, built for executives and branch managers.</p>
          </div>
          <div className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
            {["Day", "Week", "Month"].map((item, index) => (
              <span key={item} className={`rounded-full px-4 py-2 text-sm font-medium ${index === 1 ? "bg-slate-950 text-white" : "text-slate-500"}`}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">V</div>
              <div>
                <p className="font-semibold">Vaibhav VFM</p>
                <p className="text-xs text-slate-500">Fleet intelligence</p>
              </div>
            </div>
            <div className="space-y-1">
              {nav.map((item, index) => (
                <div key={item} className={`flex h-11 items-center justify-between rounded-2xl px-3 text-sm ${index === 0 ? "bg-slate-950 text-white" : "text-slate-500"}`}>
                  <span>{item}</span>
                  {index === 0 && <span className="text-xs">›</span>}
                </div>
              ))}
            </div>
          </aside>

          <main className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Fleet health</p>
                    <p className="mt-2 text-5xl font-semibold tracking-tight">96%</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Healthy</span>
                </div>
                <div className="mt-8 h-40 rounded-3xl bg-[linear-gradient(135deg,#e8eef8,#ffffff_48%,#e8f7ef)] p-5">
                  <div className="relative h-full">
                    <div className="absolute left-2 top-16 h-2 w-[86%] rounded-full bg-slate-900/10" />
                    <div className="absolute left-6 top-10 h-14 w-14 rounded-3xl bg-white shadow-md ring-1 ring-slate-200" />
                    <div className="absolute left-[44%] top-5 h-20 w-20 rounded-[2rem] bg-white shadow-md ring-1 ring-slate-200" />
                    <div className="absolute right-7 top-12 h-16 w-16 rounded-3xl bg-white shadow-md ring-1 ring-slate-200" />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  ["Vehicles", "106", "3 need attention"],
                  ["Fuel Spend", "₹8.4L", "Apr-Nov data"],
                  ["Renewals", "0", "Seed sample needed"],
                ].map(([label, value, sub]) => (
                  <div key={label} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-3 text-3xl font-semibold">{value}</p>
                    <p className="mt-2 text-xs text-slate-400">{sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white p-2 shadow-sm ring-1 ring-slate-200">
              <div className="grid grid-cols-5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span>Vehicle</span><span>Model</span><span>Branch</span><span>Status</span><span>Efficiency</span>
              </div>
              {fleetRows.map((row) => (
                <div key={row[0]} className="grid grid-cols-5 items-center rounded-2xl px-4 py-3 text-sm hover:bg-slate-50">
                  <span className="font-semibold">{row[0]}</span>
                  <span className="text-slate-600">{row[1]}</span>
                  <span className="text-slate-600">{row[2]}</span>
                  <span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{row[3]}</span></span>
                  <span className="text-slate-600">{row[4]}</span>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}

function PrototypeTwo() {
  return (
    <section id="prototype-2" className="min-h-screen bg-[#0b0d10] px-6 py-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Prototype 02</p>
          <h2 className="mt-2 text-3xl font-semibold">Modern Operations Cockpit</h2>
          <p className="mt-1 text-sm text-zinc-400">Darker, denser, premium control-room feel for daily fleet operations.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              ["Live vehicles", "103", "bg-cyan-400"],
              ["In service", "03", "bg-amber-300"],
              ["Pending fuel", "18", "bg-rose-400"],
              ["Branches", "26", "bg-emerald-400"],
            ].map(([label, value, dot]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <div className="flex items-center gap-2"><Dot tone={dot} /><p className="text-xs text-zinc-400">{label}</p></div>
                <p className="mt-4 text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-semibold">Branch fuel pattern</p>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">Apr-Nov 2025</span>
            </div>
            <div className="flex h-64 items-end gap-3">
              {[44, 72, 52, 88, 66, 94, 58, 76, 49, 82, 63, 91].map((height, index) => (
                <div key={index} className="flex flex-1 items-end rounded-full bg-white/5">
                  <div className="w-full rounded-full bg-gradient-to-t from-cyan-400 to-emerald-300" style={{ height: `${height}%` }} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.06] p-3">
            {["Fuel approval overdue", "Vehicle AP31EA7781 service check", "Insurance renewal queue empty"].map((item, index) => (
              <div key={item} className="flex items-center justify-between rounded-3xl px-4 py-4 hover:bg-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-xs font-bold">{index + 1}</div>
                  <p className="text-sm">{item}</p>
                </div>
                <span className="text-zinc-500">›</span>
              </div>
            ))}
          </div>
        </div>

        <PhoneShell dark>
          <div className="p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">Today</p>
                <p className="font-semibold">Fleet Pulse</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-cyan-300" />
            </div>
            <div className="rounded-[1.5rem] bg-white p-5 text-zinc-950">
              <p className="text-sm text-zinc-500">Next action</p>
              <p className="mt-2 text-2xl font-semibold">Approve fuel bills</p>
              <p className="mt-8 text-sm text-zinc-500">18 entries waiting</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[1.25rem] bg-zinc-900 p-4 ring-1 ring-white/10">
                <p className="text-xs text-zinc-500">Cost</p>
                <p className="mt-3 text-xl font-semibold">₹8.4L</p>
              </div>
              <div className="rounded-[1.25rem] bg-zinc-900 p-4 ring-1 ring-white/10">
                <p className="text-xs text-zinc-500">Litres</p>
                <p className="mt-3 text-xl font-semibold">9.8k</p>
              </div>
            </div>
          </div>
        </PhoneShell>
      </div>
    </section>
  );
}

function PrototypeThree() {
  return (
    <section id="prototype-3" className="min-h-screen bg-white px-6 py-8 text-neutral-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-5 border-b border-neutral-200 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Prototype 03</p>
            <h2 className="mt-2 text-3xl font-semibold">Editorial Minimal</h2>
            <p className="mt-1 text-sm text-neutral-500">Clean, report-like, best if leadership wants print-quality clarity.</p>
          </div>
          <button className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white">Create entry</button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <main>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Fleet", "106", "+7 from fuel sheet"],
                ["Branches", "26", "Imported"],
                ["Coverage", "343", "Fuel records"],
              ].map(([label, value, sub]) => (
                <div key={label} className="border-b border-neutral-200 pb-5">
                  <p className="text-sm text-neutral-500">{label}</p>
                  <p className="mt-3 text-5xl font-semibold tracking-tight">{value}</p>
                  <p className="mt-2 text-xs text-neutral-400">{sub}</p>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <div className="mb-3 grid grid-cols-[1.2fr_1fr_1fr_0.8fr] text-xs font-semibold uppercase tracking-wide text-neutral-400">
                <span>Priority</span><span>Module</span><span>Owner</span><span>State</span>
              </div>
              {[
                ["Build document module", "Renewals", "Admin", "Next"],
                ["Create procurement flow", "Lifecycle", "Manager", "Planned"],
                ["Seed demo service data", "Service", "Codex", "Ready"],
                ["Design report exports", "Reports", "Accounts", "Next"],
              ].map((row) => (
                <div key={row[0]} className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr] items-center border-t border-neutral-200 py-5 text-sm">
                  <span className="font-medium">{row[0]}</span>
                  <span className="text-neutral-500">{row[1]}</span>
                  <span className="text-neutral-500">{row[2]}</span>
                  <span><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">{row[3]}</span></span>
                </div>
              ))}
            </div>
          </main>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] bg-[#eef5ff] p-5">
              <p className="text-sm font-semibold text-blue-950">Recommended direction</p>
              <p className="mt-3 text-sm leading-6 text-blue-950/70">
                Use Prototype 01 as the base. It feels premium without becoming flashy, and it keeps dense tables readable.
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-[#f6f1e8] p-5">
              <p className="text-sm font-semibold text-stone-950">Brand note</p>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                Keep Vaibhav maroon and gold as restrained accents, not the entire interface.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default function UiPrototypesPage() {
  return (
    <div className="bg-white">
      <div className="sticky top-0 z-40 border-b border-black/10 bg-white/80 px-6 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-neutral-950">VFM UI Prototypes</p>
          <div className="flex gap-2 text-sm">
            <a className="rounded-full px-3 py-1.5 text-neutral-600 hover:bg-neutral-100" href="#prototype-1">Apple</a>
            <a className="rounded-full px-3 py-1.5 text-neutral-600 hover:bg-neutral-100" href="#prototype-2">Cockpit</a>
            <a className="rounded-full px-3 py-1.5 text-neutral-600 hover:bg-neutral-100" href="#prototype-3">Editorial</a>
          </div>
        </div>
      </div>
      <PrototypeOne />
      <PrototypeTwo />
      <PrototypeThree />
    </div>
  );
}
