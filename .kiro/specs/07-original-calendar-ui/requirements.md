# Requirements Document

## Introduction

エンドユーザー向けカレンダー画面（`calendar/`）のカレンダー表示部分を、Googleカレンダーのiframe 埋め込みから、自前で実装するオリジナルデザインのカレンダーUIへ置き換える。

イベントデータは既存のバックエンドAPI経由で取得する。カレンダーは月単位で表示し、前月・翌月へ移動できる。表示形式は、現状のGoogleカレンダー予定リスト表示（日付ごとにイベントを縦に並べるリスト）をベースとし、各イベントには小さなサムネイル画像を添える。

本ドキュメントは、この置き換えに必要な機能要件を EARS 形式で定義する。バックエンドAPIの追加・変更が必要かどうかについても、要件として明確化する。

## Glossary

- **Calendar_UI**: `calendar/`
  配下の Next.js アプリに新規実装する、オリジナルデザインのカレンダー表示コンポーネント群（Googleカレンダー iframe 埋め込みの置き換え先）。
- **Calendar_Event**:
  Calendar_UI に表示される単一の勉強会イベント。タイトル、開催日時、イベントページURL、任意のサムネイルURLを持つ。
- **Study_Session_API**: 既存のバックエンドAPI
  `GET /api/admin/study-sessions`。DynamoDB の勉強会データを `{ sessions: StudySession[] }`
  形式で返す。
- **Event_Materials_API**: 既存のバックエンドAPI
  `GET /api/events/materials`。資料付き connpass イベントを返し、`materials[].thumbnailUrl` を含む。
- **Approved_Event**: `status` が `approved` の Calendar_Event のみを表示対象とする。
- **Displayed_Month**: Calendar_UI が現在表示している対象の年月。
- **Thumbnail**:
  Calendar_Event に対応する小さな画像。connpass 由来の資料サムネイル、またはイベントのOGP画像などの画像URL。
- **Event_List_View**:
  Displayed_Month 内のイベントを、日付昇順で日付ごとに縦に並べて表示するリスト形式のビュー。現状のGoogleカレンダー予定リスト表示をベースとする。
- **LoadingSpinner**: イベントデータ取得中に表示する、読み込み中を示すローディング表示コンポーネント。
- **ResponsiveHeaderButtons**: カレンダー画面ヘッダーに表示する各種ボタン群のコンポーネント。
- **JST**: 日本標準時（UTC+9）。Displayed_Month および開催日時の判定基準となるタイムゾーン。
- **Mobile_Breakpoint**: モバイルサイズとデスクトップサイズを区別する画面幅の境界。画面幅が 768px 未満をモバイルサイズ、768px 以上をデスクトップサイズとする。
- **StudySessionApiResponse**: フロントエンドが Study_Session_API のレスポンスを表現する型定義。
- **StudySessionEvent**: フロントエンドが単一の勉強会イベントを表現する型定義。

## Requirements

### Requirement 1: Googleカレンダー埋め込みの置き換え

**User Story:**
エンドユーザーとして、Googleカレンダーの埋め込みではなくオリジナルデザインのカレンダーを見たい。サイトの世界観に合った見た目でイベントを確認できるようにするため。

#### Acceptance Criteria

1. WHEN カレンダー画面が読み込まれカレンダー表示用のイベントデータが利用可能になったとき、THE
   Calendar_UI
   SHALL カレンダー表示領域に、Google カレンダーの iframe ではなくオリジナルデザインのカレンダーコンポーネントをレンダリングする
2. THE Calendar_UI SHALL カレンダー画面の DOM 内に、`NEXT_PUBLIC_GOOGLE_CALENDAR_URL`
   （未設定時のデフォルトサンプル URL を含む）を `src` に持つ Google カレンダー埋め込み用 `<iframe>`
   要素を 0 個含む（レンダリングしない）
3. THE Calendar_UI
   SHALL オリジナルデザインのカレンダーと同一ページ内に、既存のイベント資料一覧セクション（見出し「イベント資料一覧」を含む領域）およびヘッダーの各種ボタン（ResponsiveHeaderButtons）を同時にレンダリングし、いずれも操作可能な状態に保つ
4. WHILE カレンダー表示用のイベントデータの取得が完了していない間, THE Calendar_UI
   SHALL カレンダー表示領域に読み込み中を示すローディング表示（LoadingSpinner）を表示し、Google カレンダーの iframe を表示しない
