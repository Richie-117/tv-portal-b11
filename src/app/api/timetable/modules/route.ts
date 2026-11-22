import { NextRequest, NextResponse } from 'next/server';
import { getModules, saveAcademicModule, deleteAcademicModule } from '@/lib/db';
import { AcademicModule } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const modules = await getModules();
    return NextResponse.json({ success: true, modules });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, code, title, courseScope, stage, sortOrder } = body;

    if (!code || !title) {
      return NextResponse.json({ error: 'Code and title are required' }, { status: 400 });
    }

    const mod: AcademicModule = {
      id: id || `sub-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      courseScope: courseScope || 'ALL',
      stage: stage || 'Foundation',
      sortOrder: Number(sortOrder) || 1,
      isActive: true,
    };

    const saved = await saveAcademicModule(mod);
    return NextResponse.json({ success: true, module: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save module' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Module ID required' }, { status: 400 });
    await deleteAcademicModule(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 });
  }
}

