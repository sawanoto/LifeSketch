# PRをブラウザーで確認する

Cloudのlocalhostは手元の端末からは開けません。作品はPRにして、PRコメントの専用Pages URLをPC・スマートフォンで開いて確認します。作品のPRは所有者が確認するまでマージしません。

## 構成

|作品のリポジトリ|確認用の専用リポジトリ|PRのURL|
|---|---|---|
|sawanoto/LifeSketch|sawanoto/LifeSketch-preview|https://sawanoto.github.io/LifeSketch-preview/pr-N/|
|sawanoto/MovingSketch|sawanoto/MovingSketch-preview|https://sawanoto.github.io/MovingSketch-preview/pr-N/|

本番のPages公開元・main・gh-pagesブランチにはPRのファイルを置きません。専用リポジトリのPagesで全PRを別ディレクトリへ配信します。GitHub Pagesはプロジェクト用サイトを1リポジトリにつき1つしか持てないため、同じリポジトリに2つ目のPages環境を作る方式は採用しません。別リポジトリでもドメインは同じ `sawanoto.github.io` なので、別オリジンによるセキュリティ分離ではありません。

### PRを作成・更新したとき

1. 作品リポジトリの `PR preview` ワークフローがPRコメントを作成・更新します。ギャラリーと変更された作品の直リンク、対象のhead SHA、配信Actions、代替ファイルの場所を表示します。同じコメントを更新するので通知を積み重ねません。
2. 専用プレビューリポジトリの既存 `Refresh PR previews` が約5分間隔の設定で未マージPRのhead SHAを読み、変更時だけスナップショットを配信します。PRを閉じると次の配信で削除します。追加PAT・外部サービスのアカウントは不要です。
3. コメントのURLは配信前から表示される予約URLです。`pr-N/preview-info.json` の `sha` がPRのhead SHAと一致することを確認してください。最新の反映を待つ間は404や前のコミットが表示される場合があります。

全体のディレクトリ構成を保ってコピーするため、`../shared/marpan-25d.js`、ローカルp5.js / p5.sound、音源などの相対パスが維持されます。既存プレビュー側ではHTMLのローカルscript/linkにコミットごとのキャッシュ更新パラメーターを付けます。ルート絶対パス `/shared/...` や本番URLのハードコードはPRのサブディレクトリを外れるため使わず、相対パスで実装してください。CDNを使う既存作品は閲覧端末からCDNへの接続も必要です。

ブラウザーの音声制約により、最初に画面または音ボタンをタップしてください。スマートフォンは実機で音量・タップのしやすさも確認します。

## 無料で運用する条件と待ち時間

公開リポジトリのGitHub Pagesと標準のGitHub-hosted runnerを使います。GitHub Freeで利用でき、標準runnerの公開リポジトリ実行は無料です。Pagesの公開サイズ上限は1GB、帯域には月100GBのsoft limitなどがあります。全PRのコピーを同じ確認用サイトへ載せるので、大きなリポジトリ・多数の同時PRでは容量に注意します。Larger runnerや有料の外部ホスティングは使いません。

GitHubのscheduleは即時実行の保証がなく、混雑時は遅延や実行の欠落があります。「5分で必ず配信」ではありません。公開リポジトリの定期実行は60日無活動で停止することもあります。急ぐ場合は、専用リポジトリのActions → Refresh PR previews → Run workflow（main）を使います。この手動更新でも作品のPRはマージしません。

PR更新イベントから別リポジトリへ直接dispatchするには通常は追加のGitHub App/PAT等が必要です。現在は秘密情報の追加管理を避け、既存の定期確認と手動更新を使います。イベント直後の配信が必要になった場合は、Cloudflare Pages/NetlifyのGit連携が代替ですが、外部アカウント・リポジトリ接続の設定が必要です。

## 開けないとき

|状態|理由の調べ方・対応|
|---|---|
|404・古い作品|preview-info.jsonのSHAを比較。専用Actionsの直近実行・キュー・失敗ログを確認し、Run workflowを実行。ブラウザーも再読み込み|
|定期更新が来ない|scheduleの遅延や無活動停止。Actionsで再有効化または手動実行|
|Pages配信ジョブが失敗|専用リポジトリのSettings → Pages → SourceがGitHub Actionsか、github-pages環境の承認待ち・main許可・Pages/Actions権限・サイズ超過を確認。本番リポジトリのPages設定は変更しない|
|PRコメントがない|作品側のPR previewのlinkジョブを確認。pull-requests:writeが管理ポリシーで制限されると403になる。PR本文へ同じ規則のURLを記載することでも代用可能|
|forkのPR|専用デプロイヤーは同じリポジトリ内のPRのみ対象。書き込み権限も渡さない。所有者が確認済みのブランチを作品リポジトリ内に作るか、代替artifactで確認|
|音が出ない|最初のクリック/タップで音声を開始。端末の音量、音ボタン、CDN/音源の404や接続失敗を確認|
|CloudからURLを検証できない|Cloudのネットワーク許可先にgithub.ioがない場合、外部HTTP確認は失敗する。GitHub Actionsの配信ログと手元ブラウザーで確認し、Cloudのlocalhostを外部URLとして案内しない|

プレビューには未マージのファイルが公開されます。公開してはいけないデータは含めないでください。既存専用デプロイヤーはPR内のビルド・ワークフローを実行せず、静的ファイルとしてコピーします。作品側のartifactジョブもPRのインストール/ビルド処理を実行しません。コメントを書き込むジョブはcheckoutせず、GitHub APIのメタデータだけを使います。

## 代替: 手元のPCでLive Serverを使う

各PRの `PR preview` → `snapshot` ジョブが、head SHAのリポジトリ全体を `preview-pr-N-SHA` artifact（保存7日）として用意します。Actions画面のArtifactsからダウンロードし、ZIP全体を展開します。artifactの取得にはGitHubへのログインが必要です。Actions自体が使えなければPRのheadブランチをGitHubのCode → Download ZIPから取得します。

展開したルートをVSCodeで開き、Live Serverでルートのindex.htmlを起動します。作品フォルダーだけを抜き出すとsharedなどの相対参照が壊れます。ZIPはHTTPサーバーではないため、スマートフォンから直接操作できるURLにはなりません。

スマートフォンでも確認する場合は、同じWi-Fiの手元PCでルートを配信します。

```sh
python -m http.server 8000 --bind 0.0.0.0
```

スマートフォンで `http://手元PCのLAN内IP:8000/` を開きます。PCのファイアウォールでローカルネットワークからの接続を許可します。ここで使うのは手元PCのLAN内IPであり、Cloudのlocalhostではありません。

## 今後の制作手順

作品を独立したフォルダーに追加 → 共通マーパンを相対参照 → works.jsに登録 → 作業ブランチをpushしてPR作成 → PRのプレビューコメントから実機確認 → 所有者の確認後にマージ。PR previewワークフローを導入する今回のPRも、同じリポジトリのpull_requestイベントで確認できます。今後の全PRで自動通知を使うには、この仕組みのPRを所有者確認後にmainへ取り込む必要があります。

## 仕様の根拠

- [GitHub Pages: サイトの種類と1リポジトリ1サイト](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pagesの制限](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GitHub Actionsの料金](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [scheduleの遅延・60日無活動停止とpull_requestの動作](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
