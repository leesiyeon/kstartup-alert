/**
 * 간단한 관리자 인증 시스템
 */

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
}

// 하드코딩된 관리자 계정 (실제 서비스에서는 환경변수나 DB 사용 권장)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

/**
 * 관리자 로그인 검증
 */
export function validateAdminCredentials(credentials: AuthCredentials): AuthResult {
  const { username, password } = credentials;

  if (!username || !password) {
    return {
      success: false,
      message: '사용자명과 비밀번호를 입력해주세요.'
    };
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return {
      success: true,
      message: '로그인 성공'
    };
  }

  return {
    success: false,
    message: '잘못된 사용자명 또는 비밀번호입니다.'
  };
}

/**
 * 세션 토큰 생성 (간단한 Base64 인코딩)
 */
export function generateSessionToken(): string {
  const timestamp = Date.now();
  const data = `${ADMIN_USERNAME}:${timestamp}`;
  return Buffer.from(data).toString('base64');
}

/**
 * 세션 토큰 검증
 */
export function validateSessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [username, timestamp] = decoded.split(':');
    
    // 사용자명 확인
    if (username !== ADMIN_USERNAME) {
      return false;
    }
    
    // 토큰 만료 시간 확인 (24시간)
    const tokenTime = parseInt(timestamp);
    const currentTime = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24시간
    
    return (currentTime - tokenTime) < maxAge;
    
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    return false;
  }
}

/**
 * 쿠키에서 세션 토큰 추출
 */
export function getSessionTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
  const sessionCookie = cookies.find(cookie => cookie.startsWith('session='));
  
  return sessionCookie ? sessionCookie.split('=')[1] : null;
}
