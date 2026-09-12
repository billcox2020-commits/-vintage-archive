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

현재 공개 목록: 번개장터 11건 + 후루츠 3건 = 14건. 후루츠는 분야 균형을 위해 캠프캡, 폴로 데님 셔츠, 빅나이키를 선정했습니다. 블로그 3건과 Instagram 3건의 사진·본문 확보는 아직 완료하지 않았습니다. 번개장터 2건의 사진 주소도 미확보입니다. 확인되지 않은 게시일이나 이미지는 추측해 넣지 않습니다.

기존 `data/bunjang.json`, `data/fruitsfamily.json`, `data/sources.json`에는 과거 수집 기록과 후보가 남아 있습니다. 실제 화면에는 `data/catalog.json`의 항목만 표시합니다.

## 확인

`node --check assets/site.js`로 스크립트 문법을 확인합니다. GitHub Pages에서 `main` 브랜치 루트를 게시합니다.
