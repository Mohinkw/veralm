import Link from "next/link";

export const metadata = {
  title: "Creator Management | VeraLM Admin",
};

const creators = [
  {
    id: "c1",
    name: "Alex Rivers",
    email: "alex@example.com",
    specialty: "Database Engineering",
    articles: 7,
    totalEarned: 1240.5,
    status: "active",
    joined: "2026-08-01",
    stripeConnected: true,
  },
  {
    id: "c2",
    name: "Priya Sharma",
    email: "priya@example.com",
    specialty: "Machine Learning",
    articles: 4,
    totalEarned: 820.0,
    status: "active",
    joined: "2026-09-10",
    stripeConnected: true,
  },
  {
    id: "c3",
    name: "James Wu",
    email: "james@example.com",
    specialty: "LLM Systems",
    articles: 2,
    totalEarned: 310.0,
    status: "pending",
    joined: "2026-11-01",
    stripeConnected: false,
  },
  {
    id: "c4",
    name: "Maria Santos",
    email: "maria@example.com",
    specialty: "Cybersecurity",
    articles: 5,
    totalEarned: 980.0,
    status: "active",
    joined: "2026-07-15",
    stripeConnected: true,
  },
];

const statusColors: Record<string, string> = {
  active: "bg-green-900/50 text-green-300",
  pending: "bg-yellow-900/50 text-yellow-300",
  suspended: "bg-red-900/50 text-red-300",
};

export default function AdminCreatorsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/admin" className="hover:text-white">Admin</Link>
          <span>›</span>
          <span className="text-white">Creator Management</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Creator Management</h1>
            <p className="text-gray-400 mt-1">{creators.length} registered creators</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Creators", value: creators.length },
            { label: "Active", value: creators.filter((c) => c.status === "active").length },
            { label: "Stripe Connected", value: creators.filter((c) => c.stripeConnected).length },
            {
              label: "Total Paid Out",
              value: `$${creators.reduce((s, c) => s + c.totalEarned, 0).toFixed(0)}`,
            },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                {["Creator", "Specialty", "Articles", "Total Earned", "Stripe", "Status", "Actions"].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {creators.map((c) => (
                <tr key={c.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{c.specialty}</td>
                  <td className="px-4 py-3 text-gray-300">{c.articles}</td>
                  <td className="px-4 py-3 text-green-400">${c.totalEarned.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {c.stripeConnected ? (
                      <span className="text-green-400 text-xs">✓ Connected</span>
                    ) : (
                      <span className="text-yellow-400 text-xs">⚠ Not connected</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        statusColors[c.status] || "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="text-xs text-blue-400 hover:underline">View</button>
                      <button className="text-xs text-yellow-400 hover:underline">Suspend</button>
                    </div>
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
