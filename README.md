# LifeSketch

昨日の出来事や気になったことから、調べ、試し、作品にして広げていくシリーズです。

## 作品を追加する

1. `001_doremi-pipes/` と同じように、このフォルダーの下に作品フォルダーを作る。
2. マーパンはリポジトリ共通の `../shared/marpan-25d.js` を読み込む。共通部品を作品内にコピーしない。
3. 音を使う作品は p5.js と p5.sound のバージョンをそろえ、最初のクリック・タップで `userStartAudio()` を呼ぶ。
4. `works.js` に作品を登録し、PCとスマートフォンの幅で操作と音を確認する。

## Codex Cloud でのプレビュー

Cloudのlocalhostは手元PC・スマートフォンから直接開けません。PRを作成し、PRコメントの専用プレビューURLで確認します。約5分間隔の設定で変更を検出しますが、GitHubの混雑時は遅延します。反映済みSHAを確認してください。本番mainは所有者の確認前にマージしません。

[PRプレビューの構成・制限・障害時の代替方法](docs/pr-previews.md)

## LifeSketch 002 · 縄文の部屋

`002_jomon-room/`。土偶以外の28点を自由に消し、物が減るにつれて変わる音と余白を体験します。PNG書き出しから4段階の3200×2400px画像を保存できます。最終ページは土偶だけです。操作・音声・書き出しの詳細は[作品README](002_jomon-room/README.md)を参照してください。

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


## LifeSketch 003 · Butterfly Effect

`003_butterfly-effect/`。蝶マーパンの小さな羽ばたきが外周の竜巻へと育つ作品。タップの間隔で風の重なり方が変わり、静かにすると自然に消えます。右下から絵本用の4場面を3200×2400px PNGとして保存できます。[作品README](003_butterfly-effect/README.md)。

## LifeSketch 004 · 飛行機を見上げる

`004_looking-up/`。空をタップして飛行機を動かすと、窓や屋上のマーパンたちが次々に見上げます。共通の三つ目を保ち、瞳だけを滑らかに動かします。PCのマウス・矢印キーとスマートフォンのタップに対応。最初の操作で小さなエンジン音が始まります。
