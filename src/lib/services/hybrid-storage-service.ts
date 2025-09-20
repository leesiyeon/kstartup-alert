import { promises as fs } from 'fs';
import path from 'path';
import { supabase, StoredAnnouncement } from '../supabase';
import { KstartupAnnouncement } from './kstartup-api';

export type { StoredAnnouncement } from '../supabase';

export class HybridStorageService {
  private readonly tableName = 'announcements';
  private readonly dataFilePath: string;

  constructor() {
    this.dataFilePath = process.env.DATA_FILE_PATH || './data/previous_announcements.json';
  }

  /**
   * 이전에 저장된 공고 목록을 로드합니다. (Supabase 우선, 실패 시 로컬 파일)
   */
  async loadPreviousAnnouncements(): Promise<StoredAnnouncement[]> {
    // 1. Supabase 시도
    try {
      console.log('Supabase에서 공고 목록 로드 시도...');
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('stored_at', { ascending: false });

      if (!error && data) {
        console.log(`✅ Supabase에서 ${data.length}개 공고를 로드했습니다.`);
        return data;
      } else {
        console.warn('Supabase 로드 실패:', error);
      }
    } catch (error) {
      console.warn('Supabase 로드 중 예외:', error);
    }

    // 2. 로컬 파일 폴백
    try {
      console.log('로컬 파일에서 공고 목록 로드 시도...');
      
      const dataDir = path.dirname(this.dataFilePath);
      await fs.mkdir(dataDir, { recursive: true });

      try {
        await fs.access(this.dataFilePath);
      } catch {
        console.log('로컬 파일이 없습니다. 빈 배열을 반환합니다.');
        return [];
      }

      const data = await fs.readFile(this.dataFilePath, 'utf-8');
      const announcements = JSON.parse(data) as StoredAnnouncement[];
      
      console.log(`✅ 로컬 파일에서 ${announcements.length}개 공고를 로드했습니다.`);
      return announcements;
    } catch (error) {
      console.error('로컬 파일 로드도 실패:', error);
      return [];
    }
  }

  /**
   * 공고 목록을 저장합니다. (Supabase와 로컬 파일 모두)
   */
  async saveAnnouncements(announcements: KstartupAnnouncement[]): Promise<void> {
    if (!announcements || announcements.length === 0) {
      console.log('저장할 공고가 없습니다.');
      return;
    }

    console.log(`${announcements.length}개 공고 저장 시작...`);

    const storedAnnouncements = announcements.map(announcement => ({
      pbanc_sn: announcement.pbanc_sn,
      biz_pbanc_nm: announcement.biz_pbanc_nm,
      pbanc_rcpt_bgng_dt: announcement.pbanc_rcpt_bgng_dt,
      pbanc_rcpt_end_dt: announcement.pbanc_rcpt_end_dt,
      stored_at: new Date().toISOString()
    }));

    let supabaseSuccess = false;
    let localSuccess = false;

    // 1. Supabase 저장 시도
    try {
      console.log('Supabase에 저장 시도...');
      
      // 기존 데이터 삭제
      const { error: deleteError } = await supabase
        .from(this.tableName)
        .delete()
        .gte('id', 1);

      if (deleteError) {
        console.warn('Supabase 삭제 오류:', deleteError);
      }

      // 배치 삽입
      const batchSize = 1000;
      for (let i = 0; i < storedAnnouncements.length; i += batchSize) {
        const batch = storedAnnouncements.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from(this.tableName)
          .insert(batch);

        if (insertError) {
          throw new Error(`Supabase 삽입 실패: ${insertError.message}`);
        }

        console.log(`Supabase 배치 ${Math.floor(i / batchSize) + 1} 저장 완료: ${batch.length}개`);
        
        if (i + batchSize < storedAnnouncements.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Supabase에 ${storedAnnouncements.length}개 공고 저장 성공`);
      supabaseSuccess = true;
    } catch (error) {
      console.error('❌ Supabase 저장 실패:', error);
    }

    // 2. 로컬 파일 저장 (항상 실행)
    try {
      console.log('로컬 파일에 저장 시도...');
      
      const dataDir = path.dirname(this.dataFilePath);
      await fs.mkdir(dataDir, { recursive: true });

      await fs.writeFile(
        this.dataFilePath, 
        JSON.stringify(storedAnnouncements, null, 2), 
        'utf-8'
      );

      console.log(`✅ 로컬 파일에 ${storedAnnouncements.length}개 공고 저장 성공`);
      localSuccess = true;
    } catch (error) {
      console.error('❌ 로컬 파일 저장 실패:', error);
    }

    // 결과 확인
    if (!supabaseSuccess && !localSuccess) {
      throw new Error('Supabase와 로컬 파일 저장 모두 실패했습니다.');
    } else if (!supabaseSuccess) {
      console.warn('⚠️ Supabase 저장 실패, 로컬 파일만 저장됨');
    } else if (!localSuccess) {
      console.warn('⚠️ 로컬 파일 저장 실패, Supabase만 저장됨');
    } else {
      console.log('✅ Supabase와 로컬 파일 모두 저장 성공');
    }
  }

  /**
   * 새로운 공고를 찾습니다.
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
   * 만료된 공고를 정리합니다.
   */
  async cleanupExpiredAnnouncements(
    announcements: StoredAnnouncement[] = [], 
    daysToKeep: number = 30
  ): Promise<StoredAnnouncement[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().slice(0, 10).replace(/-/g, '');

      console.log(`${daysToKeep}일 이전 공고 정리 중... (기준일: ${cutoffDateStr})`);

      // Supabase에서 만료된 공고 삭제 시도
      try {
        const { error: deleteError } = await supabase
          .from(this.tableName)
          .delete()
          .lt('pbanc_rcpt_end_dt', cutoffDateStr);

        if (!deleteError) {
          console.log('✅ Supabase에서 만료된 공고를 정리했습니다.');
        } else {
          console.warn('Supabase 만료 공고 정리 실패:', deleteError);
        }
      } catch (error) {
        console.warn('Supabase 만료 공고 정리 중 예외:', error);
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
    source: string;
  }> {
    try {
      const announcements = await this.loadPreviousAnnouncements();
      
      if (announcements.length === 0) {
        return {
          totalCount: 0,
          oldestDate: null,
          newestDate: null,
          source: 'Empty'
        };
      }

      const sortedDates = announcements
        .map(a => a.stored_at)
        .sort();

      return {
        totalCount: announcements.length,
        oldestDate: sortedDates[0],
        newestDate: sortedDates[sortedDates.length - 1],
        source: 'Hybrid (Supabase + Local)'
      };
    } catch (error) {
      console.error('저장소 통계 조회 실패:', error);
      return {
        totalCount: 0,
        oldestDate: null,
        newestDate: null,
        source: 'Error'
      };
    }
  }
}
