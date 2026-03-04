import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMarketContext, formatQuoteSummary } from '@/lib/market-data/alpha-vantage';
import { captureAPIError } from '@/lib/sentry';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const marketData = await getMarketContext();
    const summary = formatQuoteSummary(marketData);

    return NextResponse.json({
      quotes: summary,
      fetchedAt: marketData.fetchedAt,
    });
  } catch (error) {
    captureAPIError(error, { route: 'market-context' });
    return NextResponse.json(
      { error: 'Unable to load market data. Please try again later.' },
      { status: 500 },
    );
  }
}
