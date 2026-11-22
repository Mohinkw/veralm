import Link from "next/link";

export const metadata = {
  title: "Revenue Management | VeraLM Admin",
};

const monthlyRevenue = [
  { month: "Nov 2026", gross: 12400, infraCost: 1400, net: 11000, platformMargin: 1100, creatorPool: 9900, status: "pending" },
  { month: "Oct 2026", gross: 10800, infraCost: 1200, net: 9600, platformMargin: 960, creatorPool: 8640, status: "paid" },
  { month: "Sep 2026", gross: 8900, infraCost: 950, net: 7950, platformMargin: 795, creatorPool: 7155, status: "paid" },
  { month: "Aug 2026", gross: 6200, infraCost: 700, net: 5500, platformMargin: 550, creatorPool: 4950, status: "paid" },
];

export default function AdminRevenuePage() {
  const totalGross = monthlyRevenue.reduce((s, r) => s + r.gross, 0);
  const totalInfra = monthlyRevenue.reduce((s, r) => s + r.infraCost, 0);
  const totalCreatorPool = monthlyRevenue.reduce((s, r) => s + r.creatorPool, 0);
  const totalPlatformMargin = monthlyRevenue.reduce((s, r) => s + r.platformMargin, 0);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/admin" className="hover:text-white">Admin</Link>
          <span>›</span>
          <span className="text-white">Revenue Management</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Revenue Management</h1>
            <p className="text-gray-400 mt-1">Monthly distribution history and pending payouts</p>
          </div>
          <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Run Distribution (Nov 2026)
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Gross Revenue", value: `$${totalGross.toLocaleString()}`, color: "text-blue-400" },
            {
              label: "AI & Server Costs",
              value: `$${totalInfra.toLocaleString()}`,
              color: "text-yellow-400",
            },
            {
              label: "Creator Royalty Pool (Up to 90%)",
              value: `$${totalCreatorPool.toLocaleString()}`,
              color: "text-green-400",
            },
            {
              label: "Platform Margin (10%)",
              value: `$${totalPlatformMargin.toLocaleString()}`,
              color: "text-purple-400",
            },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Revenue entry form */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Record Platform Revenue</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Month</label>
              <input
                type="month"
                defaultValue="2026-11"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Subscription Revenue</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Ad Revenue</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex items-end">
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium">
                Save Entry
              </button>
            </div>
          </div>
        </div>

        {/* Monthly table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                {["Month", "Gross Revenue", "AI & Server Costs", "Net Pool", "Creator Pool (90%)", "Platform (10%)", "Status"].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {monthlyRevenue.map((r) => (
                <tr key={r.month} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-white">{r.month}</td>
                  <td className="px-4 py-3 text-blue-400">${r.gross.toLocaleString()}</td>
                  <td className="px-4 py-3 text-yellow-400">${r.infraCost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300">${r.net.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-400">${r.creatorPool.toLocaleString()}</td>
                  <td className="px-4 py-3 text-purple-400">${r.platformMargin.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        r.status === "paid"
                          ? "bg-green-900/50 text-green-300"
                          : "bg-yellow-900/50 text-yellow-300"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
