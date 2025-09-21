import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    // 응답 생성
    const response = NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.'
    });

    // 세션 쿠키 삭제
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // 즉시 만료
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('로그아웃 API 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '로그아웃 처리 중 오류가 발생했습니다.'
    }, {
      status: 500
    });
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: '로그아웃하려면 POST 요청을 보내주세요.',
    endpoint: '/api/auth/logout',
    method: 'POST'
  });
}
