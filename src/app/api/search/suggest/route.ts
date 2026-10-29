import { NextRequest, NextResponse } from 'next/server';
import { searchSuggestions } from '@/lib/search';

export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams.get('q') ?? '';

    try {
        const data = await searchSuggestions(q);
        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[search/suggest]', error);
        return NextResponse.json({ teams: [], players: [], matches: [] }, { status: 500 });
    }
}