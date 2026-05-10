import React, { useEffect, useMemo, useState } from "react";
import { Bell, Sparkles, AlertCircle, ShoppingBag, Check, CreditCard } from "lucide-react";
import { notificationService } from "../../services/notificationService";
import { useSelector } from "react-redux";

const TYPE_META = {
  system: { icon: Sparkles, color: "text-primaryColor", bg: "bg-primaryColor/10" },
  order: { icon: ShoppingBag, color: "text-primaryColor", bg: "bg-primaryColor/10" },
  payment: { icon: CreditCard, color: "text-primaryColor", bg: "bg-primaryColor/10" },
  alert: { icon: AlertCircle, color: "text-primaryColor", bg: "bg-primaryColor/10" },
  default: { icon: Bell, color: "text-primaryColor", bg: "bg-black" },
};

const NotificationsPage = () => {
  const user = useSelector((state) => state.auth.user);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setError(null);
        const data = await notificationService.getNotifications(user?.email);
        setNotifications(Array.isArray(data) ? data : []);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
        setError("Could not load notifications from notification service.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const mappedNotifications = useMemo(
    () =>
      notifications.map((notif, index) => {
        const messageText = `${notif.desc || ""} ${notif.message || ""}`.toLowerCase();
        const inferredType = messageText.includes("email")
          ? "system"
          : messageText.includes("order")
            ? "order"
            : messageText.includes("alert")
              ? "alert"
              : "default";
        const type = notif.type || inferredType;
        const meta = TYPE_META[type] || TYPE_META.default;
        return {
          id: notif.id ?? `notification-${index}`,
          title: notif.title || "Notification",
          desc: notif.desc || notif.message || "No details provided.",
          time: notif.time || "Recently",
          unread: notif.unread ?? true,
          ...meta,
        };
      }),
    [notifications]
  );

  return (
    <div className="min-h-screen bg-black p-paddingLarge">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-marginLarge border-b border-borderColor pb-paddingMedium">
          <div>
            <h1 className="text-3xl font-fontWeightBold text-textColorMain flex items-center gap-2">
              <Bell className="text-primaryColor" size={32} />
              Notifications
            </h1>
            <p className="text-textColorMuted mt-1">Stay updated with the latest alerts and activities.</p>
          </div>
          <button className="text-fontSizeSm text-primaryColor font-fontWeightMedium hover:underline flex items-center gap-1">
            <Check size={16} /> Mark all as read
          </button>
        </div>
        <p className="text-xs text-textColorMuted mb-4">
          {lastUpdated
            ? `Last synced: ${lastUpdated.toLocaleTimeString()}`
            : "Waiting for first sync..."}
        </p>

        <div className="space-y-4">
          {loading && (
            <div className="text-center py-12 text-textColorMuted">Loading notifications...</div>
          )}

          {!loading && error && (
            <div className="text-center py-12 text-primaryColor">{error}</div>
          )}

          {!loading && !error && mappedNotifications.map((notif) => {
            const Icon = notif.icon;
            return (
              <div 
                key={notif.id} 
                className={`flex gap-4 p-paddingLarge rounded-borderRadiusLg border transition-all duration-300 hover:shadow-md
                  ${notif.unread ? "bg-black border-primaryColor/30 shadow-primaryColor/5" : "bg-black border-borderColor"}
                `}
              >
                <div className={`mt-1 shrink-0 w-12 h-12 rounded-borderRadiusFull flex items-center justify-center ${notif.bg}`}>
                  <Icon className={notif.color} size={24} />
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                    <h3 className={`text-fontSizeLg font-fontWeightBold ${notif.unread ? "text-textColorMain" : "text-textColorMuted"}`}>
                      {notif.title}
                    </h3>
                    <span className="text-fontSizeXs font-fontWeightMedium text-textColorMuted">{notif.time}</span>
                  </div>
                  <p className="text-textColorMuted text-fontSizeSm leading-relaxed">{notif.desc}</p>
                </div>

                {notif.unread && (
                  <div className="shrink-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primaryColor shadow-[0_0_8px_rgba(var(--primaryColorRgb),0.6)]"></div>
                  </div>
                )}
              </div>
            );
          })}
          
          {!loading && !error && mappedNotifications.length === 0 && (
             <div className="text-center py-20 text-textColorMuted">
                 <Bell size={48} className="mx-auto mb-4 opacity-50" />
                 <p className="text-lg">You're all caught up!</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
