"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/schemas/auth";
import { getOnboardingProgress } from "@/lib/actions/onboarding";
import { PROVINCE_CODE_MAP } from "@/lib/constants/provinces";

export type AuthResult = {
  error?: string;
  redirectTo?: string;
};

export async function signUp(formData: {
  email: string;
  password: string;
  alias: string;
  province: string;
}): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        alias: parsed.data.alias,
        province: parsed.data.province,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (authData.user) {
    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: authData.user.id,
      alias: parsed.data.alias,
      province: PROVINCE_CODE_MAP[parsed.data.province] ?? parsed.data.province,
      subscription_tier: "snapshot",
    });

    if (profileError) {
      return { error: "Account created but profile setup failed. Please sign in." };
    }
  }

  return { redirectTo: "/onboarding" };
}

const SAFE_REDIRECT_PREFIXES = ["/dashboard", "/onboarding", "/admin"];

export async function signIn(formData: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (authError) {
    return { error: authError.message };
  }

  const explicit = formData.redirectTo;
  if (
    explicit &&
    SAFE_REDIRECT_PREFIXES.some((p) => explicit.startsWith(p))
  ) {
    return { redirectTo: explicit };
  }

  const progress = await getOnboardingProgress();
  return { redirectTo: progress.redirectPath };
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
