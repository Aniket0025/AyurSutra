import { useEffect, useMemo, useState } from 'react';
import { SuperAdmin } from "@/services";
import { Building, IndianRupee, BarChart3, Star, RefreshCcw } from "lucide-react";
import PropTypes from 'prop-types';

export default function Dashboard({ currentUser }) {
  const isSuper = currentUser?.role === 'super_admin';

  // Super admin state
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState({ items: [], total: 0, page: 1, limit: 10 });
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [finance, setFinance] = useState({ income: 0, expense: 0, net: 0, items: [], total: 0 });

  useEffect(() => {
    if (!isSuper) return;
    const run = async () => {
      setLoading(true);
      try {
        const data = await SuperAdmin.listClinics({ page: 1, limit: 10 });
        setClinics(data);
        const first = data?.items?.[0];
        if (first) setSelectedClinic(first);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }

Dashboard.propTypes = {
  currentUser: PropTypes.object
};
    };
    run();
  }, [isSuper]);

  useEffect(() => {
    if (!isSuper || !selectedClinic) return;
    const run = async () => {
      setLoading(true);
      try {
        const fid = selectedClinic._id || selectedClinic.id;
        const data = await SuperAdmin.getClinicFinances(fid, { page: 1, limit: 10 });
        setFinance(data || { income: 0, expense: 0, net: 0, items: [] });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isSuper, selectedClinic]);

  const kpis = useMemo(() => {
    if (!isSuper) return [];
    const items = clinics?.items || [];
    const hospitals = clinics?.total || items.length;
    const revenue = items.reduce((s, c) => s + (c.totalRevenue || 0), 0);
    const net = items.reduce((s, c) => s + ((c.totalRevenue || 0) - (c.totalExpenses || 0)), 0);
    const ratings = items.map(i => i.avgRating).filter(n => typeof n === 'number');
    const avgRating = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length) : 0;
    return [
      { title: 'Hospitals', value: hospitals.toLocaleString(), icon: Building },
      { title: 'Revenue (sum)', value: `₹${revenue.toLocaleString()}`, icon: IndianRupee },
      { title: 'Net (sum)', value: `₹${net.toLocaleString()}`, icon: BarChart3 },
      { title: 'Avg Rating', value: avgRating.toFixed(2), icon: Star },
    ];
  }, [isSuper, clinics]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome{currentUser?.full_name ? `, ${currentUser.full_name}` : ''}</h1>
          <p className="text-gray-500">This is your AyurSutra Dashboard. No redirects, fully local.</p>
        </div>
        {isSuper && (
          <button
            onClick={() => {
              if (clinics?.page) {
                (async () => {
                  setLoading(true);
                  try {
                    const data = await SuperAdmin.listClinics({ page: clinics.page, limit: clinics.limit || 10 });
                    setClinics(data);
                    const cur = data.items?.find(i => (i._id||i.id) === (selectedClinic?._id||selectedClinic?.id));
                    if (cur) setSelectedClinic(cur);
                  } finally { setLoading(false); }
                })();
              }
            }}
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Quick Links</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>Use the top navigation to access Patients, Scheduling, Hospitals, etc.</li>
            <li>Data is stored locally in your browser for this build.</li>
          </ul>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Status</h2>
          <p className="text-sm text-gray-600">{loading ? 'Loading...' : 'Working perfectly.'}</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">User</h2>
          <p className="text-sm text-gray-600">Role: <span className="font-medium">{currentUser?.role || 'guest'}</span></p>
        </div>
      </div>

      {isSuper && (
        <>
          {/* KPIs */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={i} className="rounded-2xl p-4 bg-gradient-to-br from-gray-700 to-gray-900 shadow text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">{k.title}</p>
                    <p className="text-2xl font-semibold">{k.value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <k.icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Clinics and Finance summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Clinics</h2>
                <span className="text-sm text-gray-500">Total: {clinics.total}</span>
              </div>
              <div className="divide-y">
                {(clinics.items||[]).map((c) => (
                  <div key={c._id || c.id} className={`py-3 flex items-center justify-between ${selectedClinic && (selectedClinic._id||selectedClinic.id)===(c._id||c.id)?'bg-blue-50 rounded-lg px-2':''}`}>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-gray-500">Revenue ₹{(c.totalRevenue||0).toLocaleString()} | Net ₹{((c.totalRevenue||0)-(c.totalExpenses||0)).toLocaleString()} | Patients {c.totalPatients} | Doctors {c.totalDoctors} | Rating {c.avgRating ?? '-'}</p>
                    </div>
                    <button className="text-sm px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200" onClick={() => setSelectedClinic(c)}>Select</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <h2 className="font-semibold mb-2">Finance Summary</h2>
              {selectedClinic ? (
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Clinic:</span> {selectedClinic.name}</p>
                  <p><span className="text-gray-500">Income:</span> ₹{(finance.income||0).toLocaleString()}</p>
                  <p><span className="text-gray-500">Expense:</span> ₹{(finance.expense||0).toLocaleString()}</p>
                  <p><span className="text-gray-500">Net:</span> ₹{(finance.net||0).toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Select a clinic to view finance summary.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}