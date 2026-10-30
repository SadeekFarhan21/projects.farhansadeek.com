"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { NotificationPayload } from "@/types/database";

export function GiftNotificationListener({ creatorId }: { creatorId: string }) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`creator-notifications-${creatorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `creator_id=eq.${creatorId}`,
        },
        (payload) => {
          const data = payload.new as { payload: NotificationPayload };
          const p = data.payload;
          toast(
            `${p.fan_name} sent you a ${p.food_name}!`,
            {
              description: p.message || `From ${p.restaurant_name}`,
              duration: 8000,
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [creatorId]);

  return null;
}
