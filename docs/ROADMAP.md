# Product Roadmap v2 — Threads/X Knowledge Base

> **Mission**: 플랫폼(Threads·X)의 자료를 **저장하고 → 정리하고 → 데이터화하고 → 지식을 연결해 → 보고 찾고 → 활용**한다.
> 한 줄 정체성 목표: **"피드 뷰어"에서 "지식 베이스(Second Brain)"로.**
>
> v2 = 초안 + 아키텍처 리뷰 + 제품(PO) 리뷰를 반영한 보충판. 변경점은 §7에 정리.

---

## ✅ 구현 현황 (Implemented)

지식 레이어 핵심(M1~M3의 데이터화·연결·찾기·활용)을 **기존 파일 스토어 + 인메모리 벡터 인덱스** 위에 구현 완료
(SQLite는 스케일이 요구할 때까지 보류 — 현 규모에선 인메모리로 충분). AI 키 없이도 **로컬 폴백**(휴리스틱 enricher +
결정론적 임베더)으로 전 기능 작동, 키 설정 시 풍부해짐. 142 테스트 통과, 프로덕션 빌드 green, 실데이터 E2E 검증 완료.

| 동사 | 구현 | 핵심 파일 |
|---|---|---|
| **데이터화** | Enrich 파이프라인(요약·토픽·엔티티·type·lang·keepScore), promptVersion 재보강, 배치·재시도 | `lib/pipeline.ts`, `lib/ai/enrich.ts`, `lib/enrichmentStore.ts`, `app/api/enrich` |
| **찾기** | 임베딩(Gemini/로컬) + 의미검색, `/search` "Related by meaning" | `lib/ai/embed.ts`, `lib/embeddingStore.ts`, `lib/semanticSearch.ts` |
| **연결** | 카드별 Related 패널, `/topics` 자동 토픽 허브 | `app/api/related`, `components/RelatedPosts.tsx`, `app/topics` |
| **정리** | 트리아지 인박스(inbox→keep/archive/discard) | `lib/captureStateStore.ts`, `app/inbox`, `app/api/posts/state` |
| **활용** | Ask-my-archive(top-k 검색 + 인용 합성, 폴백) | `app/api/ask`, `components/AskClient.tsx` |
| **산출(P1)** | 컬렉션(묶음) → AI 합성 노트(저장) → Markdown/Obsidian 내보내기 | `lib/collectionStore.ts`, `lib/export.ts`, `app/collections`, `app/api/collections/*` |
| **신뢰(P1)** | 휴먼인더루프 — 카드에서 AI 토픽 추가/삭제(재보강에도 보존) | `lib/enrichmentStore.ts`(addTopic/removeTopic/edited), `app/api/posts/enrichment`, `components/PostTopics.tsx` |
| **연결(P2)** | 엔티티 허브 `/entities`, 토픽 co-occurrence(관련 토픽) | `lib/enrichmentStore.ts`(entityCounts/keysWithEntity/relatedTopics), `app/entities` |
| **지표(P2)** | 노스스타 대시보드 `/stats`(커버리지·신호비·트리아지·연결) | `lib/stats.ts`, `app/stats` |
| **영속(P2)** | 미디어 로컬 보관(크롤 시 다운로드, 로컬 서빙, SSRF 가드·용량캡, `ARCHIVE_MEDIA=1`) | `lib/mediaArchive.ts`, `app/api/media`, 크롤 경로 통합 |
| **연결(P3)** | 토픽 그래프 뷰(의존성 없는 SVG 포스 레이아웃) | `lib/enrichmentStore.ts`(topicGraph), `app/graph`, `components/TopicGraphView.tsx` |
| **신뢰(P3)** | 토픽 병합(동의어 통합, 재보강 보존) | `lib/enrichmentStore.ts`(mergeTopic), `components/TopicMerge.tsx` |
| **영속(P3)** | 원본 삭제 보존 — 크롤 시 사라진 글을 "📦 preserved"로 표시 | `lib/preservedStore.ts`(reconcilePreservation), 크롤 경로 통합, PostCard 배지 |
| **영속(P4)** | 백업/복원 — 전체 지식 베이스를 단일 JSON으로 다운로드·복원(경로 가드) | `lib/backup.ts`, `app/api/backup`, `components/BackupPanel.tsx` |
| **시간(P4)** | 타임라인 — 일별 활동 스트립, "on this day", 날짜 섹션 피드 | `lib/timeline.ts`, `app/timeline` |
| **활용(P5)** | 다이제스트 — 최근 N일 캡처의 "week in review"(AI) + 통계 | `lib/digest.ts`, `app/digest`, `app/api/digest` |
| **온보딩(P5)** | 빈 아카이브 시 4단계 시작 가이드(add→enrich→connect→use) | `components/GettingStarted.tsx`, `app/page.tsx` |

