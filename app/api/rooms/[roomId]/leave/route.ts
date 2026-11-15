import { NextRequest, NextResponse } from 'next/server';
import { removePlayerFromRoom } from '../../../../../app/utils/roomStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { playerName } = await request.json();

    if (!playerName) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    const removed = await removePlayerFromRoom(roomId, playerName);
    return NextResponse.json({ removed });
  } catch {
    return NextResponse.json(
      { error: 'Failed to leave room' },
      { status: 500 }
    );
  }
}
