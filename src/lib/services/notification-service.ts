import { KstartupApiService } from './kstartup-api';
import { TelegramBotService } from './telegram-bot';
import { HybridStorageService } from './hybrid-storage-service';

export interface NotificationResult {
  success: boolean;
  message: string;
  totalAnnouncements: number;
  ongoingAnnouncements: number;
  newAnnouncements: number;
  errors?: string[];
}

export class NotificationService {
  private kstartupApi: KstartupApiService;
  private telegramBot: TelegramBotService;
  private storageService: HybridStorageService;

  constructor() {
    this.kstartupApi = new KstartupApiService();
    this.telegramBot = new TelegramBotService();
    this.storageService = new HybridStorageService();
  }

  /**
   * 새로운 공고를 확인하고 알림을 전송합니다.
   */
  async checkAndNotify(): Promise<NotificationResult> {
    const errors: string[] = [];
    
    try {
      console.log('=== K-startup 공고 확인 시작 ===');
      
      // 1. 현재 진행 중인 공고 목록 조회 (더 많은 페이지 조회)
      console.log('1. 현재 진행 중인 공고 목록 조회 중...');
      const allCurrentAnnouncements = [];
      let currentPage = 1;
      const maxPages = 3; // 최대 3페이지 조회 (300개 공고)
      
      while (currentPage <= maxPages) {
        const apiResponse = await this.kstartupApi.getAnnouncements(100, currentPage);
        
        if (!apiResponse.data || apiResponse.data.length === 0) {
          break;
        }
        
        allCurrentAnnouncements.push(...apiResponse.data);
        console.log(`페이지 ${currentPage}: ${apiResponse.data.length}개 공고 조회`);
        
        if (apiResponse.data.length < 100) {
          break; // 마지막 페이지
        }
        
        currentPage++;
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
      }
      
      const totalAnnouncements = allCurrentAnnouncements.length;
      
      // 2. 진행 중인 공고만 필터링
      console.log('2. 진행 중인 공고 필터링 중...');
      const ongoingAnnouncements = this.kstartupApi.filterOngoingAnnouncements(allCurrentAnnouncements);
      console.log(`총 ${totalAnnouncements}개 중 진행 중인 공고: ${ongoingAnnouncements.length}개`);
      
      // 3. 이전 공고 목록 로드
      console.log('3. 이전 공고 목록 로드 중...');
      const previousAnnouncements = await this.storageService.loadPreviousAnnouncements();
      
      // 4. 새로운 공고 찾기 (DB에 없는 공고만)
      console.log('4. 새로운 공고 확인 중...');
      console.log(`DB에 저장된 기존 공고: ${previousAnnouncements.length}개`);
      
      const newAnnouncements = this.storageService.findNewAnnouncements(
        ongoingAnnouncements, 
        previousAnnouncements
      );
      
      if (newAnnouncements.length > 0) {
        console.log(`🆕 새로운 공고 발견: ${newAnnouncements.length}개`);
        newAnnouncements.forEach(announcement => {
          console.log(`- [${announcement.pbanc_sn}] ${announcement.biz_pbanc_nm}`);
        });
      } else {
        console.log('✅ 새로운 공고 없음 (모든 진행 중인 공고가 이미 DB에 저장됨)');
      }
      
      // 5. 새로운 공고가 있을 때만 알림 전송
      if (newAnnouncements.length > 0) {
        console.log(`5. ${newAnnouncements.length}개의 새로운 공고 텔레그램 알림 전송 중...`);
        
        try {
          // 요약 메시지 먼저 전송
          const summaryMessage = this.createSummaryMessage(newAnnouncements.length);
          await this.telegramBot.sendMessage(summaryMessage);
          
          // 각 공고별 상세 메시지 전송 (최대 5개까지만)
          const messagesToSend = newAnnouncements.slice(0, 5); // 너무 많으면 5개로 제한
          const detailMessages = messagesToSend.map(announcement => 
            this.kstartupApi.formatAnnouncement(announcement)
          );
          
          await this.telegramBot.sendMultipleMessages(detailMessages, 3000); // 3초 간격
          
          if (newAnnouncements.length > 5) {
            const remainingMessage = `📋 추가로 ${newAnnouncements.length - 5}개의 새로운 공고가 더 있습니다.\n웹사이트에서 확인하세요: https://www.k-startup.go.kr`;
            await this.telegramBot.sendMessage(remainingMessage);
          }
          
          console.log('✅ 텔레그램 알림 전송 완료');
          
        } catch (telegramError) {
          const errorMsg = `❌ 텔레그램 알림 전송 실패: ${telegramError instanceof Error ? telegramError.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      } else {
        console.log('5. 새로운 공고가 없어서 알림을 전송하지 않습니다.');
      }
      
      // 6. 진행 중인 모든 공고를 DB에 저장 (기존 + 새로운 공고)
      console.log('6. 진행 중인 공고 목록을 DB에 저장 중...');
      try {
        await this.storageService.saveAnnouncements(ongoingAnnouncements);
        console.log(`✅ ${ongoingAnnouncements.length}개의 진행 중인 공고를 DB에 저장했습니다.`);
      } catch (storageError) {
        const errorMsg = `❌ 데이터 저장 실패: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
      
      // 7. 만료된 공고 정리 (선택적)
      console.log('7. 만료된 공고 정리 중...');
      try {
        await this.storageService.cleanupExpiredAnnouncements(previousAnnouncements);
      } catch (cleanupError) {
        const errorMsg = `만료 공고 정리 실패: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`;
        console.warn(errorMsg);
        // 정리 실패는 치명적이지 않으므로 errors에 추가하지 않음
      }
      
      console.log('=== K-startup 공고 확인 완료 ===');
      
      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? `성공적으로 완료되었습니다. 새로운 공고: ${newAnnouncements.length}개`
          : `부분적으로 완료되었습니다. 오류 ${errors.length}개 발생`,
        totalAnnouncements,
        ongoingAnnouncements: ongoingAnnouncements.length,
        newAnnouncements: newAnnouncements.length,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      const errorMsg = `공고 확인 프로세스 실패: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      
      return {
        success: false,
        message: errorMsg,
        totalAnnouncements: 0,
        ongoingAnnouncements: 0,
        newAnnouncements: 0,
        errors: [errorMsg]
      };
    }
  }

  /**
   * 연결 상태를 테스트합니다.
   */
  async testConnections(): Promise<{
    kstartupApi: { success: boolean; message: string };
    telegramBot: { success: boolean; message: string; botInfo?: Record<string, unknown>; chatInfo?: Record<string, unknown> };
    storage: { success: boolean; message: string; stats?: Record<string, unknown> };
  }> {
    const results: {
      kstartupApi: { success: boolean; message: string };
      telegramBot: { success: boolean; message: string; botInfo?: Record<string, unknown>; chatInfo?: Record<string, unknown> };
      storage: { success: boolean; message: string; stats?: Record<string, unknown> };
    } = {
      kstartupApi: { success: false, message: '' },
      telegramBot: { success: false, message: '' },
      storage: { success: false, message: '' }
    };

    // K-startup API 테스트
    try {
      const testResponse = await this.kstartupApi.getAnnouncements(1, 1);
      results.kstartupApi = {
        success: true,
        message: `연결 성공. 총 ${testResponse.totalCount}개 공고 확인`
      };
    } catch (error) {
      results.kstartupApi = {
        success: false,
        message: `연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }

    // 텔레그램 봇 테스트
    const telegramTest = await this.telegramBot.testConnection();
    results.telegramBot = telegramTest;

    // 저장소 테스트
    try {
      const stats = await this.storageService.getStorageStats();
      results.storage = {
        success: true,
        message: `연결 성공. 저장된 공고: ${stats.totalCount}개`,
        stats
      };
    } catch (error) {
      results.storage = {
        success: false,
        message: `연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }

    return results;
  }

  /**
   * 수동으로 전체 공고 목록을 전송합니다. (테스트용)
   */
  async sendCurrentAnnouncements(limit: number = 5): Promise<NotificationResult> {
    try {
      console.log(`현재 진행 중인 공고 ${limit}개 전송 중...`);
      
      const apiResponse = await this.kstartupApi.getAnnouncements(limit, 1);
      const ongoingAnnouncements = this.kstartupApi.filterOngoingAnnouncements(apiResponse.data);
      
      if (ongoingAnnouncements.length === 0) {
        await this.telegramBot.sendMessage('📭 현재 진행 중인 공고가 없습니다.');
        return {
          success: true,
          message: '진행 중인 공고가 없습니다.',
          totalAnnouncements: apiResponse.data.length,
          ongoingAnnouncements: 0,
          newAnnouncements: 0
        };
      }

      // 요약 메시지
      const summaryMessage = `📋 **현재 진행 중인 K-startup 공고 ${ongoingAnnouncements.length}개**\n\n`;
      await this.telegramBot.sendMessage(summaryMessage);

      // 각 공고별 상세 정보
      const messages = ongoingAnnouncements.map(announcement => 
        this.kstartupApi.formatAnnouncement(announcement)
      );
      
      await this.telegramBot.sendMultipleMessages(messages, 2000);

      return {
        success: true,
        message: `${ongoingAnnouncements.length}개 공고를 전송했습니다.`,
        totalAnnouncements: apiResponse.data.length,
        ongoingAnnouncements: ongoingAnnouncements.length,
        newAnnouncements: 0
      };
      
    } catch (error) {
      const errorMsg = `공고 전송 실패: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return {
        success: false,
        message: errorMsg,
        totalAnnouncements: 0,
        ongoingAnnouncements: 0,
        newAnnouncements: 0,
        errors: [errorMsg]
      };
    }
  }

  /**
   * 새로운 공고 요약 메시지를 생성합니다.
   */
  private createSummaryMessage(count: number): string {
    return `
🚨 **새로운 K-startup 공고 알림**

📢 새로운 공고 **${count}개**가 등록되었습니다!

⏰ 확인 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

---
    `.trim();
  }
}