**남은 항목**: SQLite 전환(수천 포스트 도달 시)뿐. 파일 스토어 + 인메모리 인덱스로 현 규모에선 충분하며,
사용자 가치를 더하지 않는 고위험 작업이라 실제 스케일 요구 시 착수 권장.

---

## 0. 진단 요약

미션을 **6개 동사**로 평가 (v1의 5개 → "활용"을 추가):

| 동사 | 현재 성숙도 | 핵심 결함 |
|---|---|---|
| **저장 Capture** | 🟡 70% | 미디어 영속성 없음(핫링크·서명URL 만료), **신호/노이즈·근접중복 게이트 없음**, 원본 삭제 보존 안 됨 |
| **정리 Organize** | 🟡 40% | 100% 수동 태깅, **트리아지 인박스 없음**, 컬렉션 계층 없음, 규모에서 붕괴 |
| **데이터화 Structure** | 🔴 15% | 생 텍스트 그대로, AI 보강 없음, 구조 필드 없음 |
| **연결 Connect** | 🔴 5% | 백링크·관련글·엔티티·그래프 전무 — **미션의 심장이 비어있음** |
| **찾기 Find** | 🟡 30% | `String.includes()` substring만, 의미검색·필터 없음 |
| **활용 Use** | 🔴 0% | **Ask-my-archive(Q&A·RAG) 없음** — 지식을 *질문에 답하는 데* 못 씀 |

> v1 진단은 Capture를 90%로 봤으나, 리뷰 결과 **"무엇이든 캡처하면 지식"이라는 잘못된 전제** 위에 있었다. 신호/노이즈 필터·근접중복 dedup이 없으면 색인이 오염되어 하류 모든 기능이 열화된다. → Capture 70%로 하향.

**결론**: 수집의 *양*은 됐으나 *질*과 그 위 5개 층이 비어 있다. 단일 최대 레버리지는 여전히 **"수집 후 AI 데이터화"** 지만, 반드시 **(a) 크롤과 분리된 비동기 단계**로, **(b) 영속 저장소(SQLite) 위에서** 돌아야 한다.

---

## 1. 토대 — 데이터·아키텍처 (Enabling Foundations)

기능 전에 깔아야 할 토대. **순서 정정**: 영속 저장소가 임베딩/보강보다 **먼저**다 (v1의 모순 수정).

### 1.0 영속 저장소 우선 (SQLite) — **M1로 승격** ⬆️
v1은 SQLite를 P2에 뒀으나, P0의 임베딩·관련글·토픽허브가 전부 쿼리/벡터 인덱스에 의존 → **토대를 먼저 깐다.**
- `better-sqlite3`(동기, 서버 전용). 스토어 시그니처가 동기(`getSavedPosts(): Post[]`, `getTagMap(): TagMap`)라 **호출부 무변경 교체 가능** — 단, 아래 주의:
  - ⚠️ **`better-sqlite3`는 네이티브 바이너리 → Vercel/Edge 서버리스에서 동작 안 함.** 로컬 `npm start` 전제. 배포가 필요해지면 `@libsql/client`(Turso) 경로로 갈아탈 수 있게 스토어 어댑터 경계 유지.
  - ⚠️ 마이그레이션 시 `hydrate()`(누락 `platform`/`permalink` 백필, `postStore.ts:8`)를 사전 적용. 파일명 `x_`/`threads_` 접두사가 플랫폼을 인코딩(`postStore.ts:56`)하므로 이를 보존.
