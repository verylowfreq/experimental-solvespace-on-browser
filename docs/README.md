# Experimental SolveSpace build for the Web-browser

実験的なWebブラウザ向けSolveSpaceビルド

SolveSpace is a parametric 2D/3D CAD under the GPL v3 (or later). Windows, macOS, Linux and BSD are supported, and experimental Web-browser support also exists. This page contains that custombuild.

SolveSpaceはパラメトリックな2D/3D CADです。GPL v3(もしくはそれ以降)でライセンスされています。Windows, macOS, Linux, BSDがサポートされ、実験的なWebブラウザサポートも存在します。ここには実験的なWebブラウザのカスタムビルドがあります。

**Only for test purpose. Not for daily use. / テスト用です。このビルドは常用するものではありません。**

**See the knwon issues before trying. / 試す前に既知の問題を確認してください。**

 - Web-browser on Windows: Many functions works. / Windows上のWebブラウザ: 多くの機能が動きます。
 - Safari on iOS: You can open the app, but with restrictions. / iOS上のSafari: 起動できますが、制約があります。
 - Chrome on Android: Not tested. You may unable to open the app. / Android上のChrome: テストされていません。起動できないかもしれません。

You cannot open/save file. If you try, then crash. / ファイルを開いたり保存することはできません。試すとクラッシュします。

**＞＞＞ Try it ! : [https://verylowfreq.github.io/experimental-solvespace-on-browser/solvespace.html](https://verylowfreq.github.io/experimental-solvespace-on-browser/solvespace.html) ＜＜＜**

Sourcecode: [https://github.com/verylowfreq/solvespace/tree/emscripten](https://github.com/verylowfreq/solvespace/tree/emscripten)

![Experimental SolveSpace running on Web browser](https://user-images.githubusercontent.com/60875431/182646032-7d90a7ac-01d5-43fd-acf9-e690887ba856.png)

## What's this ? / これはなに？

This build is

 - based on https://github.com/solvespace/solvespace/tree/emscripten
 - changed to build the latest environment and tools
 - merged recent commits from the master branch

このビルドは

 - 以下をもとにしています。 https://github.com/solvespace/solvespace/tree/emscripten
 - 最新環境と最新ツールセットでビルドできるように改変しています。
 - masterブランチからコミットをマージしています。

## Known issues / 既知の問題点

 - Cannot open/save file (Not implemented)
 - You can open with Safari on iOS, but...
   - Cannot move the camera.
   - Cannot open a menu.
 - Color picker not react to mouse click.
 - Extrude operation often fails (more often than desktop build).
   - Workaround: Use "Force NURBS" option.
 - and more.

 - ファイルの読み書きができません。(実装されていません。)
 - iOSのSafariで開けますが、
   - カメラの移動ができません。
   - メニューが開けません。
 - カラーピッカーがマウスのクリックに反応しません。
 - 押し出し操作は頻繁に失敗します。
   - 回避策: Force NURBSオプションを使用してください。
 - その他たくさん。
