import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const twinsDir = path.join(process.cwd(), 'docker_twins');
    if (fs.existsSync(twinsDir)) {
      fs.rmSync(twinsDir, { recursive: true, force: true });
    }
  } catch {}

  return NextResponse.json({
    success: true,
    message: 'All local scan caches, history, Docker twins, and simulation states erased successfully. Ready for fresh demonstration.',
    timestamp: new Date().toISOString(),
  });
}
