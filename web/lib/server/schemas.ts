import { z } from "zod";
import { APPLICATION_STATUSES } from "../types";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const PortalCreate = z
  .object({
    name: z.string().trim().min(1).max(100),
    adapter_type: z.string().trim().min(1).max(50),
    enabled: z.boolean().default(true),
    query: z.string().trim().max(200).default(""),
    location: optionalText(100),
    industry: optionalText(100),
    extra: z.record(z.string().max(2000)).default({}),
    fetch_details: z.boolean().nullable().optional(),
  })
  .strict();

export const PortalPatch = PortalCreate.omit({ adapter_type: true }).partial().strict();

export const ApplicationCreate = z
  .object({
    job_id: z.string(),
    status: z.enum(APPLICATION_STATUSES).default("applied"),
    resume_version: optionalText(200),
    cover_letter: optionalText(20_000),
    notes: optionalText(10_000),
  })
  .strict();

export const ApplicationPatch = ApplicationCreate.omit({ job_id: true }).partial().strict();

export const ProfileSchema = z
  .object({
    full_name: optionalText(200),
    target_titles: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
    skills: z.array(z.string().trim().min(1).max(100)).max(200).default([]),
    locations: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
    resume_text: optionalText(50_000),
    min_salary: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();
