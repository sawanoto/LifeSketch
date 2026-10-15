# LifeSketch

昨日の出来事や気になったことから、調べ、試し、作品にして広げていくシリーズです。

## 作品を追加する

1. `001_doremi-pipes/` と同じように、このフォルダーの下に作品フォルダーを作る。
2. マーパンはリポジトリ共通の `../shared/marpan-25d.js` を読み込む。共通部品を作品内にコピーしない。
3. 音を使う作品は p5.js と p5.sound のバージョンをそろえ、最初のクリック・タップで `userStartAudio()` を呼ぶ。
4. `works.js` に作品を登録し、PCとスマートフォンの幅で操作と音を確認する。

## Codex Cloud でのプレビュー

このリポジトリのルートで `python3 -m http.server 8000 --bind 0.0.0.0` を起動し、ポート8000のプレビューで `/` と作品ページを開きます。追加のインストールや秘密情報は不要です。CDNの p5.js が読み込めるネットワーク接続は必要です。

変更は作業ブランチとPRで確認します。本番のGitHub Pagesは公開承認後に設定します。PRの作成だけでは本番公開しません。

## マージ前にPC・スマートフォンで遊ぶ

PRプレビューは別サイトの [LifeSketch Preview](https://sawanoto.github.io/LifeSketch-preview/) に配信されます。PR番号が `N` のとき、URLは `https://sawanoto.github.io/LifeSketch-preview/pr-N/` です。

PR #1の作品: https://sawanoto.github.io/LifeSketch-preview/pr-1/001_doremi-pipes/

同じURLをスマートフォンでも開き、パイプや音名をタップして音と操作を確認してください。PCでは数字キー1〜8でも鳴らせます。最初の操作で音声が始まります。

ドレミパイプは、筒の上端をドラッグするか各スライダーを動かすと長さを50〜150%で調整できます。長さと反比例して周波数が変わり、手を離すと試聴できます。「元の長さに戻す」で8本の長さと音を初期状態へ戻します。演奏では筒が地面に接した瞬間に音が鳴ります。

音色はAlexander HolmのSalamander Grand Piano録音を使用しています。11音のMP3を `assets/piano/` に同梱し、長さに応じた再生速度で演奏します。出典とCC BY 3.0の表示は作品ページと `assets/piano/README.md` にあります。

PRを更新すると、専用リポジトリのGitHub Actionsが約5分間隔で変更を検出して配信します。混雑時は遅延することがあります。急ぐ場合は [Refresh PR previews](https://github.com/sawanoto/LifeSketch-preview/actions/workflows/previews.yml) の「Run workflow」で更新できます。一覧ページのコミット表示か、各PR直下の `preview-info.json` で反映済みのコミットを確認できます。PRを閉じると次の更新でプレビューが削除されます。

管理方法と方式の比較: https://github.com/sawanoto/LifeSketch-preview

## 共通マーパン部品

`shared/marpan-25d.js` は MovingSketch のコミット `eb44b094b434f4b9eb6ad0ebcbf52dfe9ca64187` から引き継いでいます。LifeSketch内の作品はこの共通ファイルを参照します。以後の変更はこのリポジトリ内で管理します。

