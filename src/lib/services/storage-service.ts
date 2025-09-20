import { supabase, StoredAnnouncement } from '../supabase';
import { KstartupAnnouncement } from './kstartup-api';

export { StoredAnnouncement } from '../supabase';

export class StorageService {
  private readonly tableName = 'announcements';

  /**
   * 이전에 저장된 공고 목록을 로드합니다.
   */
  async loadPreviousAnnouncements(): Promise<StoredAnnouncement[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('stored_at', { ascending: false });

      if (error) {
        console.error('Supabase 조회 오류:', error);
        return [];
      }

      console.log(`이전 공고 ${data?.length || 0}개를 로드했습니다.`);
      return data || [];
    } catch (error) {
      console.error('이전 공고 데이터 로드 실패:', error);
      return [];
    }
  }

  /**
   * 공고 목록을 저장합니다.
   */
  async saveAnnouncements(announcements: KstartupAnnouncement[]): Promise<void> {
    try {
      if (!announcements || announcements.length === 0) {
        console.log('저장할 공고가 없습니다.');
        return;
      }

      console.log(`${announcements.length}개 공고 저장 시작...`);

      // 새 데이터 준비
      const storedAnnouncements = announcements.map(announcement => ({
        pbanc_sn: announcement.pbanc_sn,
        biz_pbanc_nm: announcement.biz_pbanc_nm,
        pbanc_rcpt_bgng_dt: announcement.pbanc_rcpt_bgng_dt,
        pbanc_rcpt_end_dt: announcement.pbanc_rcpt_end_dt,
        stored_at: new Date().toISOString()
      }));

      // 기존 데이터 삭제 (안전한 방식)
      console.log('기존 데이터 삭제 중...');
      const { error: deleteError } = await supabase
        .from(this.tableName)
        .delete()
        .gte('id', 1); // id가 1 이상인 모든 행 삭제

      if (deleteError) {
        console.warn('기존 데이터 삭제 중 오류:', deleteError);
        // 삭제 오류는 치명적이지 않으므로 계속 진행
      }

      // 배치 크기 제한 (1000개씩 나누어 삽입)
      const batchSize = 1000;
      let insertedCount = 0;

      for (let i = 0; i < storedAnnouncements.length; i += batchSize) {
        const batch = storedAnnouncements.slice(i, i + batchSize);
        console.log(`배치 ${Math.floor(i / batchSize) + 1} 삽입 중... (${batch.length}개)`);

        const { error: insertError, data } = await supabase
          .from(this.tableName)
          .insert(batch)
          .select('id');

        if (insertError) {
          console.error('Supabase 삽입 오류:', insertError);
          console.error('삽입 시도한 데이터 샘플:', JSON.stringify(batch[0], null, 2));
          throw new Error(`공고 데이터 저장 실패: ${insertError.message}`);
        }

        insertedCount += batch.length;
        console.log(`배치 삽입 성공: ${batch.length}개 (총 ${insertedCount}개)`);

        // 배치 간 잠시 대기 (DB 부하 방지)
        if (i + batchSize < storedAnnouncements.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ 총 ${insertedCount}개의 공고를 Supabase에 저장했습니다.`);
    } catch (error) {
      console.error('❌ 공고 데이터 저장 실패:', error);
      
      // 더 상세한 오류 정보 제공
      if (error instanceof Error) {
        throw new Error(`공고 데이터 저장 실패: ${error.message}`);
      } else {
        throw new Error('공고 데이터 저장 중 알 수 없는 오류가 발생했습니다.');
      }
    }
  }

  /**
   * 새로운 공고를 찾습니다.
   * @param currentAnnouncements 현재 조회된 공고 목록
   * @param previousAnnouncements 이전에 저장된 공고 목록
   * @returns 새로운 공고 목록
   */
  findNewAnnouncements(
    currentAnnouncements: KstartupAnnouncement[], 
    previousAnnouncements: StoredAnnouncement[]
  ): KstartupAnnouncement[] {
    const previousSnSet = new Set(previousAnnouncements.map(p => p.pbanc_sn));
    
    const newAnnouncements = currentAnnouncements.filter(current => 
      !previousSnSet.has(current.pbanc_sn)
    );

    console.log(`새로운 공고 ${newAnnouncements.length}개를 발견했습니다.`);
    
    return newAnnouncements;
  }

  /**
   * 종료된 공고를 정리합니다. (선택적)
   * @param announcements 저장된 공고 목록 (사용하지 않음, Supabase에서 직접 조회)
   * @param daysToKeep 보관할 일수 (기본값: 30일)
   */
  async cleanupExpiredAnnouncements(
    announcements: StoredAnnouncement[] = [], 
    daysToKeep: number = 30
  ): Promise<StoredAnnouncement[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().slice(0, 10).replace(/-/g, '');

      // 만료된 공고 삭제
      const { error: deleteError } = await supabase
        .from(this.tableName)
        .delete()
        .lt('pbanc_rcpt_end_dt', cutoffDateStr);

      if (deleteError) {
        console.error('만료된 공고 삭제 오류:', deleteError);
      } else {
        console.log('만료된 공고를 정리했습니다.');
      }

      // 남은 공고 반환
      return await this.loadPreviousAnnouncements();
    } catch (error) {
      console.error('만료된 공고 정리 실패:', error);
      return announcements;
    }
  }

  /**
   * 저장된 데이터의 통계를 반환합니다.
   */
  async getStorageStats(): Promise<{
    totalCount: number;
    oldestDate: string | null;
    newestDate: string | null;
    dbSizeInfo: string;
  }> {
    try {
      const { count, error: countError } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Supabase 개수 조회 오류:', countError);
      }

      const { data: oldestData, error: oldestError } = await supabase
        .from(this.tableName)
        .select('stored_at')
        .order('stored_at', { ascending: true })
        .limit(1);

      const { data: newestData, error: newestError } = await supabase
        .from(this.tableName)
        .select('stored_at')
        .order('stored_at', { ascending: false })
        .limit(1);

      return {
        totalCount: count || 0,
        oldestDate: oldestData?.[0]?.stored_at || null,
        newestDate: newestData?.[0]?.stored_at || null,
        dbSizeInfo: 'Supabase PostgreSQL'
      };
    } catch (error) {
      console.error('저장소 통계 조회 실패:', error);
      return {
        totalCount: 0,
        oldestDate: null,
        newestDate: null,
        dbSizeInfo: 'Error'
      };
    }
  }
}
