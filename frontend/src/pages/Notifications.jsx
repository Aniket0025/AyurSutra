
import React, { useState, useEffect } from "react";
import { Notification } from "@/services";
import { User } from "@/services";
import { Bell, Check, X, AlertTriangle, Calendar, Edit, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const user = await User.me();
        setMe(user);
        // Patients only see notifications directly addressed to them
        const userNotifications = await Notification.filter({ recipient_id: user.id }, "-created_date", 100);
        // Extra safety: restrict to clinical senders if backend provides role/type info
        const allowedSenderRoles = new Set(["doctor","staff","clinic_staff","therapist","clinic_admin"]);
        const filtered = (userNotifications || []).filter(n => {
          const role = String(n.sender_role || n.senderType || n.role || "").toLowerCase();
          // if sender role known, enforce it, else allow
          return role ? allowedSenderRoles.has(role) : true;
        });
        setNotifications(filtered);
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

  // Super-admin composer and filters removed for patient panel per requirement

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

  // Already constrained server-side by recipient_id; no extra filters needed
  const filteredNotifications = notifications;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500">Messages sent to you by your clinic's doctors and staff</p>
          </div>
        </div>
        {(
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-200 transition-colors"
          >
            <Check className="w-4 h-4" />
            Mark All as Read
          </button>
        )}
      </div>
      {/* Filters and Super Admin composer removed per requirement */}

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