- 테이블: `posts`, `enrichment`, `embeddings`, `tags`, `notes`, `bookmarks`, `accounts`, `collections`, `capture_state`
- **벡터 인덱스**: SQLite는 벡터 유사도 내장 없음 → `sqlite-vec` 확장, 또는 부팅 시 메모리 인덱스(<10k 포스트는 충분). JSON에서 매 쿼리 O(N) 코사인 스캔은 수백 개에서 무너지는 절벽 — 회피.

### 1.1 Enrichment 파이프라인 — **크롤과 분리한 비동기 단계** ⚠️
v1은 `fetchFeed → enrich → savePosts`로 인라인 배치했으나, 크롤 라우트(`app/api/crawl/route.ts`)는 **동기 순차 루프**다. 10계정×20포스트 = 200 AI 호출이 직렬로 응답을 막음 → **분리 필수.**

```
[크롤] fetchFeed → normalize(Post) → savePosts  (빠르게 반환)
                                         ↓ (큐/플래그: enriched=false)
[비동기] /api/enrich (또는 백그라운드 잡) → enrich(batch) → enrichmentStore
```

- **저장 순서**: 먼저 `savePosts`(데이터 확보) → 이후 보강. 보강 실패해도 원 데이터 안전.
- **`Enrichment` 스키마** (포스트 밖, `enrichmentStore`에 `platform:id` 키):
  ```ts
  interface Enrichment {
    summary: string;
    topics: string[];          // 정규화·동의어 병합
    entities: Entity[];        // {name, type:'tool'|'person'|'company'|'concept', confidence}
    type: ContentType;         // 'tutorial'|'news'|'opinion'|'launch'|'thread'|'resource'
    lang: string;
    keepScore: number;         // §2 신호/노이즈 게이트
    dupClusterId?: string;     // 근접중복 묶음
    promptVersion: string;     // ⚠️ 재보강 트리거 (프롬프트 바뀌면 stale 식별)
    confidence: number;        // 휴먼인더루프 (낮으면 검토 플래그)
    enrichedAt: number;
  }
  ```
- ⚠️ **프롬프트 버저닝**: `promptVersion` 없으면 "skip if enriched" 최적화가 stale 보강을 영구 방치 → 토픽 집계 오염. 버전 불일치 시 재보강 대상.
- ⚠️ **동시성/락**: `enrichmentStore`를 병렬 쓰기하면 read-modify-write 파일이 깨짐(`postTagStore` 패턴 한계). SQLite 단일 트랜잭션으로 회피 (= 1.0이 선행인 또 다른 이유).
- ⚠️ **부분 실패**: `enrich(posts): Promise<EnrichResult[]>` — 항목별 `{ok|error}` 반환, 배치 한 건 실패가 전체를 버리지 않게. (`claude.ts`는 현재 에러를 throw로 전파 → 래핑 필요)
- ⚠️ **`Post.chain` 처리**: 셀프스레드는 root만 보강하되 chain 텍스트를 컨텍스트로 합쳐 입력. 멤버별 개별 보강 금지(비용·일관성).
- ⚠️ **북마크 코퍼스**: `bookmarkStore`(사용자 저장글)는 크롤 경로 밖(`addBookmarks`). DoD "모든 포스트 보강"이 북마크를 조용히 제외하지 않도록 import 시에도 보강 트리거.
- **비용/레이트리밋**: 증분(신규·stale만), 배치, 동시성 캡, **백필 비용 추정 표시**(예: 5k포스트×~500토큰 ≈ 수십 달러). `/manage`에 진행률·예산 가드·중단/재개.

### 1.2 Embedder 추상화 — **Summarizer와 별개** ⚠️
v1은 임베딩을 기존 `Summarizer`로 한다 했으나, `Summarizer.summarize(): Promise<string>`는 벡터를 못 냄. Claude/Gemini는 임베딩 API가 아님.
- 신규 `interface Embedder { embed(texts: string[]): Promise<number[][]> }` + 전용 프로바이더(OpenAI `text-embedding-3-small` 1536d / Google `text-embedding-004` 768d / Voyage 등). 차원·비용·다국어 특성 다름 → 명시 선택.
- 임베딩은 `embeddings` 테이블(또는 `sqlite-vec`)에 저장, 보강과 동일 비동기 단계에서 산출.

