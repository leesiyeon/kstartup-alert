'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ApiResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  errors?: string[];
}

interface SchedulerStatus {
  isRunning: boolean;
  nextExecution: string | null;
  timezone: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [lastResult, setLastResult] = useState<string>('');
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  // 컴포넌트 마운트 시 인증 확인 및 스케줄러 상태 확인
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();
      
      if (data.authenticated) {
        setAuthenticated(true);
        // 인증된 경우에만 스케줄러 상태 확인
        fetchSchedulerStatus();
      } else {
        setAuthenticated(false);
        // 인증되지 않은 경우 로그인 페이지로 리디렉션
        router.push('/login');
      }
    } catch (error) {
      console.error('인증 확인 실패:', error);
      setAuthenticated(false);
      router.push('/login');
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/scheduler');
      const data = await response.json();
      if (data.success) {
        setSchedulerStatus(data.data);
      }
    } catch (error) {
      console.error('스케줄러 상태 조회 실패:', error);
    }
  };

  const handleApiCall = async (endpoint: string, method: string = 'POST', body?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);
      const data: ApiResponse = await response.json();
      
      setLastResult(JSON.stringify(data, null, 2));
      
      // 스케줄러 관련 API 호출 후 상태 업데이트
      if (endpoint.includes('scheduler')) {
        await fetchSchedulerStatus();
      }
      
    } catch (error) {
      setLastResult(`오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthenticated(false);
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 인증 확인 중이면 로딩 표시
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 (리디렉션 중)
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="relative text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🚀 K-startup 알림 시스템
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            K-startup 공고를 자동으로 모니터링하고 텔레그램으로 알림을 보내는 시스템입니다.
          </p>
          
          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            🚪 로그아웃
          </button>
        </div>

        {/* 스케줄러 상태 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            📅 스케줄러 상태
          </h2>
          {schedulerStatus ? (
            <div className="space-y-2">
              <p className="flex items-center">
                <span className="font-medium mr-2">상태:</span>
                <span className={`px-2 py-1 rounded text-sm ${schedulerStatus.isRunning 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {schedulerStatus.isRunning ? '실행 중' : '중지됨'}
                </span>
              </p>
              <p><span className="font-medium">실행 주기:</span> {schedulerStatus.nextExecution || 'N/A'}</p>
              <p><span className="font-medium">시간대:</span> {schedulerStatus.timezone}</p>
            </div>
          ) : (
            <p className="text-gray-500">스케줄러 상태를 불러오는 중...</p>
          )}
        </div>

        {/* 제어 버튼들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* 연결 테스트 */}
          <button
            onClick={() => handleApiCall('/api/test/connections', 'GET')}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            🔍 연결 테스트
          </button>

          {/* 공고 확인 */}
          <button
            onClick={() => handleApiCall('/api/notifications/check')}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            📋 새 공고 확인
          </button>

          {/* 현재 공고 전송 */}
          <button
            onClick={() => handleApiCall('/api/notifications/send-current', 'POST', { limit: 3 })}
            disabled={loading}
            className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            📤 현재 공고 전송
          </button>

          {/* 초기화 */}
          <button
            onClick={() => handleApiCall('/api/notifications/initialize', 'POST', { maxPages: 5 })}
            disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            🔄 DB 초기화
          </button>

          {/* 스케줄러 시작 */}
          <button
            onClick={() => handleApiCall('/api/scheduler', 'POST', { action: 'start' })}
            disabled={loading || schedulerStatus?.isRunning}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            ▶️ 스케줄러 시작
          </button>

          {/* 스케줄러 중지 */}
          <button
            onClick={() => handleApiCall('/api/scheduler', 'POST', { action: 'stop' })}
            disabled={loading || !schedulerStatus?.isRunning}
            className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            ⏹️ 스케줄러 중지
          </button>

          {/* 스케줄러 수동 실행 */}
          <button
            onClick={() => handleApiCall('/api/scheduler', 'POST', { action: 'run-once' })}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            🚀 즉시 실행
          </button>
        </div>

        {/* 결과 표시 */}
        {lastResult && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              📊 실행 결과
            </h3>
            <pre className="bg-gray-100 dark:bg-gray-700 rounded p-4 text-sm overflow-auto max-h-96 text-gray-800 dark:text-gray-200">
              {lastResult}
            </pre>
          </div>
        )}

        {/* 로딩 표시 */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-900 dark:text-white">처리 중...</p>
            </div>
          </div>
        )}

        {/* 설정 안내 */}
        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800 dark:text-yellow-200">
            ⚙️ 설정 안내
          </h3>
          <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
            <p>1. <code className="bg-yellow-100 dark:bg-yellow-800 px-1 py-0.5 rounded">env.example</code> 파일을 참고하여 환경변수를 설정하세요.</p>
            <p>2. 텔레그램 봇을 생성하고 <code className="bg-yellow-100 dark:bg-yellow-800 px-1 py-0.5 rounded">TELEGRAM_BOT_TOKEN</code>과 <code className="bg-yellow-100 dark:bg-yellow-800 px-1 py-0.5 rounded">TELEGRAM_CHAT_ID</code>를 설정하세요.</p>
            <p>3. 연결 테스트를 통해 모든 설정이 올바른지 확인하세요.</p>
            <p>4. <strong>🔄 DB 초기화</strong>를 실행하여 현재 진행 중인 모든 공고를 데이터베이스에 저장하세요.</p>
            <p>5. 스케줄러를 시작하면 매시간 정각에 자동으로 새로운 공고를 확인합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
