import { OrangeSliceClient } from "@/lib/orange-slice/client";
import type { AudienceFinderResult } from "@/lib/orange-slice/types";

export async function runAudienceFinder(input: {
  icp: string;
  angleHeadline: string;
  product: string;
}): Promise<AudienceFinderResult> {
  const client = OrangeSliceClient.fromEnv();
  return client.findProspects(input);
}
