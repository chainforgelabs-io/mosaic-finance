"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signUpSchema, signInSchema } from "@/lib/schemas/auth";

export type AuthResult = {
  error?: string;
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
      email: parsed.data.email,
      alias: parsed.data.alias,
      province: parsed.data.province,
      tier: "free",
      onboarding_completed: false,
    });

    if (profileError) {
      return { error: "Account created but profile setup failed. Please sign in." };
    }
  }

  redirect("/onboarding");
}

export async function signIn(formData: {
  email: string;
  password: string;
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

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_completed) {
      redirect("/dashboard");
    }
  }

  redirect("/onboarding");
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
