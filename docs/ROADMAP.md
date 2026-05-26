# Markdown Organizer — Roadmap

## M1 · 기반 구축 ✅ `feat/implementation`

> 앱의 핵심 골격 완성. 프로젝트 관리, 문서 렌더링, 레이아웃 시스템.

### 완료 항목

**디자인 시스템**
- Catppuccin 3-테마 (Dark / Black / Latte) — CSS 변수 기반 완전 교체
- 폰트: Geist (산세리프 UI), JetBrains Mono (코드), Literata Variable (지원 준비)
- Tailwind 컬러 전체를 `var(--color-*)` 로 교체 → 테마 전환 즉시 반영

**레이아웃**
- TitleBar: Rider 스타일 프로젝트 드롭다운 + 유형 배지 + 드래그 영역
- Sidebar: 아이콘 탭 (파일 / 검색 / 설정)
- 3단 패널 (파일 브라우저 / 뷰어 / 목차) — ResizeHandle 드래그 + 너비 영구 저장

**파일 브라우저**
- MD 파일이 없는 폴더 자동 제외
- Unity 프로젝트: `Library`, `Temp`, `Logs`, `obj`, `Build` 자동 제외
- 프로젝트 유형 자동 감지 (Unity / Unreal / Node / Rust / Python / AI / Docs)

**문서 뷰어**
- react-markdown v10 + remark-gfm + rehype-raw + rehype-slug
- CodeBlock: 문법 강조 (Shiki)
- MermaidDiagram: 동적 import + SVG React state 저장 (스크롤 안전)
- DocHeader: 뒤로/앞으로 버튼 + 신선도 배지 (fresh / warn / stale)
- 인라인 코드: 파란색 하이라이트
- 내부 링크 클릭 시 문서 이동 (히스토리 정상 관리)

**내비게이션 히스토리**
- `setFile` (히스토리 추가) / `loadFile` (히스토리 유지) 분리
- 뒤로/앞으로 클릭 → 올바른 인덱스 이동

**Handoff Note (2026-05-26 22:00):**
앱 실행 및 프로덕션 빌드 정상. 주요 렌더링 버그(Mermaid, StrictMode, 히스토리 파괴, 이중 히스토리, 테마 색상) 7건 수정 완료. SQLite vitest 테스트 5개는 Electron ↔ 시스템 Node ABI 불일치로 M1 이전부터 존재하는 실패 — 앱 동작 무관. M2에서 해결. 잔여 버그 3종(Mermaid 불안정, 코드 블록 미완, 파일 트리 nav 동기화)이 M2 목표. work-log: `docs/work-logs/2026-05-26-milestone-1-foundation.md`

---

## M2 · 버그 픽스 🐛 `fix/m2-polish`

> M1에서 미완성된 렌더링 품질 및 UX 동기화 문제 해결.

### 예정 항목

**Mermaid 렌더링 안정화**
- [ ] 일부 다이어그램 타입 미렌더링 문제 해결
- [ ] 느린 초기 렌더 개선 (initialize 위치 최적화)
- [ ] 스크롤 시 SVG 사라지는 현상 추가 검증
- [ ] 앱 전체 스크롤바 + 하단 빈 영역 발생 원인 제거

**코드 블록 개선**
- [ ] 복사 버튼 추가
- [ ] 줄 번호 표시 옵션
- [ ] 언어 배지 표시
- [ ] 긴 코드 접기/펼치기

**내비게이션 동기화**
- [ ] 뒤로/앞으로 클릭 시 좌측 파일 트리 선택 항목 동기화
- [ ] 파일 트리 자동 스크롤 → 현재 파일 위치로 이동
- [ ] 선택된 파일 시각적 강조 (뷰어에서 직접 열었을 때도 포함)

**테스트 인프라**
- [ ] `better-sqlite3` vitest ABI 불일치 해결 (Electron Node vs 시스템 Node)
- [ ] SQLite 레이어 mock 분리 또는 vitest electron 환경 설정

---

## M3 · 검색 기능 🔍 `feat/m3-search`

> 빠른 문서 탐색. Sidebar "검색" 탭 완성.

### 예정 항목

**전체 텍스트 검색**
- [ ] 파일 내용 기반 검색 (현재 프로젝트 범위)
- [ ] 결과 미리보기 (매칭 컨텍스트 1–2줄)
- [ ] 결과 클릭 → 해당 문서 열기

**파일명 / Heading 검색**
- [ ] 파일명 퍼지 검색
- [ ] Heading 검색 (`# H1`, `## H2` 추출)
- [ ] 결과 내 검색어 하이라이트

**UX**
- [ ] `Cmd+F` 단축키로 검색 패널 열기
- [ ] 검색 히스토리 (최근 N개)
- [ ] 인덱싱 상태 표시 (대규모 프로젝트 대응)

---

## 이후 고려 항목 (미정)

- 탭 시스템 (멀티 문서 열람)
- Git 연동 (변경 파일 강조, 브랜치 표시)
- AI 연동 (문서 요약, 오래된 내용 검출)
- 문서 그래프 (Obsidian 스타일)
- 커스텀 테마 / 사용자 CSS
