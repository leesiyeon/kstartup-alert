import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, generateSessionToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 로그인 검증
    const authResult = validateAdminCredentials({ username, password });

    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        message: authResult.message
      }, {
        status: 401
      });
    }

    // 세션 토큰 생성
    const sessionToken = generateSessionToken();

    // 응답에 쿠키 설정
    const response = NextResponse.json({
      success: true,
      message: authResult.message
    });

    // 쿠키 설정 (HttpOnly, Secure, SameSite)
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24시간
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('로그인 API 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다.'
    }, {
      status: 500
    });
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: '로그인하려면 POST 요청을 보내주세요.',
    endpoint: '/api/auth/login',
    method: 'POST',
    body: {
      username: 'admin',
      password: 'admin'
    }
  });
}
