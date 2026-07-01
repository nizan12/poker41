import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }

  try {
    if (!request.body) {
      return NextResponse.json({ error: 'Body is required' }, { status: 400 });
    }

    const blob = await put(filename, request.body, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