### 1.3 미디어 영속화 — **크롤 시점 즉시 다운로드** ⚠️
`/api/img`는 24h 캐시 헤더 프록시일 뿐 디스크 저장 없음(`lib/img.ts` 화이트리스트). Threads CDN은 **서명 URL이 시간 단위로 만료** → 보강을 미루면 재다운로드가 실패. **유일하게 안전한 창은 크롤과 같은 패스.**
- 크롤 시 이미지/영상을 `data/media/`로 저장, `Media.url`은 로컬 경로. 별도 서빙 라우트 필요(프록시 화이트리스트가 로컬 경로를 막음).
- ⚠️ **영상 용량**: `Media.type==='video'`는 수십 배 큼 → content-type·크기 캡·쿼터 강제. 실패 시 핫링크 폴백.
- 진단에서 "치명적"이라 했으므로 P2 최후가 아니라 **캡처 품질의 일부로 앞당김**(§2 게이트와 함께).

### 1.4 토대 — 정확성·운영 (Cross-cutting, 전 단계 적용)
- **테스트 전략**: AI 출력이 영속 경로에 들어오므로 `Enricher`/`Embedder`를 **주입 가능**하게(팩토리+목). 스키마 형태 스냅샷, mock 응답 결정론 테스트. 기존 `*.test.ts` 패턴 유지.
- **스크래퍼 회복력 모니터링**: README가 인정한 취약성. `/manage`의 last-status를 확장해 **0-result/parse-error 추세 알림**("캡처가 깨졌다" 표면화). 침묵 실패로 아카이브가 썩지 않게.
- **AI 키 부재/레이트리밋 시 열화 모드**: 키 없으면 보강·검색이 키워드 폴백으로 동작(README도 AI는 옵션 취급).

---

## 2. 캡처 품질 게이트 — 신호/노이즈 (NEW, P0로 편입)

> 리뷰 최대 지적: 피드의 ~90%는 노이즈인데 v1은 "캡처=지식"으로 가정. **색인 오염은 하류 모든 기능을 열화** → 토픽허브보다 높은 레버리지.

- **근접중복 dedup**: 현재 `platform:id` 정확 일치만 dedup. 인용·리포스트·같은 기사 10계정 확산이 전부 별개 지식이 됨 → 보강 단계에서 `dupClusterId`(임베딩 근접/URL 정규화)로 묶고 대표 1건만 색인.
- **keep-worthiness 게이트**: 보강이 `keepScore`(저정보/순수인게이지먼트/중복 플래그) 산출 → 토픽허브·의미검색이 쓰레기에 오염되지 않게.
- **트리아지 인박스 / 캡처 상태기계** (제품 핵심 루프):
  - 상태: `inbox` → `kept` / `archived` / `discarded` (`capture_state` 테이블)
  - 신규 캡처는 `inbox`에 도착, **일/주간 빠른 리뷰**로 승급. 승급된 것만 영구 지식.
  - `/inbox` 트리아지 뷰를 1급 화면으로. (현재 크롤·북마크가 미분류 더미인 문제 해소)
  - 트리아지 시 **"왜 저장했나" 의도 메모**를 싸게 포착(가장 값싼 고가치 메타데이터).

---

## 3. 로드맵 (우선순위·단계별)

### 🔴 P0 — 토대 + 데이터화 + 연결 (정체성 전환)

**P0-0. 영속 저장소(SQLite) + 마이그레이션** — §1.0 *(선행 토대)*
- DoD: 기존 `data/*.json` 무손실 흡수, 스토어 호출부 무변경, 벡터 인덱스 경로 확보

**P0-1. 캡처 품질 게이트 + 트리아지 인박스** — §2
- DoD: 근접중복 묶임, `keepScore` 부여, `/inbox`에서 keep/discard, 의도 메모 포착

