import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { captureAPIError } from '@/lib/sentry';
import { PROVINCES } from '@/lib/constants/provinces';
import { sendWaitlistWelcomeEmail } from '@/lib/resend/client';

const WaitlistSchema = z.object({
  email: z.string().email().max(320),
  province: z.string().max(100).optional().nullable(),
  source: z.string().max(64).optional().nullable(),
});

const provinceSet = new Set<string>([...PROVINCES]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = WaitlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const rawProvince = parsed.data.province?.trim();
    const province =
      rawProvince && rawProvince.length > 0 ? rawProvince : null;

    if (province && !provinceSet.has(province)) {
      return NextResponse.json({ error: 'Invalid province' }, { status: 400 });
    }

    const source = parsed.data.source?.trim().slice(0, 64) || null;

    const supabase = await createClient();
    const { error } = await supabase.from('waitlist_signups').insert({
      email,
      province,
      source,
    });

    if (error) {
      // Unique violation — email already on waitlist
      if (error.code === '23505') {
        return NextResponse.json({
          success: true,
          alreadySignedUp: true,
        });
      }
      captureAPIError(error, { route: 'waitlist', step: 'insert' });
      return NextResponse.json(
        { error: 'Could not join waitlist. Please try again.' },
        { status: 500 },
      );
    }

    sendWaitlistWelcomeEmail(email).catch((err) =>
      captureAPIError(err, { route: 'waitlist', step: 'welcome-email' }),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    captureAPIError(err, { route: 'waitlist' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
