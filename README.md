# AI Career Roadmap

Gemini AI 기반의 인터랙티브 커리어 로드맵 생성 애플리케이션입니다. 사용자의 기술 스택과 목표를 분석하여 맞춤형 학습 경로를 제안합니다.

## 주요 기능

- 보유 기술 스택 선택 (JavaScript, React, Python 등)
- 목표 커리어 설정 (Frontend Dev, Backend Dev, AI Engineer, Data Scientist)
- Gemini AI 기반 맞춤형 로드맵 생성
- Canvas 기반 인터랙티브 시각화
- GSAP ScrollTrigger를 활용한 스크롤 애니메이션

## 기술 스택

- **Frontend**: React 19, Vite 7
- **Styling**: Tailwind CSS 4
- **Animation**: GSAP, Canvas API
- **Icons**: Lucide React
- **AI**: Google Gemini API

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## Gemini API 설정

`src/components/AiCareerRoadmap.jsx` 파일에서 API 키를 설정하세요:

```javascript
const apiKey = "YOUR_GEMINI_API_KEY";
```

API 키는 [Google AI Studio](https://aistudio.google.com/)에서 발급받을 수 있습니다.

## 프로젝트 구조

```
src/
├── main.jsx                 # 앱 진입점
├── App.jsx                  # 루트 컴포넌트
├── index.css                # 글로벌 스타일 (Tailwind)
└── components/
    └── AiCareerRoadmap.jsx  # 메인 컴포넌트
```

## 라이선스

ISC
