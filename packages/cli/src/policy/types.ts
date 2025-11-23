import { z } from "zod";

export const PolicySchema = z.object({
  version: z.number().default(1),
  licenses: z
    .object({
      allow: z.array(z.string()).optional(),
      warn: z.array(z.string()).optional(),
      deny: z.array(z.string()).optional(),
      unknown_action: z.enum(["allow", "deny", "warn"]).default("warn"),
    })
    .optional(),
  components: z
    .object({
      exclude: z.array(z.string()).optional(),
    })
    .optional(),
});

export type Policy = z.infer<typeof PolicySchema>;
