import { NextRequest, NextResponse } from 'next/server';
import { addPlayerToRoom, getRoom } from '../../../../../app/utils/roomStore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { playerName } = body;

    if (!playerName) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    const result = await addPlayerToRoom(roomId, playerName);

    if (result === 'name_taken') {
      return NextResponse.json(
        { error: 'That name is already taken in this room' },
        { status: 409 }
      );
    }

    if (result !== 'joined') {
      return NextResponse.json(
        { error: 'Failed to join room' },
        { status: 400 }
      );
    }

    const room = await getRoom(roomId);
    return NextResponse.json({ room });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500 }
    );
  }
}
