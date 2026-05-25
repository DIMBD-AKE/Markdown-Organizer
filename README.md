Markdown Organizer 기획 문서

1. 프로젝트 개요

프로젝트명

Markdown Organizer

목적

AI가 생성한 Markdown 문서를 사용자가 효율적으로 탐색, 열람, 관리할 수 있도록 지원하는 데스크탑 기반 문서 관리 프로그램.

단순한 Markdown 뷰어가 아니라 다음과 같은 문제 해결에 초점을 둔다.

* 프로젝트별 문서 구조 관리
* AI 생성 문서의 빠른 탐색
* 긴 문서의 목차 기반 이동
* 오래된 정보 식별
* 프로젝트 상태 유지
* 프로젝트 유형 자동 분석

⸻

2. 핵심 컨셉

Markdown Organizer는 다음 철학을 기반으로 설계된다.

2.1 AI 친화적 문서 관리

LLM(ChatGPT, Claude, Gemini 등)이 생성한 Markdown 파일은 일반 문서와 다르게:

* 구조가 깊음
* 목차 사용 빈도가 높음
* 코드 블록이 많음
* Mermaid 다이어그램 사용 빈도가 높음
* 프로젝트 단위로 관리됨

따라서 일반 파일 탐색기보다 “문서 탐색 중심 UX”를 제공해야 한다.

⸻

2.2 프로젝트 중심 구조

사용자는 여러 프로젝트를 등록하고 전환하며 사용한다.

예시:

* Game Design Docs
* Backend API Notes
* ECS Research
* AI Prompt Library
* Personal Wiki

각 프로젝트는 독립적인 상태를 유지한다.

⸻

2.3 상태 지속성(State Persistence)

프로그램을 종료했다가 다시 켜도 사용자는 이전 작업 흐름을 그대로 이어갈 수 있어야 한다.

예시:

* 마지막으로 열었던 문서
* 마지막 스크롤 위치
* 펼쳐진 폴더 상태
* 선택된 프로젝트
* 탭 상태

등을 모두 저장한다.

⸻

3. 주요 기능

⸻

3.1 프로젝트 관리 시스템

기능 설명

사용자는 여러 Markdown 프로젝트를 등록 가능.

각 프로젝트는 로컬 폴더 기반으로 관리된다.

⸻

주요 기능

프로젝트 등록

* 폴더 선택 방식
* 드래그 앤 드롭 지원
* 최근 프로젝트 목록 제공

⸻

프로젝트 정보 표시

프로젝트별 표시 항목:

항목	설명
프로젝트 이름	폴더명 기반
프로젝트 유형	자동 분석 결과
문서 수	Markdown 파일 개수
마지막 수정 시간	최신 파일 기준
아이콘/배지	유형별 시각화

⸻

프로젝트 상태 저장

프로젝트별 저장 정보:

* 마지막 열람 문서
* 마지막 스크롤 위치
* 펼쳐진 트리 상태
* 검색 기록
* 필터 상태
* 마지막 열람 시간

⸻

3.2 문서 브라우저 (Tree View)

기능 설명

프로젝트 내부 Markdown 파일을 트리 구조로 탐색 가능.

⸻

핵심 UX

폴더 구조 표시

예시:

Project
├── Docs (12)
│   ├── Design.md
│   ├── ECS.md
│   └── AI.md
├── API (5)
└── Notes (22)

⸻

폴더별 문서 수 표시

각 폴더 우측에 문서 개수 표시.

예시:

Design (14)

⸻

자동 확장 옵션

* 마지막 상태 복원
* 현재 문서 경로 자동 펼침
* 즐겨찾기 폴더 고정

⸻

정렬 옵션

지원 예정:

* 이름순
* 최근 수정순
* 최근 열람순
* 문서 수 기준
* 사용자 지정 정렬

⸻

필터 기능

지원 예정:

* Markdown 파일만
* 최근 수정 파일
* 오래된 문서
* Mermaid 포함 문서
* TODO 포함 문서

⸻

3.3 Markdown 문서 뷰어

기능 설명

Markdown 문서를 고급 렌더링 기능과 함께 제공.

⸻

지원 기능

Markdown 렌더링

지원 요소:

* Heading
* Table
* Blockquote
* Task List
* Footnote
* Table of Contents
* Link
* Image

⸻

코드 블록 렌더링

지원 기능:

* Syntax Highlight
* 코드 복사 버튼
* 줄 번호 표시
* 접기/펼치기

지원 언어 예시:

* C#
* C++
* Rust
* Python
* JavaScript
* TypeScript
* YAML
* JSON

⸻

Mermaid 지원

자동 렌더링:

```mermaid
graph TD
A --> B
```

지원 다이어그램:

* Flowchart
* Sequence Diagram
* ERD
* State Diagram
* Gantt

⸻

내부 링크 이동

지원:

[문서 링크](./docs/api.md)

기능:

* 클릭 시 문서 이동
* 히스토리 이동
* 뒤로가기/앞으로가기

⸻

이미지 지원

지원 방식:

* 상대 경로 이미지
* 드래그 확대
* 이미지 미리보기

⸻

3.4 목차 탐색창 (TOC Navigator)

기능 설명

문서 Heading 구조를 분석하여 네비게이션 제공.

⸻

주요 기능

자동 TOC 생성

예시:

