/**
 * 서버 시작 시 초기화 로직
 */
import { getScheduler } from './scheduler';

let initialized = false;

export function initializeApp() {
  if (initialized) {
    console.log('앱이 이미 초기화되었습니다.');
    return;
  }

  console.log('🚀 K-startup 알림 시스템 초기화 시작...');
  
  try {
    // 스케줄러 자동 시작
    const scheduler = getScheduler();
    console.log('✅ 스케줄러 초기화 완료');
    
    // 초기화 완료 표시
    initialized = true;
    console.log('🎉 K-startup 알림 시스템 초기화 완료!');
    
  } catch (error) {
    console.error('❌ 앱 초기화 중 오류 발생:', error);
  }
}
