## [](https://connpass.com/about/api/v2/#section/%E6%A6%82%E8%A6%81)概要

このドキュメントでは connpass API について説明します。

## [](https://connpass.com/about/api/v2/#section/%E6%A6%82%E8%A6%81/API)API利用方法

APIの利用に伴う料金・プランや利用規約につきましてはこちらの
[ヘルプページ](https://help.connpass.com/api/) をご覧ください。

## [](https://connpass.com/about/api/v2/#section/%E6%A6%82%E8%A6%81/%E8%AA%8D%E8%A8%BC)認証

すべてのAPIエンドポイントでは、APIキーによる認証が必須です。

API利用申請後に発行されるAPIキーを、HTTPリクエストヘッダー `X-API-Key` に指定してください。

例：

```
curl <span>-</span>X GET <span>"https://connpass.com/api/v2/events/?keyword=python"</span> \
<span>-</span>H <span>"X-API-Key: CPaVAKNa.6u0RBKOm2F462P4vDHln8IR2MW5PhR493cFH6UbKyE8OqbsBfEk4p6FF"</span>
```

認証に失敗した場合、HTTPステータスコード `401 Unauthorized` が返されます。

APIキーを紛失した場合や、第三者に漏洩した可能性がある場合は、速やかに再発行をご依頼ください。

## [](https://connpass.com/about/api/v2/#section/%E6%A6%82%E8%A6%81/%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E5%88%B6%E9%99%90)アクセス制限

APIキーごとに、現状「1秒間に1リクエストまで」 のリクエスト制限 (スロットリング) を設けています。

この制限を超過すると、HTTPステータスコード `429 Too Many Requests` が返されます。

また、提供されているAPI以外の手段（自動化の有無にかかわらず）で、当サービスへクローリング、スクレイピング、その他のアクセスを行う、または試みる行為は、[利用規約](https://connpass.com/term/)
により禁止されています。

## [](https://connpass.com/about/api/v2/#section/%E6%A6%82%E8%A6%81/API-v1-v2)API v1 から v2 への移行

[connpass API v1](https://connpass.com/about/api/v1/)
は今後非推奨となり、2025年末に廃止される予定です。

API
v1とv2の間では、認証方式や入出力仕様の変更が加えられているため、既存のクライアントコードには変更が必要です。

このドキュメントでは、v1からv2への移行にあたり考慮すべき変更点を整理しています。v1は今後非推奨となり、2025年末に廃止される予定であるため、以下に示す内容をもとに、各システムで必要なマイグレーション対応を計画・実施してください。

### 変更点概要

#### 認証の導入

- すべてのAPIエンドポイントで、APIキーによる認証が必須となりました
- そのため、固定IPからの接続が不要となりました
- 詳細は「[認証](https://connpass.com/about/api/v2/#section/%E6%A6%82%E8%A6%81/%E8%AA%8D%E8%A8%BC)」セクションを参照してください

#### アクセス制限の導入

- 各APIキーごとにアクセス制限(スロットリング)が適用されるようになりました
- 詳細は[「アクセス制限」](https://connpass.com/about/api/v2/#section/%E6%A6%82%E8%A6%81/%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E5%88%B6%E9%99%90)セクションを参照してください

#### エンドポイントの変更

- ルートURLが v2 用に変更されました (`/api/v1/` → `/api/v2/`)
- コレクション名が単数形から複数形に変更されました (例: `event` → `events`)

#### パラメーター名・レスポンスフィールド名の整理

- 冗長・旧名称のフィールドを、簡潔・現在の仕様に合わせた名称に変更しました (例: `event_id` → `id`,
  `series` → `group`)

---

### 各APIの変更点詳細

#### イベント一覧API

- エンドポイント：
  - `/api/v1/event/` → `/api/v2/events/`
- リクエストパラメーター：
  - `series_id` → `group_id`
- レスポンスフィールド：
  - `event_id` → 削除 (代わりに `id` を使用)
  - `event_url` → 削除 (代わりに `url` を使用)
  - `series` → `group`

#### イベント資料API

- エンドポイント：
  - `/api/v1/event/{id}/presentation` → `/api/v2/events/{id}/presentations`

#### グループ一覧API

- エンドポイント：
  - `/api/v1/group/` → `/api/v2/groups/`

#### ユーザー一覧API

- エンドポイント：
  - `/api/v1/user/` → `/api/v2/users/`
- レスポンスフィールド：
  - `user_id` → `id`
  - `user_url` → `url`
  - `user_image_url` → `image_url`

#### ユーザー所属グループAPI

- エンドポイント：
  - `/api/v1/user/{nickname}/group/` → `/api/v2/users/{nickname}/groups/`

#### ユーザー参加イベントAPI

- エンドポイント：
  - `/api/v1/user/{nickname}/attended_event/` → `/api/v2/users/{nickname}/attended_events/`
- レスポンスフィールド：
  - `event_id` → 削除 (代わりに `id` を使用)
  - `event_url` → 削除 (代わりに `url` を使用)
  - `series` → `group`

#### ユーザー発表イベントAPI

- エンドポイント：
  - `/api/v1/user/{nickname}/presenter_event/` → `/api/v2/users/{nickname}/presenter_events/`
- レスポンスフィールド：
  - `event_id` → 削除 (代わりに `id` を使用)
  - `event_url` → 削除 (代わりに `url` を使用)
  - `series` → `group`

## [](https://connpass.com/about/api/v2/#tag/%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88)イベント

## [](https://connpass.com/about/api/v2/#tag/%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88/operation/connpass_event_event_api_v2_views_event_search)一覧

検索クエリの条件に応じたイベント一覧を取得する。

パラメータを複数指定する場合は、`name=value1&name=value2&...` または `name=value1,value2...`
のように指定できます。

##### Authorizations:

_APIKeyAuth_

##### query Parameters

<table><tbody><tr><td kind="field" title="event_id"><span></span><span>event_id</span></td><td><div><p><span>Array of </span><span>integers</span><span> (イベントID)</span></p><p><span>Examples:</span></p><ul><li><span>event_id=364</span> - 単一指定</li><li><span>event_id=364&amp;event_id=365</span> - 複数指定</li><li><span>event_id=364,365</span> - 複数指定</li></ul><div><p>イベント毎に割り当てられた番号で検索します。複数指定可能です。</p><p>URLが <code>https://connpass.com/event/364/</code> のイベントの場合、イベントIDは <code>364</code> になります。</p></div></div></td></tr><tr><td kind="field" title="keyword"><span></span><span>keyword</span></td><td><div><p><span>Array of </span><span>strings</span><span> (キーワード(AND))</span></p><div><p>イベントのタイトル、キャッチ、概要、住所をAND条件部分一致で検索します。複数指定可能です。</p></div></div></td></tr><tr><td kind="field" title="keyword_or"><span></span><span>keyword_or</span></td><td><div><p><span>Array of </span><span>strings</span><span> (キーワード(OR))</span></p><div><p>イベントのタイトル、キャッチ、概要、住所をOR条件部分一致で検索します。複数指定可能です。</p></div></div></td></tr><tr><td kind="field" title="ym"><span></span><span>ym</span></td><td><div><p><span>Array of </span><span>strings</span><span> &lt;date-time&gt; </span><span>(イベント開催年月)</span></p><p><span>Examples: </span><span>ym=201204</span></p><div><p>指定した年月に開催されているイベントを検索します。複数指定可能です。</p><p><code>yyyymm</code> 形式。</p></div></div></td></tr><tr><td kind="field" title="ymd"><span></span><span>ymd</span></td><td><div><p><span>Array of </span><span>strings</span><span> &lt;date-time&gt; </span><span>(イベント開催年月日)</span></p><p><span>Examples: </span><span>ymd=20120406</span></p><div><p>指定した年月日に開催されているイベントを検索します。複数指定可能です。</p><p><code>yyyymmdd</code> 形式。</p></div></div></td></tr><tr><td kind="field" title="nickname"><span></span><span>nickname</span></td><td><div><p><span>Array of </span><span>strings</span><span> (参加者のニックネーム)</span></p><div><p>指定したニックネームのユーザが参加しているイベントを検索します。複数指定可能です。</p></div></div></td></tr><tr><td kind="field" title="owner_nickname"><span></span><span>owner_nickname</span></td><td><div><p><span>Array of </span><span>strings</span><span> (管理者のニックネーム)</span></p><div><p>指定したニックネームのユーザが管理しているイベントを検索します。複数指定可能です。</p></div></div></td></tr><tr><td kind="field" title="group_id"><span></span><span>group_id</span></td><td><div><p><span>Array of </span><span>integers</span><span> (グループID)</span></p><p><span>Examples: </span><span>group_id=1</span></p><div><p>グループ 毎に割り当てられた番号で、ひもづいたイベントを検索します。複数指定可能です。</p><p>URLが <code>https://connpass.com/series/1/</code> のグループの場合、グループIDは <code>1</code> になります</p></div></div></td></tr><tr><td kind="field" title="subdomain"><span></span><span>subdomain</span></td><td><div><p><span>Array of </span><span>strings</span><span> (サブドメイン)</span></p><p><span>Examples: </span><span>subdomain=bpstudy</span></p><div><p>グループ 毎に割り当てられたサブドメインで、ひもづいたイベントを検索します。複数指定可能です。</p><p>URLが <code>https://bpstudy.connpass.com/</code> のグループの場合、サブドメインは <code>bpstudy</code> になります</p></div></div></td></tr><tr><td kind="field" title="prefecture"><span></span><span>prefecture</span></td><td><div><p><span>Array of </span><span>strings</span><span> (都道府県)</span></p><p><span>Examples: </span><span>prefecture=online</span></p><div><p>指定した都道府県で開催されているイベントを検索します。複数指定可能です。</p><ul><li><code>online</code>: オンライン</li><li><code>hokkaido</code>: 北海道</li><li><code>aomori</code>: 青森県</li><li><code>iwate</code>: 岩手県</li><li><code>miyagi</code>: 宮城県</li><li><code>akita</code>: 秋田県</li><li><code>yamagata</code>: 山形県</li><li><code>fukushima</code>: 福島県</li><li><code>ibaraki</code>: 茨城県</li><li><code>tochigi</code>: 栃木県</li><li><code>gunma</code>: 群馬県</li><li><code>saitama</code>: 埼玉県</li><li><code>chiba</code>: 千葉県</li><li><code>tokyo</code>: 東京都</li><li><code>kanagawa</code>: 神奈川県</li><li><code>yamanashi</code>: 山梨県</li><li><code>nagano</code>: 長野県</li><li><code>niigata</code>: 新潟県</li><li><code>toyama</code>: 富山県</li><li><code>ishikawa</code>: 石川県</li><li><code>fukui</code>: 福井県</li><li><code>gifu</code>: 岐阜県</li><li><code>shizuoka</code>: 静岡県</li><li><code>aichi</code>: 愛知県</li><li><code>mie</code>: 三重県</li><li><code>shiga</code>: 滋賀県</li><li><code>kyoto</code>: 京都府</li><li><code>osaka</code>: 大阪府</li><li><code>hyogo</code>: 兵庫県</li><li><code>nara</code>: 奈良県</li><li><code>wakayama</code>: 和歌山県</li><li><code>tottori</code>: 鳥取県</li><li><code>shimane</code>: 島根県</li><li><code>okayama</code>: 岡山県</li><li><code>hiroshima</code>: 広島県</li><li><code>yamaguchi</code>: 山口県</li><li><code>tokushima</code>: 徳島県</li><li><code>kagawa</code>: 香川県</li><li><code>ehime</code>: 愛媛県</li><li><code>kochi</code>: 高知県</li><li><code>fukuoka</code>: 福岡県</li><li><code>saga</code>: 佐賀県</li><li><code>nagasaki</code>: 長崎県</li><li><code>kumamoto</code>: 熊本県</li><li><code>oita</code>: 大分県</li><li><code>miyazaki</code>: 宮崎県</li><li><code>kagoshima</code>: 鹿児島県</li><li><code>okinawa</code>: 沖縄県</li></ul></div></div></td></tr><tr><td kind="field" title="order"><span></span><span>order</span></td><td><div><p><span></span><span>integer</span><span> (検索結果の表示順)</span></p><p><span>Default: </span><span>1</span></p><div><p>検索結果の表示順を、更新日時順、開催日時順、新着順で指定します。</p><ul><li><code>1</code>: 更新日時順</li><li><code>2</code>: 開催日時順</li><li><code>3</code>: 新着順</li></ul></div></div></td></tr><tr><td kind="field" title="start"><span></span><span>start</span></td><td><div><p><span></span><span>integer</span><span> (検索の開始位置) </span><span><span>&gt;= 1</span></span></p><p><span>Default: </span><span>1</span></p><div><p>検索結果の何件目から出力するかを指定します。</p></div></div></td></tr><tr><td kind="field" title="count"><span></span><span>count</span></td><td><div><p><span></span><span>integer</span><span> (取得件数) </span><span><span>[ 1 .. 100 ]</span></span></p><p><span>Default: </span><span>10</span></p><div><p>検索結果の最大出力データ数を指定します。</p></div></div></td></tr></tbody></table>

### Responses

##### Response Schema: application/json

<table><tbody><tr><td kind="field" title="results_returned"><span></span><span>results_returned</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_available"><span></span><span>results_available</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_start"><span></span><span>results_start</span><p>required</p></td><td></td></tr><tr><td kind="field" title="events"><span></span><p>required</p></td><td><div><p><span>Array of </span><span>objects</span><span> (イベント一覧)</span></p></div></td></tr></tbody></table>

### Response samples

- 200

Content type

application/json

`{`

- `"results_returned": 1,`
- `"results_available": 91,`
- `"results_start": 1,`
- `"events": [`
  - `{}`

  `]`

`}`

## [](https://connpass.com/about/api/v2/#tag/%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88/operation/connpass_event_event_api_v2_views_event_presentation)資料

##### Authorizations:

_APIKeyAuth_

##### path Parameters

<table><tbody><tr><td kind="field" title="id"><span></span><span>id</span><p>required</p></td><td><div><p><span></span><span>integer</span><span> (イベントID)</span></p><p><span>Examples: </span><span>364</span></p><div><p>指定したイベントIDのオブジェクトを取得します。</p><p>URLが <code>https://connpass.com/event/364/</code> のイベントの場合、イベントIDは <code>364</code> になります。</p></div></div></td></tr></tbody></table>

##### query Parameters

<table><tbody><tr><td kind="field" title="start"><span></span><span>start</span></td><td><div><p><span></span><span>integer</span><span> (検索の開始位置) </span><span><span>&gt;= 1</span></span></p><p><span>Default: </span><span>1</span></p></div></td></tr><tr><td kind="field" title="count"><span></span><span>count</span></td><td><div><p><span></span><span>integer</span><span> (取得件数) </span><span><span>[ 1 .. 100 ]</span></span></p><p><span>Default: </span><span>10</span></p></div></td></tr></tbody></table>

### Responses

##### Response Schema: application/json

<table><tbody><tr><td kind="field" title="results_returned"><span></span><span>results_returned</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_available"><span></span><span>results_available</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_start"><span></span><span>results_start</span><p>required</p></td><td></td></tr><tr><td kind="field" title="presentations"><span></span><p>required</p></td><td></td></tr></tbody></table>

### Response samples

- 200

Content type

application/json

`{`

- `"results_returned": 1,`
- `"results_available": 91,`
- `"results_start": 1,`
- `"presentations": [`
  - `{}`

  `]`

`}`

## [](https://connpass.com/about/api/v2/#tag/%E3%82%B0%E3%83%AB%E3%83%BC%E3%83%97)グループ

## [](https://connpass.com/about/api/v2/#tag/%E3%82%B0%E3%83%AB%E3%83%BC%E3%83%97/operation/connpass_group_group_api_v2_views_group_search)一覧

検索クエリの条件に応じたグループ一覧を取得できます。

パラメータを複数指定する場合は、`name=value1&name=value2&...` または `name=value1,value2...`
のように指定できます。

##### Authorizations:

_APIKeyAuth_

##### query Parameters

<table><tbody><tr><td kind="field" title="subdomain"><span></span><span>subdomain</span></td><td><div><p><span>Array of </span><span>strings</span><span> (サブドメイン)</span></p><p><span>Examples:</span></p><ul><li><span>subdomain=bpstudy</span> - 単一指定</li><li><span>subdomain=bpstudy&amp;subdomain=beproud</span> - 複数指定</li><li><span>subdomain=bpstudy,beproud</span> - 複数指定</li></ul><div><p>指定したサブドメインのグループを取得します。複数指定可能です(最大100件)。</p></div></div></td></tr><tr><td kind="field" title="start"><span></span><span>start</span></td><td><div><p><span></span><span>integer</span><span> (検索の開始位置) </span><span><span>&gt;= 1</span></span></p><p><span>Default: </span><span>1</span></p></div></td></tr><tr><td kind="field" title="count"><span></span><span>count</span></td><td><div><p><span></span><span>integer</span><span> (取得件数) </span><span><span>[ 1 .. 100 ]</span></span></p><p><span>Default: </span><span>10</span></p></div></td></tr></tbody></table>

### Responses

##### Response Schema: application/json

<table><tbody><tr><td kind="field" title="results_returned"><span></span><span>results_returned</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_available"><span></span><span>results_available</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_start"><span></span><span>results_start</span><p>required</p></td><td></td></tr><tr><td kind="field" title="groups"><span></span><p>required</p></td><td><div><p><span>Array of </span><span>objects</span><span> (グループ一覧)</span></p></div></td></tr></tbody></table>

### Response samples

- 200

Content type

application/json

`{`

- `"results_returned": 1,`
- `"results_available": 91,`
- `"results_start": 1,`
- `"groups": [`
  - `{}`

  `]`

`}`

## [](https://connpass.com/about/api/v2/#tag/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC)ユーザー

## [](https://connpass.com/about/api/v2/#tag/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC/operation/connpass_account_account_api_v2_views_user_search)一覧

検索クエリの条件に応じたユーザー一覧を取得できます。

パラメータを複数指定する場合は、`name=value1&name=value2&...` または `name=value1,value2...`
のように指定できます。

##### Authorizations:

_APIKeyAuth_

##### query Parameters

<table><tbody><tr><td kind="field" title="nickname"><span></span><span>nickname</span></td><td><div><p><span>Array of </span><span>strings</span><span> (ニックネーム)</span></p><p><span>Examples:</span></p><ul><li><span>nickname=haru860</span> - 単一指定</li><li><span>nickname=haru860&amp;nickname=ian</span> - 複数指定</li><li><span>nickname=haru860,ian</span> - 複数指定</li></ul><div><p>指定したニックネームのユーザを検索します。複数指定可能です(最大100件)。</p></div></div></td></tr><tr><td kind="field" title="start"><span></span><span>start</span></td><td><div><p><span></span><span>integer</span><span> (検索の開始位置) </span><span><span>&gt;= 1</span></span></p><p><span>Default: </span><span>1</span></p></div></td></tr><tr><td kind="field" title="count"><span></span><span>count</span></td><td><div><p><span></span><span>integer</span><span> (取得件数) </span><span><span>[ 1 .. 100 ]</span></span></p><p><span>Default: </span><span>10</span></p></div></td></tr></tbody></table>

### Responses

##### Response Schema: application/json

<table><tbody><tr><td kind="field" title="results_returned"><span></span><span>results_returned</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_available"><span></span><span>results_available</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_start"><span></span><span>results_start</span><p>required</p></td><td></td></tr><tr><td kind="field" title="users"><span></span><p>required</p></td><td><div><p><span>Array of </span><span>objects</span><span> (ユーザー一覧)</span></p></div></td></tr></tbody></table>

### Response samples

- 200

Content type

application/json

`{`

- `"results_returned": 1,`
- `"results_available": 91,`
- `"results_start": 1,`
- `"users": [`
  - `{}`

  `]`

`}`

## [](https://connpass.com/about/api/v2/#tag/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC/operation/connpass_account_account_api_v2_views_user_group)所属グループ

ユーザーが所属しているグループ一覧を取得できます。

##### Authorizations:

_APIKeyAuth_

##### path Parameters

<table><tbody><tr><td kind="field" title="nickname"><span></span><span>nickname</span><p>required</p></td><td><div><p><span></span><span>string</span><span> (ニックネーム)</span></p><p><span>Examples: </span><span>haru860</span></p></div></td></tr></tbody></table>

##### query Parameters

<table><tbody><tr><td kind="field" title="start"><span></span><span>start</span></td><td><div><p><span></span><span>integer</span><span> (検索の開始位置) </span><span><span>&gt;= 1</span></span></p><p><span>Default: </span><span>1</span></p></div></td></tr><tr><td kind="field" title="count"><span></span><span>count</span></td><td><div><p><span></span><span>integer</span><span> (取得件数) </span><span><span>[ 1 .. 100 ]</span></span></p><p><span>Default: </span><span>10</span></p></div></td></tr></tbody></table>

### Responses

##### Response Schema: application/json

<table><tbody><tr><td kind="field" title="results_returned"><span></span><span>results_returned</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_available"><span></span><span>results_available</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_start"><span></span><span>results_start</span><p>required</p></td><td></td></tr><tr><td kind="field" title="groups"><span></span><p>required</p></td><td><div><p><span>Array of </span><span>objects</span><span> (グループ一覧)</span></p></div></td></tr></tbody></table>

### Response samples

- 200

Content type

application/json

`{`

- `"results_returned": 1,`
- `"results_available": 91,`
- `"results_start": 1,`
- `"groups": [`
  - `{}`

  `]`

`}`

## [](https://connpass.com/about/api/v2/#tag/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC/operation/connpass_account_account_api_v2_views_user_attended_event)参加イベント

##### Authorizations:

_APIKeyAuth_

##### path Parameters

<table><tbody><tr><td kind="field" title="nickname"><span></span><span>nickname</span><p>required</p></td><td><div><p><span></span><span>string</span><span> (ニックネーム)</span></p><p><span>Examples: </span><span>haru860</span></p></div></td></tr></tbody></table>

##### query Parameters

<table><tbody><tr><td kind="field" title="start"><span></span><span>start</span></td><td><div><p><span></span><span>integer</span><span> (検索の開始位置) </span><span><span>&gt;= 1</span></span></p><p><span>Default: </span><span>1</span></p></div></td></tr><tr><td kind="field" title="count"><span></span><span>count</span></td><td><div><p><span></span><span>integer</span><span> (取得件数) </span><span><span>[ 1 .. 100 ]</span></span></p><p><span>Default: </span><span>10</span></p></div></td></tr></tbody></table>

### Responses

##### Response Schema: application/json

<table><tbody><tr><td kind="field" title="results_returned"><span></span><span>results_returned</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_available"><span></span><span>results_available</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_start"><span></span><span>results_start</span><p>required</p></td><td></td></tr><tr><td kind="field" title="events"><span></span><p>required</p></td><td><div><p><span>Array of </span><span>objects</span><span> (イベント一覧)</span></p></div></td></tr></tbody></table>

### Response samples

- 200

Content type

application/json

`{`

- `"results_returned": 1,`
- `"results_available": 91,`
- `"results_start": 1,`
- `"events": [`
  - `{}`

  `]`

`}`

## [](https://connpass.com/about/api/v2/#tag/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC/operation/connpass_account_account_api_v2_views_user_presenter_event)発表イベント

##### Authorizations:

_APIKeyAuth_

##### path Parameters

<table><tbody><tr><td kind="field" title="nickname"><span></span><span>nickname</span><p>required</p></td><td><div><p><span></span><span>string</span><span> (ニックネーム)</span></p><p><span>Examples: </span><span>haru860</span></p></div></td></tr></tbody></table>

##### query Parameters

<table><tbody><tr><td kind="field" title="start"><span></span><span>start</span></td><td><div><p><span></span><span>integer</span><span> (検索の開始位置) </span><span><span>&gt;= 1</span></span></p><p><span>Default: </span><span>1</span></p></div></td></tr><tr><td kind="field" title="count"><span></span><span>count</span></td><td><div><p><span></span><span>integer</span><span> (取得件数) </span><span><span>[ 1 .. 100 ]</span></span></p><p><span>Default: </span><span>10</span></p></div></td></tr></tbody></table>

### Responses

##### Response Schema: application/json

<table><tbody><tr><td kind="field" title="results_returned"><span></span><span>results_returned</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_available"><span></span><span>results_available</span><p>required</p></td><td></td></tr><tr><td kind="field" title="results_start"><span></span><span>results_start</span><p>required</p></td><td></td></tr><tr><td kind="field" title="events"><span></span><p>required</p></td><td><div><p><span>Array of </span><span>objects</span><span> (イベント一覧)</span></p></div></td></tr></tbody></table>

### Response samples

- 200

Content type

application/json

`{`

- `"results_returned": 1,`
- `"results_available": 91,`
- `"results_start": 1,`
- `"events": [`
  - `{}`

  `]`

`}`
