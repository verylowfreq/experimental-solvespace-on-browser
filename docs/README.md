# Experimental SolveSpace build for the Web browser

実験的なWebブラウザ向けSolveSpaceビルド

**Only for test purpose. Not for daily use.**

**テスト用です。このビルドは常用するものではありません。**

**Try it !** : **[Experimental SolveSpace on the Web browser](https://verylowfreq.github.io/experimental-solvespace-on-browser/solvespace.html)**

**Please send me a patch !**: **[Sourcecode and repository on the GitHub](https://github.com/verylowfreq/solvespace/tree/emscripten)**


![Experimental SolveSpace running on Web browser](https://user-images.githubusercontent.com/60875431/182646032-7d90a7ac-01d5-43fd-acf9-e690887ba856.png)

SolveSpace is a parametric 2D/3D CAD under the GPL v3 (or later).

This repository contains the binaries to run on the Web browser; built with Emscripten as an WebAssembly output.

SolveSpaceはパラメトリックな2D/3D CADです。GPL v3(もしくはそれ以降)でライセンスされています。

このレポジトリ（ページ）には、ブラウザで実行するためのバイナリが含まれています。Emscriptenでビルドされ、WebAssemblyで出力されています。


## What's this ? / これはなに？

This build is

 - based on https://github.com/solvespace/solvespace/tree/emscripten
 - changed to build the latest environment and tools
 - merged recent commits from the master branch

このビルドは

 - 以下をもとにしています。 https://github.com/solvespace/solvespace/tree/emscripten
 - 最新環境と最新ツールセットでビルドできるように改変しています。
 - masterブランチからコミットをマージしています。

## Problems / 問題点

Known problems:

 - Cannot open/save file (Not implemented)
 - You can open with Safari on iOS, but...
   - Cannot move the camera.
   - Cannot open a menu.
 - Color picker not react to mouse click.
 - Extrude operation often fails (more often than desktop build).
   - Workaround: Operation will success with Force NURBS option.
 - and more.

既知の問題は、

 - ファイルの読み書きができません。(実装されていません。)
 - iOSのSafariで開けますが、
   - カメラの移動ができません。
   - メニューが開けません。
 - カラーピッカーがマウスのクリックに反応しません。
 - 押し出し操作は頻繁に失敗します。
   - 回避策: Force NURBSオプションを使用してください。
 - その他たくさん。
