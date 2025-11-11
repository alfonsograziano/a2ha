import { z } from "zod";

export const team = z.object({
  team: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      description: z.string(),
      channels: z.array(
        z.object({
          type: z.string(),
          contactInfo: z.string(),
          preferred: z.boolean().optional(),
        })
      ),
    })
  ),
});

export type Team = z.infer<typeof team>;
