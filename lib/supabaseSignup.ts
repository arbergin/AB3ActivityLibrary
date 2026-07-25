"use client";

import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type SignUpResult = {
  user: User;
  requiresEmailConfirmation: boolean;
};

export async function signUpForAB3({ firstName, lastName, email, password }: SignUpInput): Promise<SignUpResult> {
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const emailRedirectTo = typeof window === "undefined"
    ? undefined
    : `${window.location.origin}/login?confirmed=1&next=/subscribe`;

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo,
      data: {
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        full_name: `${normalizedFirstName} ${normalizedLastName}`.trim(),
      },
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Supabase did not return a user after signup.");

  if (data.session) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ first_name: normalizedFirstName, last_name: normalizedLastName })
      .eq("id", data.user.id);

    if (profileError) {
      console.warn("Signup succeeded, but profile name fields were not updated.", profileError.message);
    }
  }

  return { user: data.user, requiresEmailConfirmation: !data.session };
}

export async function getCurrentAB3User() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user;
}