5. IF カレンダー表示用のイベントデータの取得に失敗した場合, THEN THE Calendar_UI SHALL
   Google カレンダーの iframe を表示せず、取得失敗を示すエラー表示を提示し、再試行が可能な場合は再試行手段を提供する

### Requirement 2: API経由でのイベントデータ取得

**User Story:**
エンドユーザーとして、カレンダーに実際の勉強会イベントが表示されてほしい。最新の承認済みイベントを確認できるようにするため。

#### Acceptance Criteria

1. WHEN カレンダー画面が読み込まれる, THE Calendar_UI SHALL
   Study_Session_API からイベントデータを取得する
2. THE Calendar_UI SHALL イベントデータ取得リクエストのタイムアウトを10秒とする
3. THE Calendar_UI SHALL 取得したイベントのうち Approved_Event のみを表示する
4. WHILE イベントデータの取得が完了していない, THE Calendar_UI
   SHALL 読み込み中であることを示す表示を提示し、イベント一覧を表示しない
5. IF 表示対象の Approved_Event が0件である, THEN THE Calendar_UI
   SHALL 当月に表示できるイベントがない旨の空状態表示を提示する
6. IF イベントデータの取得に失敗した, THEN THE Calendar_UI
   SHALL 取得に失敗した旨を示すエラーメッセージを表示し、直前に取得済みのデータがあればそれを保持し、再試行手段を提示する
7. WHEN イベントデータの取得失敗と表示対象の Approved_Event が0件であることが同時に発生した, THE
   Calendar_UI
   SHALL 取得失敗を示すエラーメッセージを表示し、空状態表示より取得失敗のエラー表示を優先する
8. THE Calendar_UI SHALL 既存の勉強会データ取得手段（`studySessionApiClient` および
   `useStudySessionEvents`）を再利用してイベントデータを取得する

### Requirement 3: 月表示

**User Story:**
エンドユーザーとして、カレンダーを月単位で見たい。特定の月の勉強会予定をまとめて把握できるようにするため。

#### Acceptance Criteria

1. THE Calendar_UI SHALL Displayed_Month を単位としてイベントを表示する
2. WHEN カレンダー画面が初回に読み込まれる, THE Calendar_UI SHALL
   JST における現在の年月を Displayed_Month として設定する
3. THE Calendar_UI SHALL Displayed_Month の対象を年と月の両方が分かる形で画面上に表示する
4. THE Calendar_UI SHALL 開始日時が Displayed_Month の初日 00:00:00 JST から末日 23:59:59
   JST までに含まれる Approved_Event のみを表示対象とする

### Requirement 4: 月移動機能

**User Story:**
エンドユーザーとして、前の月や次の月に移動したい。過去や先の勉強会予定を確認できるようにするため。

#### Acceptance Criteria

1. THE Calendar_UI SHALL 前月へ移動する操作要素と翌月へ移動する操作要素をそれぞれ1つずつ提供する
2. WHEN 前月へ移動する操作要素が操作される, THE Calendar_UI SHALL
   Displayed_Month を暦上の1か月前（1月の場合は前年の12月）に変更する
3. WHEN 翌月へ移動する操作要素が操作される, THE Calendar_UI SHALL
   Displayed_Month を暦上の1か月後（12月の場合は翌年の1月）に変更する
4. WHEN Displayed_Month が変更される, THE Calendar_UI
   SHALL 画面上に表示する対象年月を変更後の Displayed_Month に更新する
5. WHEN Displayed_Month が変更される, THE Calendar_UI
   SHALL 開始日時が変更後の Displayed_Month に含まれる Approved_Event のみを Event_List_View に表示する
6. IF イベントデータの取得が完了していない状態で前月または翌月へ移動する操作要素が操作された, THEN
   THE Calendar_UI SHALL 当該操作を無視し、Displayed_Month を変更しない

### Requirement 5: リストベースのイベント表示

**User Story:**
エンドユーザーとして、現状のGoogleカレンダー予定リストと同じように、日付ごとにイベントが縦に並んだ表示を見たい。慣れた形式で予定を読みやすく確認できるようにするため。

#### Acceptance Criteria

1. THE Event_List_View SHALL
   Displayed_Month の Approved_Event を開催開始日時の昇順で表示し、同一開始日時の場合はタイトルの昇順で表示する
2. THE Event_List_View
   SHALL 各 Calendar_Event について、開催日付（年月日）、開催曜日、開始時刻（時分）、およびイベントタイトルを表示する
