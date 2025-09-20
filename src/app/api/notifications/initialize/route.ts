import { NextRequest, NextResponse } from 'next/server';
import { KstartupApiService } from '@/lib/services/kstartup-api';
import { StorageService } from '@/lib/services/storage-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const maxPages = body.maxPages || 5; // 최대 페이지 수 제한 (기본값: 5페이지)
    
    console.log(`=== 초기화 API 호출됨 (최대 ${maxPages}페이지) ===`);
    
    const kstartupApi = new KstartupApiService();
    const storageService = new StorageService();
    
    const allAnnouncements = [];
    let currentPage = 1;
    let totalProcessed = 0;
    
    console.log('전체 공고 조회 시작...');
    
    // 여러 페이지에 걸쳐 공고 조회
    while (currentPage <= maxPages) {
      console.log(`${currentPage}페이지 조회 중...`);
      
      const apiResponse = await kstartupApi.getAnnouncements(100, currentPage);
      
      if (!apiResponse.data || apiResponse.data.length === 0) {
        console.log(`${currentPage}페이지에 데이터가 없어서 조회를 중단합니다.`);
        break;
      }
      
      // 진행 중인 공고만 필터링
      const ongoingAnnouncements = kstartupApi.filterOngoingAnnouncements(apiResponse.data);
      allAnnouncements.push(...ongoingAnnouncements);
      totalProcessed += apiResponse.data.length;
      
      console.log(`${currentPage}페이지: 전체 ${apiResponse.data.length}개, 진행중 ${ongoingAnnouncements.length}개`);
      
      // 마지막 페이지인지 확인
      if (apiResponse.data.length < 100) {
        console.log('마지막 페이지에 도달했습니다.');
        break;
      }
      
      currentPage++;
      
      // API 호출 간격 (과도한 요청 방지)
      if (currentPage <= maxPages) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      }
    }
    
    console.log(`전체 조회 완료: ${totalProcessed}개 공고 처리, ${allAnnouncements.length}개 진행중 공고 발견`);
    
    // 중복 제거 (pbanc_sn 기준)
    const uniqueAnnouncements = allAnnouncements.filter((announcement, index, self) => 
      index === self.findIndex(a => a.pbanc_sn === announcement.pbanc_sn)
    );
    
    console.log(`중복 제거 후: ${uniqueAnnouncements.length}개 공고`);
    
    // 데이터베이스에 저장 (알림 없이)
    console.log('데이터베이스에 저장 중...');
    await storageService.saveAnnouncements(uniqueAnnouncements);
    
    console.log('=== 초기화 완료 ===');
    
    return NextResponse.json({
      success: true,
      message: '초기화가 성공적으로 완료되었습니다.',
      data: {
        totalProcessed,
        ongoingAnnouncements: allAnnouncements.length,
        uniqueAnnouncements: uniqueAnnouncements.length,
        pagesProcessed: currentPage - 1,
        maxPages,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('초기화 API 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '초기화 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: '공고 초기화를 실행하려면 POST 요청을 보내주세요.',
    endpoint: '/api/notifications/initialize',
    method: 'POST',
    body: {
      maxPages: '조회할 최대 페이지 수 (기본값: 5, 권장: 3-10)'
    },
    description: '전체 공고를 조회하여 데이터베이스에 저장합니다. 알림은 전송하지 않습니다.'
  });
}
