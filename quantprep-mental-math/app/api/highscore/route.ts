import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const HIGHSCORE_FILE = path.join(process.cwd(), 'data', 'highscore.json');

async function getHighScore(): Promise<number> {
  try {
    const data = await fs.readFile(HIGHSCORE_FILE, 'utf-8');
    const json = JSON.parse(data);
    return json.highScore || 0;
  } catch (error) {
    // File doesn't exist yet, return 0
    return 0;
  }
}

async function setHighScore(score: number): Promise<void> {
  try {
    await fs.mkdir(path.dirname(HIGHSCORE_FILE), { recursive: true });
    await fs.writeFile(HIGHSCORE_FILE, JSON.stringify({ highScore: score }), 'utf-8');
  } catch (error) {
    console.error('Error writing high score:', error);
  }
}

export async function GET() {
  try {
    const highScore = await getHighScore();
    return NextResponse.json({ highScore });
  } catch (error) {
    return NextResponse.json({ highScore: 0 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { score } = body;
    
    if (typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }
    
    const currentHighScore = await getHighScore();
    
    if (score > currentHighScore) {
      await setHighScore(score);
      return NextResponse.json({ highScore: score, updated: true });
    }
    
    return NextResponse.json({ highScore: currentHighScore, updated: false });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

