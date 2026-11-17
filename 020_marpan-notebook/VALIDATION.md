# 確認結果（2026-10-25）

- 最新main `4a4f762` を取得し、独立ブランチで作業。
- `shared/marpan-25d.js` は未変更。MovingSketch・BibleSketchの同ファイルともSHA-256一致。
- 新ライブラリの4テストと既存作品の13テスト、計17件成功。
- Chromium 1280×1000、390×844、320×844で確認。表紙・一覧・既存ギャラリー・019に横はみ出しなし。JavaScript例外なし。
- 5表情すべてで描画ピクセルが変化。左右反転・回転30°、追加登録ポーズの自動表示を確認。
- PNGダウンロードの実ファイルが2500×3535px。書き出し前後の表示Canvasはdata URLで完全一致。
- タッチをエミュレートした390×844でも保存ボタンと左右反転を操作できることを確認。
- 表紙・一覧のスクリーンショットを目視確認。一覧の作業CanvasがCSSで表示される問題を修正し、再確認済み。
- スマートフォン実機・Safariの画像保存は未確認。保存後にPNGを開くフォールバックリンクあり。
- 外部CDN・音源・ネットワークを必要としない静止作品。

## 再実行

リポジトリルートをHTTP配信した上で、Playwrightがインストールされた環境で:

```sh
node --test 020_marpan-notebook/tests/poses.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node 020_marpan-notebook/tests/browser.cjs
```

Playwright管理のブラウザーを使う場合はCHROMIUM_PATHを省略します。別の配信先はPREVIEW_ROOTで指定できます（末尾 `/`）。ブラウザーテストの生成PNGとスクリーンショットは実行ログに表示する一時ディレクトリに保存します。
