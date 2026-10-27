# LifeSketch 020 · マーパンノート

## 開く・保存する

リポジトリ全体をHTTP配信します。ビルドやnpm installは不要です。

```sh
python -m http.server 8000
```

- 表紙: `http://localhost:8000/020_marpan-notebook/`
- 制作資料: `http://localhost:8000/020_marpan-notebook/poses.html`
- 表紙の「表紙をPNGで保存」で2500×3535pxの不透明PNGを保存します。ボタン・説明は含みません。保存が始まらない端末では、書き出し後の「PNGを開く・保存する」から画像を開き、ブラウザーの画像保存を使います。
- 一覧では5ポーズを並べ、表情・追加回転（±30°）・左右反転を切り替えます。ポーズ名と説明も表示します。

Cloudのlocalhostは手元端末では開けません。PR専用プレビューか、ダウンロードしたリポジトリ全体を手元PCで配信してください。[プレビュー手順](../docs/pr-previews.md)。

## 正規デザインと調査結果

2026-10-25に以下のmainを調査しました。

| リポジトリ | 調査コミット | 確認箇所 |
| --- | --- | --- |
| LifeSketch | `4a4f762` | `shared/marpan-25d.js`, 005, 011, 016, 019 |
| MovingSketch | `a2118d78c7e8fea684d4b1a3e92d946ed393a210` | `shared/marpan-25d.js`, `30_Bread/bread-marpan.js` |
| BibleSketch | `6b0d638885841309bb047115afdeed45af61da62` | `shared/marpan-25d.js`, README, `002-cain-and-abel/sketch.js` |

3リポジトリの共通描画ファイルはSHA-256 `dd8cb6182cbb1630ee6a17f220ac55f09f43c58f1ac4e887c751e78c0c7d9617` で一致しました。BibleSketchのREADMEにもLifeSketchから口のない三つ目をそのまま取り込んだ旨があります。

- 身体: `drawBody`のベジェ輪郭。標準の幅:高さは1000:680。
- 目: `drawEyes`の3眼。yawによる投影、白目・黒い輪郭・瞳。表情は目の内部のstyleで切り替えます。
- 口・手足・首: 共通実装に存在しません。基本造形維持を優先し、今回も追加していません。参考画像2の二つ目・口付きキャラクターには描き替えていません。
- 表情: `setExpression`, `setEyeStyle`, `setExpressionState`が既存API。今回は描画オプションのexpressionを使用し、インスタンスに個別設定を蓄積しません。
- 動作: 共通に瞬き、autoBlink、pulse、yaw、視線。LifeSketchの011は外部の移動制御、016は外部の回転・成長、019は外部の軌道制御です。描画と時間制御を分ける既存方式を踏襲しました。
- 再利用: 005のように共通描画を直接使用する方式を採用。MovingSketchのパン用サブクラスによる輪郭変更は今回の目的では採用しません。

既存の共通ファイルと作品は変更していません。新ライブラリを読み込まない作品の動作は変わりません。初回制作時は既存の公開ナビゲーションを維持しました。その後の依頼により、LifeSketch 020「マーパンノート」として `works.js` に登録し、表紙・一覧に作品一覧へのリンクを追加しています。

## 参考画像からの解釈

緑の平面・上部の白いタイトル・5列4行・十分な余白を採用しました。犬の耳・毛並み、写真の手・反射・周辺風景は含みません。

| pose | 名称 | 身体構造に合わせた静止ポーズ |
| --- | --- | --- |
| `walking` | 歩く | 前方へ少し傾き、重心・yawを進行方向に寄せる |
| `joyful` | 喜ぶ | 接地位置より身体を持ち上げ、視線を上げる |
| `sitting` | 正面で座る | 0回転、0 yawで正面に接地 |
| `reclining` | 寝転ぶ | 身体を横に倒し、低い重心と視線で休息を表す |
| `tilting` | 首をかしげる | 首のない身体全体を傾け、上方の視線にする |

