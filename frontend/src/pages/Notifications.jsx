
import React, { useState, useEffect } from "react";
import { Notification, Hospital } from "@/services";
import { User } from "@/services";
import { Bell, Check, X, AlertTriangle, Calendar, Edit, Shield, Send, Filter, Search, Building2 } from "lucide-react";
import { formatDistanceToNow, isWithinInterval } from "date-fns";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [me, setMe] = useState(null);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all|unread|read
  const [filterClinic, setFilterClinic] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clinics, setClinics] = useState([]);

  // compose (super admin)
  const [compose, setCompose] = useState({
    title: "",
    message: "",
    type: "general",
    priority: "normal", // normal|high
    clinicIds: [],
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const user = await User.me();
        setMe(user);
        if (user.role === 'super_admin') {
          // preload clinics for targeting
          const list = await Hospital.list();
          setClinics(list);
          // load sent notifications (best-effort; depends on backend support)
          const sent = await Notification.filter({ sender_id: user.id }, "-created_date", 100).catch(() => []);
          setNotifications(sent || []);
        } else {
          const userNotifications = await Notification.filter({ recipient_id: user.id }, "-created_date", 50);
          setNotifications(userNotifications);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
      setIsLoading(false);
    })();
  }, []);

  const markAsRead = async (id) => {
    try {
      await Notification.update(id, { is_read: true });
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const toggleClinicInCompose = (id) => {
    setCompose((c) => {
      const exists = c.clinicIds.includes(id);
      const clinicIds = exists ? c.clinicIds.filter(x => x !== id) : [...c.clinicIds, id];
      return { ...c, clinicIds };
    });
  };

  const sendNotifications = async () => {
    if (!compose.title.trim() || !compose.message.trim()) {
      window.showNotification?.({ type: 'error', title: 'Missing fields', message: 'Title and message are required.' });
      return;
    }
    if (!compose.clinicIds.length) {
      window.showNotification?.({ type: 'error', title: 'No clinics selected', message: 'Pick at least one clinic.' });
      return;
    }
    try {
      setSending(true);
      // One message per clinic to target its clinic_admins (server implementation-dependent)
      await Promise.all(
        compose.clinicIds.map((hospital_id) =>
          Notification.create({
            title: compose.title,
            message: compose.message,
            type: compose.type,
            priority: compose.priority,
            audience: 'clinic_admin',
            hospital_id,
          })
        )
      );
      window.showNotification?.({ type: 'success', title: 'Sent', message: 'Notifications sent.' });
      // refresh sent list for super admin
      if (me?.role === 'super_admin') {
        const sent = await Notification.filter({ sender_id: me.id }, "-created_date", 100).catch(() => []);
        setNotifications(sent || []);
      }
      setCompose({ title: '', message: '', type: 'general', priority: 'normal', clinicIds: [] });
    } catch (err) {
      console.error(err);
      window.showNotification?.({ type: 'error', title: 'Failed to send', message: err?.details?.message || err.message || 'Could not send notifications' });
    } finally {
      setSending(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);
      
      // This is a simplification. In a real scenario, a `bulkUpdate` method would be ideal.
      // For now, we update one by one.
      await Promise.all(unreadIds.map(id => Notification.update(id, { is_read: true })));

      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "pre_therapy":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "post_therapy":
        return <Check className="w-5 h-5 text-green-500" />;
      case "schedule_change":
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case "feedback_request":
        return <Edit className="w-5 h-5 text-purple-500" />;
      case "guardian_assignment":
        return <Shield className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    // tab basics (kept for non-super usage)
    if (activeTab === "unread" || filterStatus === 'unread') {
      if (n.is_read) return false;
    } else if (filterStatus === 'read') {
      if (!n.is_read) return false;
    }
    if (activeTab === "alerts") {
      if (!["pre_therapy", "schedule_change"].includes(n.type)) return false;
    }
    // rich filters
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterClinic !== 'all' && String(n.hospital_id || n.clinic_id) !== String(filterClinic)) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
      if (!text.includes(s)) return false;
    }
    if (dateFrom || dateTo) {
      const d = new Date(n.created_date || n.createdAt || n.date);
      const from = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
      const to = dateTo ? new Date(dateTo) : new Date('2999-12-31');
      if (!isWithinInterval(d, { start: from, end: to })) return false;
    }
    return true;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications Hub</h1>
            <p className="text-gray-500">{me?.role === 'super_admin' ? 'Create and send announcements to clinics' : 'All your alerts and reminders in one place'}</p>
          </div>
        </div>
        {me?.role !== 'super_admin' && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-200 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Super Admin Composer */}
      {me?.role === 'super_admin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4 text-gray-700 font-semibold">
            <Send className="w-4 h-4" /> Compose Notification
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <input value={compose.title} onChange={(e)=>setCompose(c=>({...c, title:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-4 py-3" placeholder="Title" />
            </div>
            <select value={compose.type} onChange={(e)=>setCompose(c=>({...c, type:e.target.value}))} className="border border-gray-200 rounded-xl px-4 py-3">
              <option value="general">General</option>
              <option value="schedule_change">Schedule Change</option>
              <option value="pre_therapy">Pre-Therapy</option>
              <option value="post_therapy">Post-Therapy</option>
            </select>
          </div>
          <textarea value={compose.message} onChange={(e)=>setCompose(c=>({...c, message:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4" rows={4} placeholder="Write your message..." />

          {/* Clinic multi-select */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600"><Building2 className="w-4 h-4" /> Select Clinics</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-36 overflow-auto">
              {clinics.map((c)=>{
                const id = c.id || c._id;
                const checked = compose.clinicIds.includes(id);
                return (
                  <label key={id} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                    <input type="checkbox" className="accent-blue-600" checked={checked} onChange={()=>toggleClinicInCompose(id)} />
                    <span className="text-sm text-gray-700 truncate">{c.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <select value={compose.priority} onChange={(e)=>setCompose(c=>({...c, priority:e.target.value}))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="normal">Priority: Normal</option>
              <option value="high">Priority: High</option>
            </select>
            <button disabled={sending} onClick={sendNotifications} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all disabled:opacity-60">
              <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Filters row */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Search title or message..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <select value={filterType} onChange={(e)=>setFilterType(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5">
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="schedule_change">Schedule Change</option>
            <option value="pre_therapy">Pre-Therapy</option>
            <option value="post_therapy">Post-Therapy</option>
          </select>
          <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5">
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <select value={filterClinic} onChange={(e)=>setFilterClinic(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5">
            <option value="all">All Clinics</option>
            {clinics.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5" />
          <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5" />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl p-6 animate-pulse h-24"></div>
          ))
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`p-6 rounded-2xl transition-all duration-300 flex items-start gap-4 ${
                n.is_read ? "bg-gray-50" : "bg-blue-50 border border-blue-200"
              }`}
            >
              {!n.is_read && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
              )}
              <div className="flex-shrink-0">{getIconForType(n.type)}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">{n.title}</h3>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-600 mt-1">{n.message}</p>
                {(n.hospital_id || n.clinic_id) && (
                  <div className="text-xs text-gray-400 mt-1">Clinic: {String(n.hospital_id || n.clinic_id)}</div>
                )}
              </div>
              {me?.role !== 'super_admin' && !n.is_read && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500">No notifications</h3>
            <p className="text-gray-400">{me?.role === 'super_admin' ? 'Send your first announcement using the composer above.' : "You're all caught up!"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