**P0-2. 수집 후 비동기 AI 보강 (Enrichment)** — §1.1
- 각 포스트에 `{summary, topics, entities, type, lang, keepScore, confidence, promptVersion}` 영구 부여
- DoD: 크롤·북마크 전 포스트가 보강 보유(또는 명시적 제외 결정), `/manage`에서 보강 상태·재보강·진행률·예산가드

**P0-3. 의미 검색 (Semantic Search)** — §1.2 임베딩
- 하이브리드: 키워드(`search.ts` 유지) + 벡터 유사도 랭킹. 한글 형태소 문제를 임베딩이 우회
- DoD: "에이전트 자동화" → "agent workflow" 영문 글 상위 노출

**P0-4. 관련 포스트 / 백링크 (Related & Backlinks)**
- 카드/상세에 "연결된 지식" 패널: ① 임베딩 유사 ② 공유 엔티티 ③ 공유 태그, 양방향
- DoD: 임의 포스트에서 의미·엔티티 관련 글로 이동

**P0-5. 토픽/엔티티 허브 + 휴먼인더루프** — 보강 활용
- `/topics`, `/entities`: 집계 + 시간추이 + co-occurrence
- ⚠️ **AI 보정 UI**: 토픽/엔티티 **수정·동의어 병합·핀**, `confidence` 낮으면 검토 플래그. 보정 없는 자동 허브는 조용히 표류함
- DoD: 자동 생성 인덱스 + 사용자가 라벨 교정 가능

### 🟠 P1 — 활용: 지식을 답·산출물로 (Capture → Use/Create)

**P1-1. Ask-my-archive (Q&A / RAG)** — **최대 제품 가치** ⭐
- "질문 → top-k 검색 → 내 아카이브 근거로 합성 답변(인라인 출처 링크)". 인프라(임베딩+보강+`Summarizer`)는 이미 P0에서 깔림 → 노출만 하면 됨
- 없으면 제품은 여전히 *더 나은 브라우저*지 *브레인*이 아님
- DoD: 질문 입력 → 출처 인용된 답변

**P1-2. 컬렉션 / 노트북 (Collections)** — 태그 위 묶음 단위, `lib/collectionStore.ts` + `/collections`
**P1-3. 합성 노트 (Synthesis)** — 선택 포스트 → AI 정리 노트 **저장**(휘발성 탈피), 원본 역링크
**P1-4. 내보내기 (Portability)** — Markdown/Obsidian(`[[]]`)/Notion, 태그·노트·엔티티·연결 동반
**P1-5. 자동 정리 (Auto-Organize)** — 보강 토픽 기반 태그 추천·일괄 태깅·스마트 컬렉션(규칙: `type=launch AND topic=ai`)

### 🟡 P2 — 영속·심화

**P2-1. 미디어 로컬 보관** — §1.3 *(캡처 품질의 일부로 P0~P1과 병행 가능)*
**P2-2. 시간 축 뷰** — 타임라인, "on this day", 토픽 추이
**P2-3. 원본 삭제 보존** — 소스 소멸글 "보존됨" 표시. ⚠️ *원저자 삭제권과 긴장* → 개인용 범위·비재배포 전제에서만(§5)
**P2-4. 백업/복원** — 단일 아카이브 백업, (선택) 멀티 디바이스

### 🟢 P3 — 확장 (Optional / Later)

**P3-1. 추가 플랫폼** — RSS·YouTube·뉴스레터 (`Post` 추상화 활용)
**P3-2. 그래프 뷰** — 포스트·토픽·엔티티 시각화 (연결의 시각적 정점)
**P3-3. 다이제스트/알림** — 주간 수집 요약, 관심 토픽 신규글
**P3-4. 공유 / 멀티유저** — ⚠️ §5 프라이버시·법적 범위와 **직접 충돌** → 명시 게이트 뒤에서만

---

## 4. 의존성 / 시퀀스 (정정)

```
[1.0 SQLite] ─→ [1.2 Embedder] ─→ P0-3 의미검색 ─→ P0-4 관련글
     │                          └─→ P1-1 Ask-my-archive ⭐
     ├─→ [1.1 Enrichment(비동기)] ─→ P0-2 보강 ─→ P0-5 토픽허브 ─→ P1-5 자동정리
     └─→ [§2 게이트] ─→ P0-1 트리아지 인박스
[1.3 미디어] ─(크롤 시점)─→ P2-1
P1-2 컬렉션 ─→ P1-3 합성노트 ─→ P1-4 내보내기
```

