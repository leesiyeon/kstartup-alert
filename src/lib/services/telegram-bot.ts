import axios from 'axios';

export class TelegramBotService {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly apiUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN이 설정되지 않았습니다.');
    }
    
    if (!this.chatId) {
      throw new Error('TELEGRAM_CHAT_ID가 설정되지 않았습니다.');
    }
    
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * 텔레그램으로 메시지를 전송합니다.
   * @param message 전송할 메시지
   * @param parseMode 메시지 파싱 모드 (기본값: Markdown)
   */
  async sendMessage(message: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<void> {
    try {
      const url = `${this.apiUrl}/sendMessage`;
      
      const payload = {
        chat_id: this.chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true // 링크 미리보기 비활성화
      };

      console.log('텔레그램 메시지 전송 중...');
      
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10초 타임아웃
      });

      if (!response.data.ok) {
        throw new Error(`텔레그램 API 오류: ${response.data.description || 'Unknown error'}`);
      }

      console.log('텔레그램 메시지 전송 성공');
    } catch (error) {
      console.error('텔레그램 메시지 전송 실패:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const errorData = error.response.data;
          throw new Error(`텔레그램 API 오류: ${errorData.description || error.response.statusText}`);
        } else if (error.request) {
          throw new Error('텔레그램 서버에 연결할 수 없습니다.');
        }
      }
      
      throw new Error('텔레그램 메시지 전송 중 오류가 발생했습니다.');
    }
  }

  /**
   * 여러 메시지를 순차적으로 전송합니다.
   * @param messages 전송할 메시지 배열
   * @param delay 메시지 간 지연 시간(ms) - 기본값: 1000ms
   */
  async sendMultipleMessages(messages: string[], delay: number = 1000): Promise<void> {
    for (let i = 0; i < messages.length; i++) {
      await this.sendMessage(messages[i]);
      
      // 마지막 메시지가 아니면 지연
      if (i < messages.length - 1) {
        await this.sleep(delay);
      }
    }
  }

  /**
   * 봇의 정보를 가져옵니다. (연결 테스트용)
   */
  async getBotInfo(): Promise<any> {
    try {
      const url = `${this.apiUrl}/getMe`;
      
      const response = await axios.get(url, {
        timeout: 5000
      });

      if (!response.data.ok) {
        throw new Error(`텔레그램 API 오류: ${response.data.description || 'Unknown error'}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('봇 정보 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 채팅 정보를 가져옵니다. (연결 테스트용)
   */
  async getChatInfo(): Promise<any> {
    try {
      const url = `${this.apiUrl}/getChat`;
      
      const response = await axios.post(url, {
        chat_id: this.chatId
      }, {
        timeout: 5000
      });

      if (!response.data.ok) {
        throw new Error(`텔레그램 API 오류: ${response.data.description || 'Unknown error'}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('채팅 정보 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 연결 테스트를 수행합니다.
   */
  async testConnection(): Promise<{ success: boolean; message: string; botInfo?: any; chatInfo?: any }> {
    try {
      const botInfo = await this.getBotInfo();
      console.log('봇 정보:', botInfo);

      const chatInfo = await this.getChatInfo();
      console.log('채팅 정보:', chatInfo);

      // 테스트 메시지 전송
      await this.sendMessage('🤖 K-startup 알림 봇이 정상적으로 연결되었습니다!');

      return {
        success: true,
        message: '텔레그램 봇 연결이 성공했습니다.',
        botInfo,
        chatInfo
      };
    } catch (error) {
      return {
        success: false,
        message: `텔레그램 봇 연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 지연 함수
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