3. WHEN 複数の Calendar_Event が同一日付に存在する, THE Event_List_View
   SHALL それらを同一の日付見出しの下にまとめて表示する
4. WHEN Calendar_Event がイベントページURLを持つ, THE Event_List_View
   SHALL 当該イベントからイベントページへ遷移できるリンクを提供する
5. IF Displayed_Month に表示対象の Approved_Event が存在しない, THEN THE Event_List_View
   SHALL 当月に表示できるイベントがないことを示すメッセージを表示する
6. IF イベントデータの取得自体に失敗した, THEN THE Event_List_View
   SHALL イベント一覧の全体を表示せず、Requirement 2 のエラー表示に委ねる
7. WHERE イベントデータの取得は成功したが個別イベントの検証・パースなど取得以外のエラーが発生した,
   THE Event_List_View SHALL イベント一覧の表示を継続する

### Requirement 6: イベントサムネイルの表示

**User Story:**
エンドユーザーとして、各イベントに小さなサムネイル画像が付いていてほしい。一覧を視覚的に見分けやすくするため。

#### Acceptance Criteria

1. WHEN Calendar_Event が有効な Thumbnail のURLを持つ, THE Event_List_View
   SHALL 当該イベントのリスト項目内に小さなサムネイル画像を表示する
2. IF Calendar_Event が Thumbnail のURLを持たない, THEN THE Event_List_View
   SHALL 当該イベントをサムネイルなしのレイアウトで表示する
3. IF Thumbnail 画像の読み込みに失敗した, THEN THE Event_List_View
   SHALL サムネイル領域をデフォルトの代替画像を用いない空のプレースホルダー領域として扱い、リスト項目のレイアウトを維持する
4. THE Event_List_View SHALL
   Thumbnail を、イベントタイトルや日時の可読性を損なわない小さな寸法（サムネイルの一辺が概ね64px以下）で表示する

### Requirement 7: サムネイルデータの提供源

**User Story:**
開発者として、サムネイルを表示するためのデータがどこから来るのかを明確にしたい。バックエンドAPIの追加・変更が必要かどうかを判断できるようにするため。

#### Acceptance Criteria

1. THE Study_Session_API
   SHALL 各 Approved_Event に対応する Thumbnail のURLを、単一の文字列フィールド（絶対URL、または空文字列/欠如）としてレスポンスに含める
2. WHERE 既存の Study_Session_API レスポンスに Thumbnail のURLを参照できるフィールドが含まれていない,
   THE Study_Session_API SHALL 当該フィールドをレスポンスへ追加する
3. WHERE Study_Session_API レスポンスへの Thumbnail フィールド追加が実施される,
   THE フロントエンドのレスポンス型定義（`StudySessionApiResponse` および
   `StudySessionEvent`）SHALL当該フィールドを表現できるよう更新される
4. WHERE Approved_Event に対応する Thumbnail のURLがフィールド欠如・空文字列・空白のみである, THE
   Calendar_UI SHALL Requirement 6 のサムネイルなし表示に従う
5. WHERE Thumbnail フィールドの値が存在するが有効なURLでない, THE Calendar_UI SHALL Requirement
   6 のサムネイルなし表示に従う

### Requirement 8: レスポンシブ表示とアクセシビリティ

**User Story:**
エンドユーザーとして、スマートフォンでもPCでもカレンダーを見やすく操作したい。利用する端末を問わず勉強会を確認できるようにするため。

#### Acceptance Criteria

1. WHILE 画面幅がモバイルサイズ（幅768px未満）である, THE Calendar_UI SHALL
   Event_List_View と月移動操作要素をモバイル向けの単一カラムレイアウトで表示する
2. WHILE 画面幅がデスクトップサイズ（幅768px以上）である, THE Calendar_UI SHALL
   Event_List_View と月移動操作要素をデスクトップ向けのレイアウトで表示する
3. THE Calendar_UI
   SHALL 前月・翌月への月移動操作要素それぞれにアクセシブルな名称（アクセシブルネーム）を付与する
4. WHEN Thumbnail 画像を表示する, THE Event_List_View
   SHALL 当該画像の代替テキスト（alt 属性）として、対応するイベントを識別できる最も適切なテキストを優先的に用い、識別できるテキストが得られない場合は汎用的なラベルを代替テキストとして付与したうえで Thumbnail を表示する
5. WHEN Thumbnail を表示しない（サムネイルなし表示）, THE Event_List_View
   SHALL 代替テキストを必要としない装飾的な代替表示として扱う
