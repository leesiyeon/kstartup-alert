import { NextRequest, NextResponse } from 'next/server';
import { testSupabaseConnection } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Supabase 연결 테스트 API 호출됨 ===');
    
    const result = await testSupabaseConnection();
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Supabase 연결 성공' : 'Supabase 연결 실패',
      data: result.data || null,
      error: result.error || null,
      timestamp: new Date().toISOString()
    }, {
      status: result.success ? 200 : 500
    });
    
  } catch (error) {
    console.error('Supabase 테스트 API 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Supabase 테스트 중 서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}
