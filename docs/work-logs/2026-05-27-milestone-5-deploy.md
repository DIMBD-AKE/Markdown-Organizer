# M5 Work Log — 배포 준비

**브랜치:** `feat/m5-deploy` → main (PR #1)  
**완료:** 2026-05-27  
**릴리즈:** [v1.0.0](https://github.com/DIMBD-AKE/Markdown-Organizer/releases/tag/v1.0.0)

---

## 구현 내용

### 패키징 설정 (electron-builder.config.ts)
- appId, productName, copyright, publish(GitHub) 설정
- macOS: DMG (arm64 + x64), 아이콘, category, darkModeSupport
- Windows: NSIS x64, oneClick:false, 설치 디렉터리 선택 허용
- Linux: AppImage x64 (deb 제외 — Snap Store 자동 publish 트리거 문제)
- better-sqlite3 asarUnpack 필수 (네이티브 모듈, asar 내부에서 로드 불가)

### 자동 업데이트 (electron-updater)
- `src/main/updater.ts`: setupAutoUpdater(), checkForUpdates(), installUpdate()
- IPC 채널 7개: CHECK_FOR_UPDATES, INSTALL_UPDATE, UPDATE_AVAILABLE, UPDATE_NOT_AVAILABLE, UPDATE_PROGRESS, UPDATE_DOWNLOADED, UPDATE_ERROR
- `src/main/ipc/updater.ts`: ipcMain.handle 등록
- `src/preload/index.ts`: contextBridge 노출
- `src/preload/api.d.ts`: window.api 타입 선언
- `src/renderer/.../SettingsPanel.tsx`: 7-state UI
- autoDownload: true (download 버튼 구현 없이 흐름 완성)

### CI/CD
- `.github/workflows/release.yml`: v* 태그 → 3플랫폼 병렬 빌드 + publish
- `.github/workflows/ci.yml`: push/PR 테스트 + 빌드 검증
- `scripts/python`: macOS DMG 빌더용 Python 래퍼 (시스템 python3 고정)

---

## 트러블슈팅

### macOS 로컬 빌드: `which python` 실패
dmg-builder가 `python` 호출 → 현대 macOS에 없음. Homebrew Python 3.14: `ImportError: dlopen(pyexpat...)` (libexpat 버전 불일치).  
**해결:** `scripts/python` → `/usr/bin/python3` (시스템 Python 3.9) + `build:mac`에서 PATH 앞에 scripts/ 추가

### CI: `node:sqlite` 없음
Node 20에서 node:sqlite 미지원 (Node 22.5+ 전용).  
**해결:** ci.yml + release.yml Node 20→22 업그레이드

### Release macOS: "not a file" 에러
`CSC_LINK: ${{ secrets.CSC_LINK }}` → 시크릿 미설정 시 빈 문자열 → electron-builder가 빈 문자열을 파일 경로로 해석.  
**해결:** CSC 관련 env 전체 제거 + `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` 추가

### Release Linux: Snap Store publish 실패
`['AppImage', 'deb']` 타겟임에도 electron-builder 24.x가 Snap Store 자동 publish 시도. snapcraft 미설치 → 실패.  
**해결:** deb 제거, AppImage only (`{ target: 'AppImage', arch: ['x64'] }`)

### GitHub Release Draft 상태
워크플로 실패로 Release가 Draft로 남음. 실제로 세 플랫폼 아티팩트는 모두 업로드 완료.  
**해결:** `gh release edit v1.0.0 --draft=false`로 수동 publish

---

## 배포 결과

| 플랫폼 | 파일 | 상태 |
|--------|------|------|
| macOS | markdown-organizer-1.0.0-arm64.dmg | ✅ |
| Windows | markdown-organizer-Setup-1.0.0.exe | ✅ |
| Linux | markdown-organizer-1.0.0.AppImage | ✅ |
| 자동업데이트 | latest.yml, latest-mac.yml | ✅ |

---

## 잔여 버그 → M6

실배포 테스트 후 확인된 이슈:
1. Windows 렉 (프로젝트 등록/오픈, 문서 클릭)
2. macOS "손상된 파일" (무서명 arm64 → Gatekeeper 차단)
3. macOS 트래픽 라이트 없음 (커스텀 타이틀바)
4. README 배지 미표시
5. 버전 체크 404
6. 요구사항: Windows 포터블 exe

→ `docs/ROADMAP.md` M6 섹션 참조
