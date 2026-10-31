import { useQuery } from "@tanstack/react-query";
import { getHistory } from "@/services/dataProvider";

export function useHistory(symbol) {
  return useQuery({ queryKey: ["history", symbol], queryFn: () => getHistory(symbol), staleTime: Infinity, enabled: Boolean(symbol) });
}