手足の動きの代わりに上記の重心・姿勢で表すため、文字どおりの片足歩行・両手を広げる・手足を揃える・手を伸ばす動作にはなっていません。手足版を作る場合は正規デザインとしての承認と身体構造の設計が必要です。

表情は `neutral`（pupil）、`happy`（happy）、`surprised`（surprised）、`confused`（worried）、`sleepy`（sleepy）の5種類。困惑は静止画で時刻に依存しない既存のworried表情を採用しています。ポーズと独立し全25組を使用可能。表紙は20組を重複なく選び、参考画像の5つの姿勢の並びのリズムを保っています。

## 他作品から使う

p5.jsの**グローバルモード・2D Canvas**で使用します。p5.soundは不要。次の順で読み込み、`setup`でRendererを生成します。下記相対パスはLifeSketch内の作品フォルダーを想定しています。

```html
<script src="../002_jomon-room/p5.min.js"></script>
<script src="../shared/marpan-25d.js"></script>
<script src="../shared/marpan-poses.js"></script>
```

```js
let marpan;
function setup() {
  createCanvas(600, 600);
  marpan = new MarpanPoses.Renderer();
  noLoop();
}
function draw() {
  background('#48b52c');
  marpan.draw({
    x: 200, y: 300, size: 100,
    pose: 'walking', expression: 'happy', rotation: 0,
    mirror: false
  });
}
```

`x,y`はポーズ適用前の身体中心。sizeは傾く前の共通身体幅であり、外接矩形ではありません。rotationはポーズの傾きに加えるラジアン値。p5のangleModeは既定のRADIANSを使用してください。mirrorは身体のローカル左右反転です。描画中はpush/popで呼び出し側の状態を保護します。内部は1000単位で描き、共通部品の最小線幅がサムネイルを太くしすぎないよう均一に縮小します。描画は時計・乱数に依存しません。

BibleSketch・絵本など別リポジトリには、使用コミットを固定して `shared/marpan-poses.js` を共通ディレクトリへ取り込み、同一の `Marpan25D` とp5.jsの後に読み込んでください。作品内へ輪郭や目のコードを複製する必要はありません。今回は他リポジトリを変更していません。

## ポーズの追加・将来のアニメーション

```js
// poses.js（一覧側のsetup）が動くより前に登録します。
MarpanPoses.registerPose('looking-up', {
  label: '見上げる', description: '目線を上へ。',
  sample: () => ({ angle: -0.1, yaw: 0, dx: 0, dy: 0, eyeGroupOffsetY: -40 })
});
```

一覧は `listPoses()` から生成されるため、新ポーズも自動表示します。表紙の配置は完成作品として `cover.js` の固定データで管理し、新ポーズ追加で勝手に変わりません。IDの重複・不明なポーズ・表情・不正な数値は例外になります。

`samplePose(pose)`は純粋な姿勢データ。dx,dyは身体幅の比率、angle,yawはラジアン、eyeGroupOffsetYは1000単位系です。外部の時間制御から `state` を渡して上書きできます。

```js
const frame = MarpanPoses.samplePose('walking');
// tは呼び出し側が管理する秒。ライブラリは再生・停止を制御しません。
marpan.draw({ x: 200, y: 300, pose: 'walking', expression: 'happy',
  state: { angle: frame.angle + Math.sin(t * 6) * 0.04,
           dy: frame.dy - Math.abs(Math.sin(t * 6)) * 0.03 } });
```

今回は再生ループ・補間・歩行周期は実装していません。今後はポーズ間補間、接地基準、左右方向、reduced-motion、静止書き出し時刻の固定を外部コントローラーで設計します。手を振る・手足を伴う歩行は手足構造の合意が先に必要です。寝返りは身体の回転、首かしげは全身回転とyawで拡張できます。

## 確認

```sh
node --test 020_marpan-notebook/tests/poses.test.cjs
```

表紙の20組と5列4行、標準比率の維持、全25表情組み合わせ、状態漏れ、拡張登録、外部姿勢上書きを検証します。ブラウザー確認結果は [VALIDATION.md](VALIDATION.md) を参照してください。
