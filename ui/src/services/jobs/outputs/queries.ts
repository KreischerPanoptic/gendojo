import { useQuery } from "@tanstack/react-query";
import { outputsApi } from "./api";
import { outputsQueryKeys } from "./keys";
import type { OutputsControllerGetOutputsData } from "@api/types.gen";

/**
 * Fetches job outputs (checkpoints + sample previews).
 * Polls every 10s while job is running, stops when disabled.
 *
 * @param jobId    - Job ID
 * @param enabled  - Pass false to suspend polling (e.g. job not started yet)
 * @param interval - Poll interval in ms (default 10s)
 */
export const useJobOutputs = (
  path: OutputsControllerGetOutputsData["path"],
  enabled = true,
  interval = 10_000,
) => {
  return useQuery({
    queryKey: outputsQueryKeys.outputs(path.id),
    queryFn: () => outputsApi.getOutputs(path),
    enabled: enabled && !!path.id,
    refetchInterval: interval,
    staleTime: interval - 500,
    throwOnError: false,
  });
};
