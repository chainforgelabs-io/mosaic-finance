import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const SLUG = /^[a-z][a-z0-9_]{0,39}$/;

const rowSchema = z.object({
  slug: z.string().regex(SLUG),
  label: z.string().trim().min(1).max(60),
  kind: z.enum(["income", "expense", "savings"]),
  is_need: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
  archived: z.boolean().optional(),
});

const postSchema = z.object({
  categories: z.array(rowSchema).min(1).max(100),
});

const patchSchema = z.object({
  slug: z.string().regex(SLUG),
  label: z.string().trim().min(1).max(60).optional(),
  kind: z.enum(["income", "expense", "savings"]).optional(),
  is_need: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10_000).optional(),
  archived: z.boolean().optional(),
});

const SELECT = "slug, label, kind, is_need, sort_order, archived";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_categories")
    .select(SELECT)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}

/** Upsert one or more catalog rows. Used to add custom categories and to migrate saved local ones. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const rows = parsed.data.categories.map((row) => ({
    user_id: user.id,
    slug: row.slug,
    label: row.label,
    kind: row.kind,
    is_need: row.is_need ?? false,
    sort_order: row.sort_order ?? 0,
    archived: row.archived ?? false,
  }));

  const { data, error } = await supabase
    .from("user_categories")
    .upsert(rows, { onConflict: "user_id,slug" })
    .select(SELECT);

  if (error) return NextResponse.json({ error: "Failed to save categories" }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] }, { status: 201 });
}

/** Rename, re-kind, archive, or restore one category. Creates the row for a built-in slug when needed. */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { slug, ...updates } = parsed.data;
  const { data: existing } = await supabase
    .from("user_categories")
    .select(SELECT)
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("user_categories")
      .update(updates)
      .eq("user_id", user.id)
      .eq("slug", slug)
      .select(SELECT)
      .single();
    if (error || !data) return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
    return NextResponse.json({ category: data });
  }

  if (!updates.label || !updates.kind) {
    return NextResponse.json({ error: "A new category needs a label and a kind" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_categories")
    .insert({
      user_id: user.id,
      slug,
      label: updates.label,
      kind: updates.kind,
      is_need: updates.is_need ?? false,
      sort_order: updates.sort_order ?? 0,
      archived: updates.archived ?? false,
    })
    .select(SELECT)
    .single();

  if (error || !data) return NextResponse.json({ error: "Failed to save category" }, { status: 500 });
  return NextResponse.json({ category: data }, { status: 201 });
}
