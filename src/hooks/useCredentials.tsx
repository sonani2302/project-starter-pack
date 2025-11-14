import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCredentials = () => {
  return useQuery({
    queryKey: ["user-credentials"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_credentials")
        .select("*")
        .maybeSingle();

      if (error) {
        if (error.code === "PGRST116") {
          // No credentials found
          return null;
        }
        throw error;
      }

      return data;
    },
  });
};
