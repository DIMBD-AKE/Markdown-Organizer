# 설계: 파일 정렬 · 목차 트리 · 자동업데이트 수정 · 가상 그룹화

날짜: 2026-06-07
상태: 승인됨

## 개요

4개 작업 묶음:

- **A.** 파일 브라우저 정렬 (이름/날짜 × 오름/내림, Natural Sort)
- **B.** 문서 목차 트리뷰 (chevron 접기/펴기 + 들여쓰기 가이드 라인)
- **C.** 자동 업데이트 동작 수정 (배포 플로우 코드 수정, 실제 재배포는 보류)
- **D.** 가상 그룹화 토글 (파일명 패턴 인식 → 표시용 가상 폴더)

공통 영속화 패턴: SQLite 키-값 (`getSetting`/`setSetting`), `App.tsx` 부팅 시 로드 — 테마/패널 폭과 동일.

---

## A. 파일 브라우저 정렬

### 목표
파일 트리를 이름순/날짜순 + 오름차순/내림차순으로 정렬. 이름은 Natural Sort (`2 < 10`).

### UI
`FileTreePanel` 헤더 영역에 컴팩트 `<select>` 2개:
- 필드: `이름` / `날짜`
- 순서: `오름차순` / `내림차순`

### 상태 / 영속화
`uiStore`에 추가:
- `sortField: 'name' | 'date'` (기본 `'name'`)
- `sortOrder: 'asc' | 'desc'` (기본 `'asc'`)
- `setSortField(f)`, `setSortOrder(o)`

설정키 `file_sort_field`, `file_sort_order`로 영속. `App.tsx` 부팅 로드에 추가. 변경 시 `setSetting` 저장. 전역(프로젝트 무관).

### 정렬 로직
신규 유틸 `src/renderer/src/utils/sortTree.ts`:

```ts
sortTree(nodes: FileNode[], field: 'name'|'date', order: 'asc'|'desc'): FileNode[]
```

- 재귀. 각 디렉토리의 children 정렬, 하위 디렉토리도 재귀 정렬.
- **폴더 우선(dirs-first)**: 폴더 그룹이 파일 그룹 위. 각 그룹 내부에서 field/order 적용.
- 이름: `new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })` → Natural Sort.
- 날짜: `modifiedAt` 숫자 비교.
- `order === 'desc'`면 각 그룹 비교 결과 반전 (폴더-우선 그룹핑은 유지).
- 순수 함수, 불변 (새 배열/노드 반환).

### 적용 위치
`FileTree.tsx` 렌더 단계, `flattenTree` 호출 직전:
```ts
const sorted = sortTree(tree.children ?? [], sortField, sortOrder)
const grouped = virtualGrouping ? groupTree(sorted, ...) : sorted   // D 참고
const items = flattenTree(grouped, expandedDirs)
```
재정렬 즉시 반영, 재요청 없음.

### 테스트
`sortTree`: natural sort (`a2 < a10`), dirs-first 유지, asc/desc, 날짜 정렬, 빈 배열/단일 노드.

---

## B. 문서 목차 트리뷰

### 목표
현재 `TocTree`/`TocItem`은 이미 중첩 들여쓰기 렌더. 추가: chevron 접기/펴기 + 들여쓰기 가이드 라인.

### TocItem 변경
- `item.children.length > 0`이면 chevron(`▸`/`▾`) 표시.
- chevron 클릭 → 접힘 토글 (`onToggle(id)`). 텍스트 클릭 → 기존대로 네비게이트(`onSelect`). 두 핸들러 분리.
- 접힘 시 children 미렌더.
- 들여쓰기 가이드 라인: 각 깊이마다 좌측 세로선 (`border-l border-surface0`), 파일 트리 시각 언어와 통일.

### 접힘 상태
`viewerStore`에 추가:
- `collapsedTocIds: Set<string>` (기본 빈 셋)
- `toggleTocCollapse(id)`
- 문서 변경(`setFile`) 시 `collapsedTocIds` 초기화 (전부 펼침).

