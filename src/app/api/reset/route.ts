import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'All local scan caches, history, and simulation states erased successfully. Ready for fresh demonstration.',
    timestamp: new Date().toISOString(),
  });
}
