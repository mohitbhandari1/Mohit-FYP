import { z } from 'zod';

// ─── Helpers ───

export type FieldErrors = Record<string, string>;

/** Collapse a ZodError into { fieldName: firstMessage } for inline form errors. */
export function zodToFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** First human-readable message from a ZodError (for the banner error display). */
export function zodToFirstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Please check the highlighted fields.';
}

// ─── Registration (sign-up) ───

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(80, 'Name must be at most 80 characters.')
      .regex(
        /^[A-Za-z][A-Za-z\s.'-]*$/,
        'Name can only contain letters, spaces, apostrophes, periods and hyphens.'
      ),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required.')
      .email('Please enter a valid email address.')
      .max(254, 'Email is too long.'),
    password: z
      .string()
      .min(1, 'Password is required.')
      .min(6, 'Password must be at least 6 characters.')
      .max(128, 'Password must be at most 128 characters.'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password.'),
    agreeTerms: z.boolean().refine((v) => v === true, {
      message: 'You must agree to the Terms of Service and Privacy Policy.',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords do not match.',
        path: ['confirmPassword'],
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/** 6-digit email verification code */
export const verificationCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Please enter the complete 6-digit code.'),
});

// ─── Organizer / organization application (community creation) ───

export const ORGANIZATION_TYPES = [
  'student_club',
  'ngo',
  'company',
  'individual',
  'other',
] as const;

/** Treat an empty/whitespace-only string as "not provided". */
const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().max(max, `${label} must be at most ${max} characters.`).optional()
  );

export const organizerApplicationSchema = z.object({
  organization_name: z
    .string()
    .trim()
    .min(2, 'Organization name must be at least 2 characters.')
    .max(100, 'Organization name must be at most 100 characters.'),
  organization_type: z.enum(ORGANIZATION_TYPES, {
    message: 'Please select an organization type.',
  }),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters.')
    .max(1000, 'Description must be at most 1000 characters.'),
  reason: z
    .string()
    .trim()
    .min(10, 'Please tell us why you want to be an organizer (min. 10 characters).')
    .max(2000, 'Reason must be at most 2000 characters.'),
  website: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().url('Please enter a valid URL (e.g. https://example.com).').optional()
  ),
  social_media: optionalText(200, 'Social media'),
  experience: optionalText(2000, 'Experience'),
  goals: optionalText(1000, 'Goals'),
  target_audience: optionalText(200, 'Target audience'),
  planned_activities: optionalText(2000, 'Planned activities'),
  location: optionalText(200, 'Location'),
  contact_email: z
    .string()
    .trim()
    .min(1, 'Contact email is required.')
    .email('Please enter a valid contact email address.'),
  contact_phone: z
    .string()
    .trim()
    .min(1, 'Contact phone is required.')
    .refine((v) => {
      const digits = v.replace(/\D/g, '');
      const local = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
      return local.length === 10;
    }, 'Contact phone must be exactly 10 digits (e.g. 9876543210).'),
});

export type OrganizerApplicationInput = z.infer<typeof organizerApplicationSchema>;

// ─── File validation (backend multer limit is 3 MB) ───

export const MAX_APPLICATION_FILE_SIZE = 3 * 1024 * 1024; // must match backend limit

export function validateApplicationFile(
  file: File,
  allowedExtensions: readonly string[]
): string | null {
  if (file.size > MAX_APPLICATION_FILE_SIZE) {
    return 'File must be smaller than 3 MB.';
  }
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (!allowedExtensions.includes(ext)) {
    return `Unsupported file type. Allowed: ${allowedExtensions.map((e) => `.${e}`).join(', ')}.`;
  }
  return null;
}

export const CERTIFICATE_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;
export const LOGO_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'svg'] as const;
