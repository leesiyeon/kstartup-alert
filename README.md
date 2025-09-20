# 🚀 K-startup 알림 시스템

K-startup 지원공고를 자동으로 모니터링하고 새로운 공고가 등록되면 텔레그램으로 알림을 보내주는 시스템입니다.

## ✨ 주요 기능

- 📋 **자동 공고 모니터링**: 1시간마다 K-startup API를 호출하여 새로운 공고 확인
- 🤖 **텔레그램 알림**: 새로운 공고 발견 시 텔레그램 메시지 자동 발송
- 💾 **데이터 관리**: 이전 공고와 비교하여 중복 알림 방지
- 🎛️ **웹 인터페이스**: 직관적인 웹 UI로 시스템 제어 및 모니터링
- 🔧 **연결 테스트**: API 및 텔레그램 봇 연결 상태 확인

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **스케줄링**: node-cron
- **HTTP 클라이언트**: Axios
- **데이터 저장**: JSON 파일 (로컬)

## 📦 설치 및 설정

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone <repository-url>
cd kstartup-alarm
npm install
```

### 2. 환경변수 설정

`env.example` 파일을 참고하여 환경변수를 설정하세요:

```bash
# .env.local 파일 생성
cp env.example .env.local
```

필수 환경변수:
- `KSTARTUP_SERVICE_KEY`: K-startup API 서비스 키
- `TELEGRAM_BOT_TOKEN`: 텔레그램 봇 토큰
- `TELEGRAM_CHAT_ID`: 텔레그램 채팅 ID

### 3. 텔레그램 봇 설정

1. [@BotFather](https://t.me/botfather)에게 `/newbot` 명령어로 새 봇 생성
2. 봇 토큰을 `TELEGRAM_BOT_TOKEN`에 설정
3. 봇과 채팅을 시작하고 채팅 ID 확인:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
4. 채팅 ID를 `TELEGRAM_CHAT_ID`에 설정

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 웹 인터페이스를 확인하세요.

## 🚀 Vercel 배포 (24/7 자동 알림)

로컬에서만 실행하지 않고 24시간 자동으로 알림을 받으려면 Vercel에 배포하세요.

### 1. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 테이블 생성:

```sql
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  pbanc_sn INTEGER NOT NULL,
  biz_pbanc_nm TEXT NOT NULL,
  pbanc_rcpt_bgng_dt TEXT NOT NULL,
  pbanc_rcpt_end_dt TEXT NOT NULL,
  stored_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_announcements_pbanc_sn ON announcements(pbanc_sn);
CREATE INDEX idx_announcements_stored_at ON announcements(stored_at);
```

3. Project Settings > API에서 URL과 anon key 복사

### 2. Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 배포
vercel

# 환경변수 설정 후 재배포
vercel --prod
```

### 3. Vercel 환경변수 설정

Vercel 대시보드 > Settings > Environment Variables에서 설정:

```
KSTARTUP_API_URL=https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01
KSTARTUP_SERVICE_KEY=09f5a7b5a5af650bd27f560897cfa5264b88bef6029e6f01572b76717d6292ec
TELEGRAM_BOT_TOKEN=8206495802:AAF8SrzpDedmL_aGlpGfoLB3WBCLqj82eCc
TELEGRAM_CHAT_ID=6158934104
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 자동 스케줄링

`vercel.json` 파일에 설정된 Cron Job이 **매시간 정각**에 자동으로 새 공고를 확인합니다:

```json
{
  "crons": [
    {
      "path": "/api/notifications/check",
      "schedule": "0 * * * *"
    }
  ]
}
```

배포 완료 후 더 이상 로컬 서버를 실행할 필요 없이 자동으로 알림을 받을 수 있습니다! 🎉

## 🎮 사용법

### 웹 인터페이스

1. **연결 테스트**: 모든 API 및 텔레그램 연결 상태 확인
2. **새 공고 확인**: 수동으로 새로운 공고 확인 및 알림 전송
3. **현재 공고 전송**: 진행 중인 공고 목록을 텔레그램으로 전송
4. **스케줄러 제어**: 자동 모니터링 시작/중지
5. **즉시 실행**: 스케줄러를 즉시 한 번 실행

### API 엔드포인트

#### 공고 관련
- `POST /api/notifications/check`: 새로운 공고 확인 및 알림 전송
- `POST /api/notifications/send-current`: 현재 진행 중인 공고 전송

#### 스케줄러 관련
- `GET /api/scheduler`: 스케줄러 상태 조회
- `POST /api/scheduler`: 스케줄러 제어
  - `{ "action": "start" }`: 시작
  - `{ "action": "stop" }`: 중지
  - `{ "action": "run-once" }`: 즉시 실행

#### 테스트
- `GET /api/test/connections`: 연결 상태 테스트

## 📁 프로젝트 구조

```
kstartup-alarm/
├── src/
│   ├── app/
│   │   ├── api/              # API 라우트
│   │   │   ├── notifications/
│   │   │   ├── scheduler/
│   │   │   └── test/
│   │   ├── page.tsx          # 메인 웹 인터페이스
│   │   └── layout.tsx
│   └── lib/
│       ├── services/         # 핵심 서비스들
│       │   ├── kstartup-api.ts      # K-startup API 서비스
│       │   ├── telegram-bot.ts      # 텔레그램 봇 서비스
│       │   ├── storage-service.ts   # 데이터 저장 서비스
│       │   └── notification-service.ts # 통합 알림 서비스
│       └── scheduler.ts      # 스케줄러 서비스
├── data/                     # 공고 데이터 저장소
└── env.example              # 환경변수 예시
```

## 🔧 설정 옵션

### 스케줄러 설정
- **실행 주기**: 매시간 정각 (cron: `0 0 * * * *`)
- **시간대**: Asia/Seoul

### 데이터 관리
- **저장 위치**: `./data/previous_announcements.json`
- **자동 정리**: 30일 이상 된 만료 공고 자동 삭제

### 알림 설정
- **메시지 형식**: Markdown
- **전송 간격**: 2초 (다중 메시지 전송 시)
- **링크 미리보기**: 비활성화

## 🚨 문제 해결

### 일반적인 오류

1. **환경변수 오류**
   - `.env.local` 파일이 올바르게 설정되었는지 확인
   - 서버 재시작 후 다시 시도

2. **텔레그램 연결 오류**
   - 봇 토큰이 올바른지 확인
   - 채팅 ID가 정확한지 확인
   - 봇이 채팅방에 추가되어 있는지 확인

3. **API 호출 오류**
   - K-startup API 서비스 키가 유효한지 확인
   - 네트워크 연결 상태 확인

### 로그 확인

개발 모드에서는 콘솔에서 상세한 로그를 확인할 수 있습니다:

```bash
npm run dev
```

## 📝 라이센스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 등록해 주세요.

---

**⚠️ 주의사항**
- 텔레그램 봇 토큰과 채팅 ID는 절대 공개하지 마세요.
- K-startup API 서비스 키는 공식 사이트에서 발급받으세요.
- 과도한 API 호출을 방지하기 위해 적절한 간격을 유지하세요.