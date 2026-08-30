# 🎓 졸업전시 인스타그램 프로모션 웹 카메라 필터

인스타그램 Spark AR 서비스 종료에 대응하여 구축된 **웹 기반 AR 카메라 필터 & 프레임 합성 웹사이트**입니다.
혁오(HYUKOH) 프로모션 웹사이트 레퍼런스와 동일하게 브라우저에서 바로 카메라를 켜고, 졸업전시 프레임(PNG 또는 SVG)을 씌워 사진을 촬영한 뒤 인스타그램 스토리에 바로 공유할 수 있습니다.

---

## 📁 폴더 및 파일 구조

```
인스타 홍보 웹사이트/
├── index.html                   # 메인 웹페이지
├── css/
│   └── style.css                # 인스타그램 스타일 모바일 최적화 UI
├── js/
│   ├── config.js                # ⭐️ [중요] 프레임 목록, 전시회 정보, 해시태그 설정 파일
│   ├── camera.js                # 카메라 스트림 및 전/후면 전환 제어
│   ├── filterRenderer.js        # 실시간 비디오 + PNG/SVG 프레임 고화질 합성 엔진
│   ├── share.js                 # 인스타 스토리 공유, 다운로드, 해시태그 복사
│   └── app.js                   # 전체 UI 인터랙션 및 타이머, 사운드 제어
├── assets/
│   └── frames/                  # ⭐️ [중요] 디자인하신 PNG 또는 SVG 프레임 파일들을 넣는 폴더
│       ├── frame1_poster.svg    # 예시 포스터 프레임
│       ├── frame2_y2k.svg       # 예시 Y2K 캠코더 프레임
│       ├── frame3_4cut.svg      # 예시 4컷 프레임
│       └── frame4_minimal.svg   # 예시 미니멀 프레임
├── start_server.ps1             # 로컬 테스트용 원클릭 서버 실행기
└── README.md                    # 사용 설명서
```

---

## 🎨 직접 제작한 PNG 또는 SVG 프레임 적용 방법

### 1단계: 디자인 에셋 준비 (PNG / SVG)
- **권장 해상도/비율**: `1080 x 1920 px` (스마트폰 화면 및 인스타 스토리 9:16 최적 비율)
- **투명 배경**: 카메라 영상이 비쳐야 하므로 배경은 반드시 **투명(Transparent)** 처리되어야 합니다.
- **제작 툴**: 포토샵, 일러스트레이터, 피그마(Figma) 등에서 작업 후 `.png` 또는 `.svg`로 내보내기

### 2단계: 파일 넣기
- 제작하신 파일을 `assets/frames/` 폴더 안에 복사해 넣습니다.
  - 예: `assets/frames/my_exhibition_frame.png`

### 3단계: `js/config.js`에 등록하기
`js/config.js` 파일을 열고 `frames` 배열에 정보를 추가/수정합니다.

```javascript
frames: [
  {
    id: "my_frame_1",
    name: "우리 졸전 프레임",
    src: "assets/frames/my_exhibition_frame.png", // 여기에 넣은 파일명 입력
    icon: "✨",
    colorEffect: "none" // 'none', 'warm', 'vintage', 'bw', 'y2k' 중 선택
  },
  // 원하는 만큼 계속 추가하실 수 있습니다!
]
```

### 4단계: 전시회 정보 및 해시태그 변경
`js/config.js` 상단에서 전시명, 인스타 계정, 해시태그를 우리 팀 정보로 변경합니다:

```javascript
exhibition: {
  title: "2026 XX대학교 졸업전시회",
  subtitle: "GRADUATION EXHIBITION",
  instagramId: "@your_exhibition_account", // 홍보팀 공식 인스타 계정
  hashtags: ["#XX대졸전", "#졸업전시", "#이벤트참여"]
}
```

---

## 🚀 로컬 테스트 방법 (내 컴퓨터에서 확인)

1. `start_server.ps1` 파일을 마우스 우클릭 -> **[PowerShell에서 실행]** 선택
2. 자동으로 브라우저(`http://localhost:8080`)가 열리며 웹캠/카메라가 작동합니다.
3. 스마트폰 모바일 뷰로 확인하고 싶으시다면 브라우저에서 `F12` (개발자 도구)를 누르고 **모바일 디바이스 툴(Ctrl+Shift+M)**을 켜세요.

---

## 🌐 무료 웹 배포 방법 (스마트폰 접속용 https:// 주소 만들기)

방문자가 스마트폰으로 접속하려면 `https://` 보안 프로토콜이 적용된 웹 호스팅에 올려야 카메라 권한이 승인됩니다. 아래 서비스 중 하나로 1분 만에 무료 배포할 수 있습니다:

### 방법 1: Vercel 또는 Netlify (가장 추천, 1분 완료)
1. [vercel.com](https://vercel.com) 또는 [netlify.com](https://www.netlify.com)에 무료 가입
2. 이 `인스타 홍보 웹사이트` 폴더를 화면에 **드래그 앤 드롭**하면 즉시 배포 완료!
3. 생성된 `https://xxx.vercel.app` 링크를 인스타그램 프로필 링크(Linktree 등), 스토리 링크 스티커, 전시장 QR 코드로 사용하시면 됩니다.

### 방법 2: GitHub Pages
1. GitHub 저장소 생성 후 이 폴더의 파일들을 업로드 (Push)
2. 저장소 Settings -> Pages -> Source를 `main` 브랜치로 선택하여 저장
3. `https://username.github.io/repo-name/` 주소로 즉시 서비스 가능
