import { NextRequest, NextResponse } from 'next/server';
import { getScheduler } from '@/lib/scheduler';

export async function GET(_request: NextRequest) {
  try {
    const scheduler = getScheduler();
    const status = scheduler.getStatus();
    
    return NextResponse.json({
      success: true,
      message: '스케줄러 상태 조회 성공',
      data: status
    });
    
  } catch (error) {
    console.error('스케줄러 상태 조회 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '스케줄러 상태 조회 실패',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;
    
    const scheduler = getScheduler();
    
    switch (action) {
      case 'start':
        scheduler.start();
        return NextResponse.json({
          success: true,
          message: '스케줄러가 시작되었습니다.',
          data: scheduler.getStatus()
        });
        
      case 'stop':
        scheduler.stop();
        return NextResponse.json({
          success: true,
          message: '스케줄러가 중지되었습니다.',
          data: scheduler.getStatus()
        });
        
      case 'run-once':
        const result = await scheduler.runOnce();
        return NextResponse.json({
          success: result.success,
          message: '스케줄러 수동 실행 완료',
          data: {
            ...result,
            schedulerStatus: scheduler.getStatus()
          }
        });
        
      default:
        return NextResponse.json({
          success: false,
          message: '잘못된 액션입니다. start, stop, run-once 중 하나를 선택하세요.'
        }, {
          status: 400
        });
    }
    
  } catch (error) {
    console.error('스케줄러 제어 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '스케줄러 제어 실패',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}
