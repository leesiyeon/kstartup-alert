import axios from 'axios';

export interface KstartupAnnouncement {
  id: number;
  pbanc_sn: number;
  biz_pbanc_nm: string;
  pbanc_ctnt: string;
  pbanc_ntrp_nm: string;
  pbanc_rcpt_bgng_dt: string;
  pbanc_rcpt_end_dt: string;
  supt_biz_clsfc: string;
  supt_regin: string;
  detl_pg_url: string;
  aply_mthd_onli_rcpt_istc: string | null;
  biz_enyy: string;
  biz_trgt_age: string;
  aply_trgt_ctnt: string;
  rcrt_prgs_yn: string;
}

export interface KstartupApiResponse {
  currentCount: number;
  data: KstartupAnnouncement[];
  matchCount: number;
  page: number;
  perPage: number;
  totalCount: number;
}

export class KstartupApiService {
  private readonly apiUrl: string;
  private readonly serviceKey: string;

  constructor() {
    this.apiUrl = process.env.KSTARTUP_API_URL || 'https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01';
    this.serviceKey = process.env.KSTARTUP_SERVICE_KEY || '';
    
    if (!this.serviceKey) {
      throw new Error('KSTARTUP_SERVICE_KEY가 설정되지 않았습니다.');
    }
  }

  /**
   * K-startup 공고 정보를 가져옵니다.
   * @param perPage 페이지당 항목 수 (기본값: 50)
   * @param page 페이지 번호 (기본값: 1)
   * @returns 공고 목록
   */
  async getAnnouncements(perPage: number = 50, page: number = 1): Promise<KstartupApiResponse> {
    try {
      const params = {
        serviceKey: this.serviceKey,
        returnType: 'json',
        perPage,
        page
      };

      console.log('K-startup API 호출 중...', { perPage, page });
      
      const response = await axios.get<KstartupApiResponse>(this.apiUrl, {
        params,
        headers: {
          'accept': '*/*'
        },
        timeout: 10000 // 10초 타임아웃
      });

      if (!response.data || !response.data.data) {
        throw new Error('API 응답 형식이 올바르지 않습니다.');
      }

      console.log(`K-startup API 호출 성공: ${response.data.currentCount}개 공고 조회`);
      
      return response.data;
    } catch (error) {
      console.error('K-startup API 호출 실패:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`API 호출 실패: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          throw new Error('API 서버에 연결할 수 없습니다.');
        }
      }
      
      throw new Error('K-startup API 호출 중 오류가 발생했습니다.');
    }
  }

  /**
   * 진행 중인 공고만 필터링합니다.
   * @param announcements 전체 공고 목록
   * @returns 진행 중인 공고 목록
   */
  filterOngoingAnnouncements(announcements: KstartupAnnouncement[]): KstartupAnnouncement[] {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    return announcements.filter(announcement => {
      // 모집 진행 여부가 'Y'이고, 접수 종료일이 오늘 이후인 공고만 필터링
      return announcement.rcrt_prgs_yn === 'Y' && 
             announcement.pbanc_rcpt_end_dt >= todayStr;
    });
  }

  /**
   * 공고를 포맷팅하여 읽기 쉬운 형태로 변환합니다.
   */
  formatAnnouncement(announcement: KstartupAnnouncement): string {
    const startDate = this.formatDate(announcement.pbanc_rcpt_bgng_dt);
    const endDate = this.formatDate(announcement.pbanc_rcpt_end_dt);
    
    return `
🆕 **새로운 K-startup 공고**

📋 **공고명**: ${announcement.biz_pbanc_nm}
🏢 **주관기관**: ${announcement.pbanc_ntrp_nm}
📅 **접수기간**: ${startDate} ~ ${endDate}
🏷️ **지원분야**: ${announcement.supt_biz_clsfc}
🌍 **지원지역**: ${announcement.supt_regin}
👥 **사업연차**: ${announcement.biz_enyy}

📝 **공고내용**: 
${announcement.pbanc_ctnt}

🔗 **상세보기**: ${announcement.detl_pg_url}
${announcement.aply_mthd_onli_rcpt_istc ? `📝 **온라인접수**: ${announcement.aply_mthd_onli_rcpt_istc}` : ''}

---
    `.trim();
  }

  /**
   * 날짜를 YYYYMMDD 형식에서 YYYY-MM-DD 형식으로 변환합니다.
   */
  private formatDate(dateStr: string): string {
    if (dateStr.length !== 8) return dateStr;
    
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
}