### 활성 헤딩 자동 펼침
활성(`activeId`) 헤딩이 접힌 부모 안에 있으면 조상들을 펼쳐 보이게 함. `TocTree`에서 toc 구조 기반으로 `activeId`의 조상 id 집합 계산 → 해당 조상들을 `collapsedTocIds`에서 제외하고 렌더 (또는 effect로 자동 펼침).

### 테스트
조상 계산 헬퍼: 중첩 toc에서 특정 id의 조상 id 목록 반환. 접힘 토글 동작.

---

## C. 자동 업데이트 수정 (코드만, 배포 보류)

### 근본 원인
GitHub 릴리스(v1.1.7, v1.1.8)에 `latest-mac.yml` / `latest.yml` / `latest-linux.yml` 메타데이터 부재. 현재 에셋은 바이너리(zip/exe/AppImage)뿐. electron-updater는 yml 없이 버전 비교 불가 → 404 → `updater.ts`가 "업데이트 없음"으로 흡수(26-28행). 레포가 PUBLIC으로 전환됐어도 yml이 없어 여전히 동작 안 함.

원인: `release:*` 스크립트가 `--publish never`로 빌드 후 에셋 수동 업로드 → electron-builder가 yml 생성/업로드 안 함.

### 수정
1. **`package.json` release 스크립트**: `--publish never` → `--publish always` (또는 별도 publish 스크립트). `GH_TOKEN` 환경변수 필요. yml 자동 생성 + 릴리스 업로드.
   - 영향: `release:mac`, `release:win`, `release:linux`.
2. **`src/main/updater.ts` 에러 처리 완화**: 404/401 흡수는 비공개 레포 우회책이었음. 공개 전환 후엔 실제 에러를 가리면 안 됨.
   - 404(yml 진짜 없음/네트워크)는 graceful 유지하되, 그 외 에러는 `UPDATE_ERROR`로 표면화.
   - `console.warn`으로 원인 로깅 추가 (디버깅용).
3. **배포는 보류**. v1.1.8 재발행 안 함. 추가 기능 완성 후 배포할 때를 위한 재발행 절차를 문서화:
   - `GH_TOKEN` 설정 → `npm run release:mac` 등 → yml 포함 에셋 자동 업로드 확인.

### 비고
이번 작업에서 실제 빌드/배포/푸시 없음. 코드 변경만. 테스트는 updater 에러 분기 단위테스트(가능 범위).

---

## D. 가상 그룹화 (토글)

### 목표
파일명 패턴을 인식해 파일 브라우저에 **표시용** 가상 폴더 구성. 실제 파일 이동/생성 없음.

### 토글 / 영속화
`FileTreePanel` 헤더에 on/off 버튼. `uiStore`에 `virtualGrouping: boolean` (기본 `false`), `toggleVirtualGrouping()`. 설정키 `virtual_grouping`로 영속, 부팅 로드.

### 가상 노드 표현
`FileNode` 타입에 `isVirtual?: boolean` 추가. 가상 그룹 노드:
- `isDir: true`, `isVirtual: true`
- `path`: 합성 키 `<실제디렉토리경로>::group::<그룹키>` (expandedDirs/React key 충돌 방지, 실제 경로와 구분)
- `name`: 그룹 표시명 (날짜 키 또는 접두사 토큰)
- `children`: 매칭된 실제 파일 노드들
- `mdCount`: 자식 수

`FileTree.tsx` 클릭 핸들러: `node.isVirtual`이면 `toggleDir`만(펼침/접힘), `readFile` 호출 안 함.