**임계 경로**: `SQLite(1.0) → Enrichment(1.1)+Embedder(1.2)` 가 P0 전체의 선행. **여기서 시작.** (v1은 SQLite를 마지막에 둬 모순이었음)

## 5. 프라이버시·법적 범위 (NEW)

타인의 콘텐츠를 스크래핑·영구 저장(P2-1로 더 깊어짐). 단일·로컬이어도 입장 명시:
- **범위**: 개인 용도, **비재배포**. P3-4 공유는 이 전제와 충돌 → 명시 플래그/동의 게이트 뒤에서만.
- **삭제권 긴장**: P2-3 삭제글 보존은 *기능*이자 *제품 결정* — 개인 아카이브 한정으로 정당화, 공유 경로에서는 비활성.

## 6. 성공 지표 / 노스스타 (NEW)

기능 존재(DoD)만으로는 "작동"을 모름. 후보:
- **노스스타**: 지식 **재사용율** (Ask/검색/관련글 이동이 실제로 일어나는 빈도)
- 입력 지표: ① 트리아지 생존율(신호비) ② 합성 노트·답변 생산 수 ③ 연결 탐색 횟수 ④ 캡처 건강도(스크래퍼 무중단율)
- 각 마일스톤 DoD에 "기능 존재"가 아닌 "사용자가 가치 획득" 1개씩 추가.

## 7. 마일스톤 (정정)

- **M0 "토대"**: 1.0 SQLite + 1.2 Embedder 스캐폴딩 + 1.4 테스트/모니터링 *(신설 — 먼저)*
- **M1 "품질·데이터화"**: §2 게이트/인박스(P0-1) + 1.1 보강(P0-2)
- **M2 "연결·검색"**: P0-3 + P0-4 + P0-5(보정 포함)
- **M3 "활용"**: P1-1 Ask-my-archive ⭐ + P1-2 컬렉션 + P1-3 합성 + P1-4 내보내기
- **M4 "영속"**: P2-1 미디어 + P2-3 삭제보존 + P2-4 백업

> 온보딩/빈 상태/백필 흐름은 각 마일스톤의 첫 화면 요구로 포함(특히 M1 백필: 기존 아카이브 일괄 보강의 비용추정+진행 UX).

---

## 8. v1 → v2 변경 요약 (리뷰 반영)

| # | 보충 내용 | 출처 |
|---|---|---|
| 1 | SQLite를 P2→**M0(최우선)** 으로 승격 (임베딩·허브가 의존하는 토대 모순 수정) | 아키텍처 |
| 2 | Enrichment를 크롤 인라인→**비동기 분리**(블로킹·부분실패 방지) | 아키텍처 |
| 3 | 임베딩용 **별도 `Embedder`** + 전용 프로바이더·벡터 인덱스 명시 | 아키텍처 |
| 4 | 미디어 **크롤 시점 다운로드**(서명URL 만료)·영상 쿼터·서빙 라우트 | 아키텍처 |
| 5 | 보강 스키마 **`promptVersion`/재보강**, 동시성 락, 비용추정, 부분실패, `Post.chain`, 북마크 제외 | 아키텍처 |
| 6 | 테스트 주입성·**스크래퍼 회복력 모니터링**·AI 열화 모드 | 아키텍처 |
| 7 | **트리아지 인박스 + 캡처 상태기계**(핵심 사용 루프) | PO |
| 8 | **신호/노이즈 게이트 + 근접중복 dedup**(색인 오염 방지) | PO |
| 9 | **Ask-my-archive(RAG/Q&A)** — 최대 제품 가치, "활용" 동사 추가 | PO |
| 10 | **휴먼인더루프**(신뢰도·토픽 병합·보정) | PO |
| 11 | 온보딩/빈상태/백필, **노스스타·성공지표**, **프라이버시·법적 범위** | PO |
