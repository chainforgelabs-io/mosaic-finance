import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { captureAPIError } from '@/lib/sentry';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  EMPLOYMENT_DISPLAY_TO_DB,
  FAMILY_DISPLAY_TO_DB,
  PROVINCE_NAME_TO_CODE,
} from '@/lib/config/profile-mappings';
import type { NotificationPreferences } from '@/types';

const NotificationsSchema = z.object({
  plan_ready: z.boolean().optional(),
  weekly_market: z.boolean().optional(),
  quarterly_replan: z.boolean().optional(),
});

const PatchBodySchema = z.object({
  alias: z.string().min(1).max(200).optional(),
  province: z.string().optional(),
  employmentType: z.string().optional(),
  familyStructure: z.string().optional(),
  notifications: NotificationsSchema.optional(),
});

function mapProvinceToDb(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return null;
  const code = PROVINCE_NAME_TO_CODE[trimmed];
  if (!code) {
    throw new Error(`Invalid province: ${display}`);
  }
  return code;
}

function mapEmploymentToDb(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return null;
  const db = EMPLOYMENT_DISPLAY_TO_DB[trimmed];
  if (!db) {
    throw new Error(`Invalid employment type: ${display}`);
  }
  return db;
}

function mapFamilyToDb(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return null;
  const db = FAMILY_DISPLAY_TO_DB[trimmed];
  if (!db) {
    throw new Error(`Invalid family structure: ${display}`);
  }
  return db;
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const parsed = PatchBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.alias !== undefined) {
      update.alias = body.alias;
    }

    if (body.province !== undefined) {
      try {
        update.province = mapProvinceToDb(body.province);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : 'Invalid province' },
          { status: 400 },
        );
      }
    }

    if (body.employmentType !== undefined) {
      try {
        update.employment_type = mapEmploymentToDb(body.employmentType);
      } catch (e) {
        return NextResponse.json(
          {
            error:
              e instanceof Error ? e.message : 'Invalid employment type',
          },
          { status: 400 },
        );
      }
    }

    if (body.familyStructure !== undefined) {
      try {
        update.family_structure = mapFamilyToDb(body.familyStructure);
      } catch (e) {
        return NextResponse.json(
          {
            error:
              e instanceof Error ? e.message : 'Invalid family structure',
          },
          { status: 400 },
        );
      }
    }

    if (body.notifications !== undefined) {
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      const prev =
        (existing?.notification_preferences as Partial<NotificationPreferences> | null) ??
        {};
      const merged: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...prev,
        ...body.notifications,
      };
      update.notification_preferences = merged;
    }

    const keysToWrite = Object.keys(update).filter((k) => k !== 'updated_at');
    if (keysToWrite.length === 0) {
      return NextResponse.json({ ok: true, message: 'No fields to update' });
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(update)
      .eq('id', user.id);

    if (error) {
      captureAPIError(error, { route: 'user/profile', userId: user.id });
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    captureAPIError(error, { route: 'user/profile' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
