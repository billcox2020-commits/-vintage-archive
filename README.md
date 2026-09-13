# ALL COLLECTOR ARCHIVE

사진과 소개를 중심으로 구성한 개인 빈티지 아카이브입니다.

- **ALL COLLECTION**: 처음에는 선정한 8건, 전체 기록과 Shoes / Outer / Top / Bottom / ETC 분류. 사진이나 제목을 누르면 상세 기록이 열립니다.
- **ALL COLLECTOR**: 아카이브 소개.
- **INFORMATION**: 블로그, Instagram, FruitsFamily, 읽을거리 링크.

## 편집

- `index.html`: 소개 문구, 큰 메뉴, 외부 링크.
- `assets/archive-room-cover.jpg`: 사용자가 선택한 커버 원본. 화면에서 전체 비율을 유지합니다.
- `assets/site.css`: PC / 모바일 화면.
- `assets/site.js`: 분류, 상세 기록, 가격 표시.
- `data/site.json`: `site_title`, 첫 8건의 순서를 정하는 `featured_ids`, `price_mode_default` (`hidden`, `sale`, `all`).
- `data/catalog.json`: 각 아이템의 제목, 이미지, 원문 링크, 연도, 사이즈, 설명, 게시일. `status`는 빈 값 또는 `for_sale`, `reserved`, `sold`, `archive`; `status_text`로 표시 문구를 지정할 수 있습니다.
- 가격은 기본적으로 숨깁니다. `price_krw`가 있는 항목만 표시하며, 판매 중만 표시할 때는 `status: for_sale`인 항목만 표시합니다.

## 자료 현황

공개 목록은 `data/personal-posts.json`의 개인 소장 기록과 `data/bunjang-active.json`의 판매중 매물만 사용합니다. 번개장터 목록은 올콜렉터 상점의 현재 검색 결과에서 `SELLING` 상태만 수집하고, 상품 ID와 정규화한 제목으로 중복을 제거합니다. 과거 후보·판매완료·예약 자료가 남아 있는 다른 JSON 파일은 공개 화면에 합치지 않습니다.

## 확인

`node --check assets/site.js`로 스크립트 문법을 확인합니다. GitHub Pages에서 `main` 브랜치 루트를 게시합니다.
