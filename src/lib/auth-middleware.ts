import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, getSessionTokenFromCookie } from './auth';

/**
 * API 라우트용 인증 미들웨어
 */
export function withAuth(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 쿠키에서 세션 토큰 추출
      const cookieHeader = request.headers.get('cookie');
      const sessionToken = getSessionTokenFromCookie(cookieHeader);

      // 세션 토큰이 없는 경우
      if (!sessionToken) {
        return NextResponse.json({
          success: false,
          message: '인증이 필요합니다. 로그인해주세요.',
          authenticated: false
        }, {
          status: 401
        });
      }

      // 세션 토큰 검증
      const isValid = validateSessionToken(sessionToken);
      if (!isValid) {
        return NextResponse.json({
          success: false,
          message: '유효하지 않거나 만료된 세션입니다. 다시 로그인해주세요.',
          authenticated: false
        }, {
          status: 401
        });
      }

      // 인증 성공 - 원래 핸들러 실행
      return await handler(request);

    } catch (error) {
      console.error('인증 미들웨어 오류:', error);
      
      return NextResponse.json({
        success: false,
        message: '인증 처리 중 오류가 발생했습니다.',
        authenticated: false
      }, {
        status: 500
      });
    }
  };
}

/**
 * GitHub Actions 등 외부 요청용 예외 처리
 * User-Agent가 'GitHub-Actions-KStartup-Alert'인 경우 인증 우회
 */
export function withAuthOrGitHubActions(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // GitHub Actions 요청인지 확인
      const userAgent = request.headers.get('user-agent') || '';
      if (userAgent.includes('GitHub-Actions-KStartup-Alert')) {
        console.log('GitHub Actions 요청 감지 - 인증 우회');
        return await handler(request);
      }

      // 일반 요청은 인증 필요
      return await withAuth(handler)(request);

    } catch (error) {
      console.error('인증 미들웨어 오류:', error);
      
      return NextResponse.json({
        success: false,
        message: '인증 처리 중 오류가 발생했습니다.',
        authenticated: false
      }, {
        status: 500
      });
    }
  };
}
