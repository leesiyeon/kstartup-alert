import cron from 'node-cron';
import { NotificationService } from './services/notification-service';

class SchedulerService {
  private notificationService: NotificationService;
  private cronJob: ReturnType<typeof cron.schedule> | null = null;
  private isRunning = false;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * 스케줄러를 시작합니다. (1시간마다 실행)
   */
  start() {
    if (this.isRunning) {
      console.log('스케줄러가 이미 실행 중입니다.');
      return;
    }

    // 매시간 정각에 실행 (0분 0초)
    this.cronJob = cron.schedule('0 0 * * * *', async () => {
      console.log(`[${new Date().toISOString()}] 스케줄러 실행 - K-startup 공고 확인 시작`);
      
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
    
    console.log('✅ K-startup 알림 스케줄러가 시작되었습니다. (매시간 정각 실행)');
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
    return {
      isRunning: this.isRunning,
      nextExecution: this.cronJob ? '매시간 정각' : null,
      timezone: 'Asia/Seoul'
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
  }
  return schedulerInstance;
}

export default SchedulerService;