1. Introduction
2. ECS Architecture
   2.1 Component
   2.2 System
3. Rendering

⸻

현재 위치 동기화

* 현재 읽는 섹션 자동 하이라이트
* 스크롤 기반 위치 추적

⸻

클릭 이동

TOC 클릭 시 해당 섹션으로 부드럽게 이동.

⸻

접기/펼치기

대규모 문서 대응.

⸻

Heading 검색

특정 섹션 검색 가능.

⸻

3.5 문서 상태 분석 시스템

목적

오래된 AI 문서를 빠르게 식별.

⸻

표시 방식

예시:

상태	기준
최신	3일 이내
주의	30일 이상
오래됨	90일 이상

⸻

UI 예시

Design.md
Updated 87 days ago

또는:

* 녹색 = 최신
* 노란색 = 주의
* 빨간색 = 오래됨

⸻

활용 목적

* AI 생성 문서 갱신
* 오래된 정보 확인
* 유지보수 우선순위 판단

⸻

3.6 테마 시스템

지원 테마

Dark Mode

기본 다크 테마.

⸻

Black Mode

OLED 친화 블랙 테마.

⸻

향후 예정

* 커스텀 테마
* VSCode 테마 호환
* 사용자 CSS

⸻

3.7 프로젝트 유형 분석 시스템

목적

프로젝트 내부 내용을 분석하여 유형 자동 판별.

⸻

예시 유형

유형	기준 예시
Unity	Assets/, ProjectSettings
Unreal	.uproject
Node.js	package.json
Rust	Cargo.toml
Python	requirements.txt
AI Research	prompts/, markdown-heavy
Documentation	docs/, wiki

⸻

분석 대상

* 파일명
* 폴더 구조
* 특정 키워드
* 코드 언어 비율
* 설정 파일 존재 여부

⸻

표시 방식

예시:

Unity Project
Rust Library
AI Documentation

⸻

사용자 정의 Config

별도 Config 파일 제공.

예시:

{
  "name": "Unity",
  "match": [
    "Assets/",
    "ProjectSettings/",
    "*.unity"
  ]
}

⸻

목표

* 프로젝트 식별 자동화
* 시각적 분류
* 필터링 기반 제공

⸻

4. 상태 저장 시스템

저장 대상

항목	저장 여부
등록 프로젝트	O
트리 펼침 상태	O
마지막 문서	O
마지막 스크롤 위치	O
탭 상태	O
최근 검색	O
테마	O

⸻

저장 방식 후보

Option A — JSON

장점:

* 단순
* 디버깅 용이

단점:

* 대규모 상태에 약함

⸻

Option B — SQLite

장점:

* 확장성 우수
* 검색 가능

단점:

* 구조 복잡

권장:
SQLite 기반.

⸻

5. UI 구조

전체 레이아웃

┌───────────────────────────────┐
│ Header                        │
├──────┬──────────────┬─────────┤
│      │              │         │
│Proj  │ Document     │ TOC     │
│List  │ Viewer       │ Panel   │
│      │              │         │
├──────┴──────────────┴─────────┤
│ Status Bar                    │
└───────────────────────────────┘

⸻

6. 추천 기술 스택

Frontend 후보

Electron + React

장점:

* 빠른 개발
* 풍부한 라이브러리
* Markdown 지원 우수

⸻

Tauri + React

장점:

* 가벼움
* 메모리 효율
* Rust 활용 가능

권장:
Tauri + React

⸻

Markdown 렌더링

추천:

* markdown-it
* remark
* rehype

⸻

코드 하이라이트

추천:

* Shiki
* PrismJS

⸻

Mermaid

추천:

* Mermaid.js

⸻

상태 관리

추천:

* Zustand
* Redux Toolkit

⸻

7. 향후 확장 기능

⸻

검색 시스템

지원 예정:

* 전체 프로젝트 검색
* Heading 검색
* 코드 검색
* TODO 검색

⸻

AI 연동

가능 기능:

* 문서 요약
* 오래된 내용 검출
* 자동 태그
* 문서 관계 분석

⸻

문서 그래프

Obsidian 스타일 관계 시각화.

⸻

탭 시스템

멀티 문서 열람 지원.

⸻

Git 연동

지원 예정:

* 변경 파일 강조
* 브랜치 상태 표시
* 마지막 커밋 정보

⸻

8. 성능 고려사항

대규모 프로젝트 대응

목표:

* 10,000+ 문서 대응
* 지연 없는 트리 탐색
* Lazy Loading 지원

⸻

캐싱 전략

대상:

* TOC 캐싱
* 렌더링 캐싱
* 프로젝트 분석 캐싱

⸻

9. 핵심 차별점

기존 Markdown Viewer	Markdown Organizer
단순 렌더링	프로젝트 기반 관리
파일 단위	AI 문서 워크플로우
기본 탐색	TOC 중심 탐색
상태 유지 약함	강력한 상태 지속성
프로젝트 분석 없음	자동 프로젝트 유형 분석

⸻

10. 최종 목표

Markdown Organizer는 단순 Markdown Viewer가 아니라:

“AI 시대의 프로젝트 문서 운영 환경”

을 목표로 한다.

특히:

* AI 생성 문서 증가
* 프로젝트 문서 복잡도 증가
* 지속적인 문서 갱신 필요성

에 대응하는 차세대 Markdown 워크스페이스를 지향한다.