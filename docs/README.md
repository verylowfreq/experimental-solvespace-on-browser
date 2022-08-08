# Experimental SolveSpace build for the Web-browser

実験的なWebブラウザ向けSolveSpaceビルド

SolveSpace is a parametric 2D/3D CAD under the GPL v3 (or later). Windows, macOS, Linux and BSD are supported, and experimental Web-browser support also exists. This page contains that custombuild.

SolveSpaceはパラメトリックな2D/3D CADです。GPL v3(もしくはそれ以降)でライセンスされています。Windows, macOS, Linux, BSDがサポートされ、実験的なWebブラウザサポートも存在します。ここにはそのカスタムビルドがあります。

**Only for test purpose. Not for daily use. / テスト用です。このビルドは常用するものではありません。**

**See the knwon issues before trying. / 試す前に既知の問題を確認してください。**

Two or three finger touch works as moving camera but may cause crash. / 2本指や3本指のタッチはカメラの移動として機能しますがアプリがクラッシュすることがあります。

**＞＞＞ Try it ! : [https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080801/solvespace.html](https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080801//solvespace.html) ＜＜＜**

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

 - Pointer and touch position is sometimes misaligned a little.
 - ~~Cannot open/save file (Not implemented)~~
 - You can open with Safari on iOS, but...
   - ~~Cannot move the camera.~~
   - Cannot open a menu. Cannot click buttons on some dialog.
 - Color picker not react to mouse click.
 - Extrude operation often fails (more often than desktop build).
   - ~~Workaround: Use "Force NURBS" option.~~
   - Set "configuration -> chord tolerance" to "0.1" manually. (maybe "0" is set if you encounter this problem.)
   - If this value goes back to "0" on next opening this app, try to clear the data on this site in your Web-browser's settings.
 - and more.

 - ポインターやタッチの位置が少しずれる場合があります。
 - ~~ファイルの読み書きができません。(実装されていません。)~~
 - iOSのSafariで開けますが、
   - ~~カメラの移動ができません。~~
   - メニューが開けません。
 - カラーピッカーがマウスのクリックに反応しません。
 - 押し出し操作は頻繁に失敗します。
   - ~~回避策: Force NURBSオプションを使用してください。~~
   - "configuration -> chord tolerance" を 0.1 に**手動で**設定してください。（この問題に遭遇した場合、おそらく "0" になっていると思います。）
   - 次回以降の起動時に値が 0 に戻る場合は、ブラウザの設定で、このサイトに関するデータの削除を試してみてください。
 - その他たくさん。


## History / 公開履歴

 - 2022-08-08
   - [https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080801/solvespace.html](https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080801/solvespace.html)
   - https://github.com/verylowfreq/solvespace/commit/a535ef6c53357272ed4e67bc7ea1f31a1955bb9d
   - ADD: File upload/download. Touch available.
 - 2022-08-03
   - [https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080301/solvespace.html](https://verylowfreq.github.io/experimental-solvespace-on-browser/bin-2022080301/solvespace.html)
   - https://github.com/verylowfreq/solvespace/commit/d13992ac6e2c67b33cc2cd88a3ec979bee2e8a8f
