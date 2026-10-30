"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationPayload } from "@/types/database";

type GiftAlert = {
  id: string;
  payload: NotificationPayload;
};

export function OverlayClient({ creatorId }: { creatorId: string }) {
  const [alerts, setAlerts] = useState<GiftAlert[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`overlay-${creatorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `creator_id=eq.${creatorId}`,
        },
        (payload) => {
          const data = payload.new as { id: string; payload: NotificationPayload };
          setAlerts((prev) => [...prev, { id: data.id, payload: data.payload }]);

          // Auto-remove after 6 seconds
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.id !== data.id));
          }, 6000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [creatorId]);

  return (
    <div
      style={{
        background: "transparent",
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="animate-bounce-in"
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "16px",
            marginBottom: "12px",
            textAlign: "center",
            boxShadow: "0 8px 32px rgba(249, 115, 22, 0.4)",
            animation: "slideIn 0.5s ease-out",
            maxWidth: "600px",
          }}
        >
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>
            {alert.payload.fan_name} sent a {alert.payload.food_name}!
          </div>
          {alert.payload.message && (
            <div style={{ fontSize: "16px", opacity: 0.9, marginTop: "4px" }}>
              &ldquo;{alert.payload.message}&rdquo;
            </div>
          )}
          <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
            {alert.payload.restaurant_name}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-30px) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
