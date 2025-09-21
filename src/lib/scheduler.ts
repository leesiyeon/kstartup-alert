import cron from 'node-cron';
import { NotificationService } from './services/notification-service';

class SchedulerService {
  private notificationService: NotificationService;
  private cronJob: ReturnType<typeof cron.schedule> | null = null;
  private isRunning = false;
  private autoStarted = false;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * 자동 시작 (서버 시작 시 한 번만 호출)
   */
  autoStart() {
    if (this.autoStarted) {
      console.log('스케줄러 자동 시작이 이미 완료되었습니다.');
      return;
    }

    console.log('🚀 서버 시작 - K-startup 알림 스케줄러 자동 시작');
    this.start();
    this.autoStarted = true;
  }

  /**
   * 스케줄러를 시작합니다. (1시간마다 실행)
   */
  start() {
    if (this.isRunning) {
      console.log('스케줄러가 이미 실행 중입니다.');
      return;
    }

    // 매시간 정각에 실행 (0분 0초) - 오전 8시~오후 8시만
    this.cronJob = cron.schedule('0 0 * * * *', async () => {
      const now = new Date();
      const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
      const currentHour = koreaTime.getHours();
      
      console.log(`[${now.toISOString()}] 스케줄러 트리거 - 한국시간: ${koreaTime.toLocaleString('ko-KR')}`);
      
      // 오전 8시(08:00) ~ 오후 8시(20:00) 범위 체크
      if (currentHour < 8 || currentHour >= 20) {
        console.log(`⏰ 업무시간 외 (${currentHour}시) - 스케줄러 실행 생략`);
        console.log(`📅 다음 실행 시간: 오전 8시 ~ 오후 8시 사이`);
        return;
      }
      
      console.log(`✅ 업무시간 내 (${currentHour}시) - K-startup 공고 확인 시작`);
      
      try {
        const result = await this.notificationService.checkAndNotify();
        
        if (result.success) {
          console.log(`✅ 스케줄러 실행 성공: 새로운 공고 ${result.newAnnouncements}개`);
        } else {
          console.error(`❌ 스케줄러 실행 중 오류 발생: ${result.message}`);
          if (result.errors) {
            result.errors.forEach(error => console.error(`  - ${error}`));
          }
        }
      } catch (error) {
        console.error('❌ 스케줄러 실행 중 예외 발생:', error);
      }
    }, {
      timezone: 'Asia/Seoul'
    });

    this.cronJob.start();
    this.isRunning = true;
    
    console.log('✅ K-startup 알림 스케줄러가 시작되었습니다. (오전 8시~오후 8시, 매시간 정각 실행)');
  }

  /**
   * 스케줄러를 중지합니다.
   */
  stop() {
    if (!this.isRunning || !this.cronJob) {
      console.log('스케줄러가 실행 중이지 않습니다.');
      return;
    }

    this.cronJob.stop();
    this.cronJob = null;
    this.isRunning = false;
    
    console.log('⏹️ K-startup 알림 스케줄러가 중지되었습니다.');
  }

  /**
   * 스케줄러 상태를 반환합니다.
   */
  getStatus() {
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const currentHour = koreaTime.getHours();
    const isBusinessHours = currentHour >= 8 && currentHour < 20;
    
    return {
      isRunning: this.isRunning,
      nextExecution: this.cronJob ? '오전 8시~오후 8시, 매시간 정각' : null,
      timezone: 'Asia/Seoul',
      businessHours: '오전 8시 ~ 오후 8시',
      currentTime: koreaTime.toLocaleString('ko-KR'),
      isBusinessHours: isBusinessHours,
      currentStatus: isBusinessHours ? '업무시간 (실행 가능)' : '업무시간 외 (실행 생략)'
    };
  }

  /**
   * 즉시 한 번 실행합니다. (테스트용)
   */
  async runOnce() {
    console.log('스케줄러 수동 실행 시작');
    
    try {
      const result = await this.notificationService.checkAndNotify();
      console.log('스케줄러 수동 실행 완료:', result);
      return result;
    } catch (error) {
      console.error('스케줄러 수동 실행 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
let schedulerInstance: SchedulerService | null = null;

export function getScheduler(): SchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new SchedulerService();
    // 서버 시작 시 자동으로 스케줄러 시작
    schedulerInstance.autoStart();
  }
  return schedulerInstance;
}

export default SchedulerService;
