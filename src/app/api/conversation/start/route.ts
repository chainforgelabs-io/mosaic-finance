import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ConversationStartSchema } from '@/lib/validators/conversation';
import { captureAPIError } from '@/lib/sentry';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = ConversationStartSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { sessionType } = parsed.data;

    const { data: existingSession } = await supabase
      .from('conversation_sessions')
      .select('id, last_activity_at')
      .eq('user_id', user.id)
      .eq('session_type', sessionType)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession) {
      const lastActivity = new Date(existingSession.last_activity_at).getTime();
      const hoursSinceActivity =
        (Date.now() - lastActivity) / (1000 * 60 * 60);

      if (hoursSinceActivity < 48) {
        return NextResponse.json({
          sessionId: existingSession.id,
          resumed: true,
        });
      }

      await supabase
        .from('conversation_sessions')
        .update({ status: 'abandoned' })
        .eq('id', existingSession.id);
    }

    const { data: session, error } = await supabase
      .from('conversation_sessions')
      .insert({
        user_id: user.id,
        session_type: sessionType,
        status: 'active',
        metadata: {},
        last_activity_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      captureAPIError(error, {
        route: 'conversation/start',
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 },
      );
    }

    return NextResponse.json({ sessionId: session.id, resumed: false });
  } catch (error) {
    captureAPIError(error, { route: 'conversation/start' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
