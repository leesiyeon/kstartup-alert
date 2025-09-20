import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 5;
    
    console.log(`=== 현재 공고 전송 API 호출됨 (limit: ${limit}) ===`);
    
    const notificationService = new NotificationService();
    const result = await notificationService.sendCurrentAnnouncements(limit);
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        totalAnnouncements: result.totalAnnouncements,
        ongoingAnnouncements: result.ongoingAnnouncements,
        sentCount: result.ongoingAnnouncements,
        timestamp: new Date().toISOString()
      },
      errors: result.errors
    }, {
      status: result.success ? 200 : 500
    });
    
  } catch (error) {
    console.error('현재 공고 전송 API 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: '현재 공고를 전송하려면 POST 요청을 보내주세요.',
    endpoint: '/api/notifications/send-current',
    method: 'POST',
    body: {
      limit: '전송할 공고 개수 (기본값: 5)'
    }
  });
}
