import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FILE_RULES, checkFiles, isValidPhone, normalizePhone, safeFileName } from "@/lib/inquiry";
import { publicClient } from "@/lib/supabase-public";

// Limits (5 inquiries per phone per hour, file count) are also enforced in the database.

const index = z.number().int().min(0).max(20);

const submitSchema = z.object({
  lang: z.enum(["fa", "en"]),
  service: index,
  chinaCity: index,
  shippingMode: index,
  volume: index,
  goods: z.string().trim().min(2).max(300),
  name: z.string().trim().min(2).max(120),
  phone: z.string().max(30).refine(isValidPhone),
  note: z.string().trim().max(2000),
  files: z
    .array(z.object({ name: z.string().min(1).max(200), type: z.string().max(100), size: z.number().int() }))
    .max(FILE_RULES.maxFiles)
    .refine((files) => checkFiles(files) === null),
});

export type SubmitInquiryInput = z.infer<typeof submitSchema>;

/** Public: saves a website inquiry and returns its tracking code plus the storage paths for its attachments. */
export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await publicClient().rpc("submit_inquiry", {
      _lang: data.lang,
      _service: data.service,
      _china_city: data.chinaCity,
      _shipping_mode: data.shippingMode,
      _volume: data.volume,
      _goods: data.goods,
      _name: data.name,
      _phone: normalizePhone(data.phone),
      _note: data.note,
      _file_count: data.files.length,
    });
    if (error?.message.includes("rate_limited")) return { ok: false as const, error: "rate" as const };
    const row = rows?.[0];
    if (error || !row) throw new Error("Could not save the inquiry");
    // Files go to <inquiry id>/<n>-<name>; storage only accepts them for this new inquiry.
    const uploads = data.files.map((f, i) => `${row.id}/${i + 1}-${safeFileName(f.name)}`);
    return { ok: true as const, code: row.tracking_code, uploads };
  });

const trackSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^SG-[A-Z0-9]{6}$/),
  phone: z.string().max(30),
});

/** Public: status of one inquiry, only when both the tracking code and the phone number match. */
export const trackInquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => trackSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await publicClient().rpc("track_inquiry", { _code: data.code, _phone: normalizePhone(data.phone) });
    if (error) throw new Error("Could not look up the inquiry");
    const row = rows?.[0];
    if (!row) return { found: false as const };
    return {
      found: true as const,
      code: row.tracking_code,
      status: row.status,
      service: row.service,
      createdAt: row.created_at,
      statusChangedAt: row.status_changed_at,
    };
  });
