# Experimental SolveSpace build for the Web-browser

実験的なWebブラウザ向けSolveSpaceビルド

SolveSpace is a parametric 2D/3D CAD under the GPL v3 (or later). Windows, macOS, Linux and BSD are supported, and experimental Web-browser support also exists. This page contains that custombuild.

SolveSpaceはパラメトリックな2D/3D CADです。GPL v3(もしくはそれ以降)でライセンスされています。Windows, macOS, Linux, BSDがサポートされ、実験的なWebブラウザサポートも存在します。ここにはそのカスタムビルドがあります。

**Only for test purpose. Not for daily use. / テスト用です。このビルドは常用するものではありません。**

**See the knwon issues before trying. / 試す前に既知の問題を確認してください。**

**＞＞＞ Try it ! : [https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022081301/solvespace.html](https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022081301/solvespace.html) ＜＜＜**

Sourcecode: [https://github.com/verylowfreq/solvespace/tree/emscripten-develop](https://github.com/verylowfreq/solvespace/tree/emscripten-develop)

![Experimental SolveSpace running on Web browser](https://user-images.githubusercontent.com/60875431/182646032-7d90a7ac-01d5-43fd-acf9-e690887ba856.png)

## What's this ? / これはなに？

This build is

 - based on https://github.com/solvespace/solvespace/tree/emscripten
 - changed to build the latest environment and tools
 - merged recent commits from the master branch
 - containing some feature improvements (but not perfect).

このビルドは

 - 以下をもとにしています。 https://github.com/solvespace/solvespace/tree/emscripten
 - 最新環境と最新ツールセットでビルドできるように改変しています。
 - masterブランチからコミットをマージしています。
 - 独自の機能追加をしています（完璧な実装ではありません）。

## Known issues / 既知の問題点

 - You can open with Safari on iPad OS. Not tested on iOS.
 - You can or cannot run on Web browser on Android devices.
   - Not tested.
   - Works on Tablet device. Display issue on Smartphone device.
 - ~~Color picker not react to mouse click.~~
 - Extrude operation often fails ~~(more often than desktop build).~~
   - ~~Workaround: Use "Force NURBS" option.~~
   - Set "configuration -> chord tolerance" to "0.1" manually. (maybe "0" is set if you encounter this problem.)
   - If this value goes back to "0" on next opening this app, try to clear the data on this site in your Web-browser's settings.
   - This resolved by fixing setting store/read code.
 - and more.

 - iPad OSのSafariで動作します。iOSでは不明です。
 - Androidのブラウザでは動くかもしれないし動かないかもしれません。
   - テストされていません。
   - タブレットデバイスではあまり発生しませんが、スマートフォンデバイスでは描画のずれが著しいです。
 - ~~カラーピッカーがマウスのクリックに反応しません。~~
 - 押し出し操作は頻繁に失敗します。
   - ~~回避策: Force NURBSオプションを使用してください。~~
   - "configuration -> chord tolerance" を 0.1 に**手動で**設定してください。（この問題に遭遇した場合、おそらく "0" になっていると思います。）
   - 次回以降の起動時に値が 0 に戻る場合は、ブラウザの設定で、このサイトに関するデータの削除を試してみてください。
   - 設定値の読み込みと保存について修正したことにより解決。
 - その他たくさん。


## History / 公開履歴

 - 2022-08-13
   - [https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022081301/solvespace.html](https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022081301/solvespace.html)
   - [https://github.com/verylowfreq/solvespace/commit/7e9a731445b6be06a7d6db3e0ab0172c10ba027b](https://github.com/verylowfreq/solvespace/commit/7e9a731445b6be06a7d6db3e0ab0172c10ba027b)
   - FIX: Color picker. ADD: Scroll in property window. IMPROVE: File dialog.
 - 2022-08-08 03
   - [https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080803/solvespace.html](https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080803/solvespace.html)
   - https://github.com/verylowfreq/solvespace/commit/b62c437cc2eb5bb623dbe2d10a7eec2d2fb0c50f
   - FIX: Click menu and button by touch.
 - 2022-08-08 02
   - [https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080802/solvespace.html](https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080802/solvespace.html)
   - https://github.com/verylowfreq/solvespace/commit/7c85617f91d5632e2462202c6baa991705fce2d8
   - FIX: Invalid binaries uploaded (File upload/download not included). Crash on touch operations.
 - 2022-08-08 01
   - [https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080801/solvespace.html](https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080801/solvespace.html)
   - https://github.com/verylowfreq/solvespace/commit/a535ef6c53357272ed4e67bc7ea1f31a1955bb9d
   - ADD: File upload/download. Touch available.
 - 2022-08-03
   - [https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080301/solvespace.html](https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080301/solvespace.html)
   - https://github.com/verylowfreq/solvespace/commit/d13992ac6e2c67b33cc2cd88a3ec979bee2e8a8f
