import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/services/notification-service';
import { withAuth } from '@/lib/auth-middleware';

async function testConnections(_request: NextRequest) {
  try {
    console.log('=== 연결 테스트 API 호출됨 ===');
    
    const notificationService = new NotificationService();
    const testResults = await notificationService.testConnections();
    
    const overallSuccess = testResults.kstartupApi.success && 
                          testResults.telegramBot.success && 
                          testResults.storage.success;
    
    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess ? '모든 연결이 정상입니다.' : '일부 연결에 문제가 있습니다.',
      data: {
        kstartupApi: testResults.kstartupApi,
        telegramBot: {
          success: testResults.telegramBot.success,
          message: testResults.telegramBot.message,
          botInfo: testResults.telegramBot.botInfo
        },
        storage: testResults.storage,
        timestamp: new Date().toISOString()
      }
    }, {
      status: overallSuccess ? 200 : 500
    });
    
  } catch (error) {
    console.error('연결 테스트 API 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '연결 테스트 중 서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}

export const GET = withAuth(testConnections);
