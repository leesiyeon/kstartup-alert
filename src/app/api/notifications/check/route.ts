import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST(request: NextRequest) {
  try {
    console.log('=== 공고 확인 API 호출됨 ===');
    
    const notificationService = new NotificationService();
    const result = await notificationService.checkAndNotify();
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        totalAnnouncements: result.totalAnnouncements,
        ongoingAnnouncements: result.ongoingAnnouncements,
        newAnnouncements: result.newAnnouncements,
        timestamp: new Date().toISOString()
      },
      errors: result.errors
    }, {
      status: result.success ? 200 : 500
    });
    
  } catch (error) {
    console.error('공고 확인 API 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: '공고 확인을 실행하려면 POST 요청을 보내주세요.',
    endpoint: '/api/notifications/check',
    method: 'POST'
  });
}
