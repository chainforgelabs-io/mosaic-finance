"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/schemas/auth";
import { PROVINCE_CODE_MAP } from "@/lib/constants/provinces";

const profileInsertSchema = signUpSchema.pick({ alias: true, province: true });

export type AuthResult = {
  error?: string;
  redirectTo?: string;
};

/**
 * Inserts the user_profiles row after client-side `auth.signUp()`.
 * Requires an authenticated session (cookies) so RLS allows the insert.
 */
export async function insertUserProfileAfterSignUp(formData: {
  alias: string;
  province: string;
}): Promise<AuthResult> {
  const parsed = profileInsertSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Not signed in. If email confirmation is required, confirm your email first, then sign in to finish setup.",
    };
  }

  const { error: profileError } = await supabase.from("user_profiles").insert({
    id: user.id,
    alias: parsed.data.alias,
    province: PROVINCE_CODE_MAP[parsed.data.province] ?? parsed.data.province,
    subscription_tier: "snapshot",
  });

  if (profileError) {
    return { error: "Account created but profile setup failed. Please sign in." };
  }

  return { redirectTo: "/onboarding" };
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: "Failed to initiate Google sign in" };
}

export async function resetPassword(formData: {
  email: string;
}): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    },
  );

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function updatePassword(formData: {
  password: string;
  confirmPassword: string;
}): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { redirectTo: "/dashboard" };
}
