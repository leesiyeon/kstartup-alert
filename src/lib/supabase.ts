import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Supabase 설정:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET',
  key: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET'
});

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL과 Key가 설정되지 않았습니다.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'User-Agent': 'kstartup-alarm/1.0'
    }
  }
});

// 연결 테스트 함수
export async function testSupabaseConnection() {
  try {
    console.log('Supabase 연결 테스트 시작...');
    
    // 간단한 쿼리로 연결 테스트
    const { data, error } = await supabase
      .from('announcements')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase 연결 테스트 실패:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Supabase 연결 테스트 성공');
    return { success: true, data };
  } catch (error) {
    console.error('Supabase 연결 테스트 예외:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// 데이터베이스 테이블 타입 정의
export interface StoredAnnouncement {
  id?: number;
  pbanc_sn: number;
  biz_pbanc_nm: string;
  pbanc_rcpt_bgng_dt: string;
  pbanc_rcpt_end_dt: string;
  stored_at: string;
  created_at?: string;
}
