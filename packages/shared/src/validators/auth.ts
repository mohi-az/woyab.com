import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const avatarUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || value.startsWith("/") || z.string().url().safeParse(value).success, "Invalid avatar URL");
const password = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const credentialsSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  avatarUrl: avatarUrl.optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const passwordResetRequestSchema = z.object({
  email: email.optional().or(z.literal("")),
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().trim().min(32).max(256),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const savedLocationSchema = z.object({
  label: z.string().trim().min(1).max(40),
  icon: z.enum(["HOME", "WORK", "FAVORITE", "OTHER"]).default("OTHER"),
  address: z.string().trim().min(3).max(300),
  cityName: z.string().trim().max(100).optional().or(z.literal("")),
  districtName: z.string().trim().max(100).optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  isDefault: z.boolean().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type SavedLocationInput = z.infer<typeof savedLocationSchema>;
