import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, getSessionTokenFromCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 쿠키에서 세션 토큰 추출
    const cookieHeader = request.headers.get('cookie');
    const sessionToken = getSessionTokenFromCookie(cookieHeader);

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        message: '세션 토큰이 없습니다.'
      }, {
        status: 401
      });
    }

    // 세션 토큰 검증
    const isValid = validateSessionToken(sessionToken);

    if (!isValid) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        message: '유효하지 않거나 만료된 세션입니다.'
      }, {
        status: 401
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      message: '인증된 사용자입니다.'
    });

  } catch (error) {
    console.error('인증 확인 API 오류:', error);
    
    return NextResponse.json({
      success: false,
      authenticated: false,
      message: '인증 확인 중 오류가 발생했습니다.'
    }, {
      status: 500
    });
  }
}