### 감지 알고리즘 — `src/renderer/src/utils/groupTree.ts`
```ts
groupTree(nodes: FileNode[], enabled: boolean): FileNode[]
```
- **실제 폴더 단위**: 각 디렉토리의 **직속 파일** children만 그룹화 대상. 하위 디렉토리는 재귀 처리. 폴더는 그룹 대상 아님.
- 단계:
  1. **날짜 감지 (우선)**: 각 파일명 선두에서 날짜 추출. 지원 포맷:
     - `YYYY-MM-DD`, `YYYY_MM_DD`, `YYYY.MM.DD`, `YYYYMMDD`
     - 정규식 후 `YYYY-MM-DD` 키로 정규화. 유효 날짜 검증(월 1-12, 일 1-31).
  2. **공통 접두사 (날짜 없는 파일)**: 첫 구분자(`-`, `_`, 공백) 앞 토큰을 그룹 키 후보로.
  3. 같은 키를 가진 파일이 **2개 이상**일 때만 가상 그룹 생성. 1개면 loose(그룹 안 함).
  4. 그룹에 안 묶인 파일은 원래 위치(loose)로 디렉토리 직속에 남김.
- **자동 날짜 단위**: 한 디렉토리의 distinct 날짜(day) 그룹 수가 임계치 `MONTH_ROLLUP_THRESHOLD = 12` 초과 시, 날짜 키를 `YYYY-MM`(월)로 롤업해 재그룹.
- **출력 순서**: 가상 그룹도 일반 폴더처럼 취급되어 dirs-first + 정렬 규칙 적용. → `groupTree`는 `sortTree` **후** 적용하되, 생성된 가상 폴더 children/그룹 자체도 동일 field/order로 정렬. (구현: `groupTree`가 정렬 파라미터도 받아 내부 재정렬, 또는 group 후 한 번 더 sort.)

### 상호작용
- `pruneEmptyDirs`(스토어): 트리 빌드 단계라 영향 없음. groupTree는 렌더 단계 변환.
- `flattenTree`/`expandedDirs`: 합성 path로 그대로 동작. 가상 그룹 펼침 상태도 `expandedDirs` Set에 저장됨.
- 토글 OFF면 `groupTree` 미적용, 기존 트리 그대로.

### 테스트
`groupTree`:
- 날짜 4종 포맷 인식 + `YYYY-MM-DD` 정규화
- 2개 이상만 그룹, 단일 파일 loose
- 공통 접두사 그룹
- 월 롤업 임계치
- 하위 디렉토리 재귀
- `enabled=false`면 입력 그대로 반환
- 합성 path 형식

---

## 파일 변경 요약

신규:
- `src/renderer/src/utils/sortTree.ts` (+ 테스트)
- `src/renderer/src/utils/groupTree.ts` (+ 테스트)

수정:
- `src/renderer/src/stores/uiStore.ts` — sortField/sortOrder/virtualGrouping
- `src/renderer/src/stores/viewerStore.ts` — collapsedTocIds
- `src/renderer/src/types/index.ts` — `FileNode.isVirtual?`
- `src/renderer/src/App.tsx` — 신규 설정 부팅 로드 + 저장
- `src/renderer/src/components/FileTree/FileTreePanel.tsx` — 정렬 드롭다운 + 그룹 토글 헤더 UI
- `src/renderer/src/components/FileTree/FileTree.tsx` — sortTree+groupTree 적용, 가상 노드 클릭 분기
- `src/renderer/src/components/TocPanel/TocItem.tsx` — chevron + 가이드 라인
- `src/renderer/src/components/TocPanel/TocTree.tsx` — 접힘 상태/조상 펼침
- `src/main/updater.ts` — 에러 처리 완화 + 로깅
- `package.json` — release 스크립트 `--publish always`

## 비목표 (YAGNI)
- 실제 파일 이동/리네임 (가상 그룹은 표시만)
- 프로젝트별 정렬/그룹 설정 (전역만)
- 태그/카테고리 휴리스틱 그룹 (이번 범위 제외 — 날짜+공통접두사만)
- 이번 작업에서 실제 빌드/배포

## 디자인 시스템 비고
모든 UI(드롭다운, 토글 버튼, 가이드 라인, chevron)는 `docs/DESIGN.md` 토큰/색상(catppuccin surface/overlay/mauve/amber 등) 준수. 구현 전 `docs/DESIGN.md` 확인.
