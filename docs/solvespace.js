var Module = typeof Module != "undefined" ? Module : {};
if (!Module.expectedDataFileDownloads) {
    Module.expectedDataFileDownloads = 0
}
Module.expectedDataFileDownloads++;
(function() {
    if (Module["ENVIRONMENT_IS_PTHREAD"]) return;
    var loadPackage = function(metadata) {
        var PACKAGE_PATH = "";
        if (typeof window === "object") {
            PACKAGE_PATH = window["encodeURIComponent"](window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf("/")) + "/")
        } else if (typeof process === "undefined" && typeof location !== "undefined") {
            PACKAGE_PATH = encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf("/")) + "/")
        }
        var PACKAGE_NAME = "../bin/solvespace.data";
        var REMOTE_PACKAGE_BASE = "solvespace.data";
        if (typeof Module["locateFilePackage"] === "function" && !Module["locateFile"]) {
            Module["locateFile"] = Module["locateFilePackage"];
            err("warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)")
        }
        var REMOTE_PACKAGE_NAME = Module["locateFile"] ? Module["locateFile"](REMOTE_PACKAGE_BASE, "") : REMOTE_PACKAGE_BASE;
        var REMOTE_PACKAGE_SIZE = metadata["remote_package_size"];

        function fetchRemotePackage(packageName, packageSize, callback, errback) {
            if (typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string") {
                require("fs").readFile(packageName, function(err, contents) {
                    if (err) {
                        errback(err)
                    } else {
                        callback(contents.buffer)
                    }
                });
                return
            }
            var xhr = new XMLHttpRequest;
            xhr.open("GET", packageName, true);
            xhr.responseType = "arraybuffer";
            xhr.onprogress = function(event) {
                var url = packageName;
                var size = packageSize;
                if (event.total) size = event.total;
                if (event.loaded) {
                    if (!xhr.addedTotal) {
                        xhr.addedTotal = true;
                        if (!Module.dataFileDownloads) Module.dataFileDownloads = {};
                        Module.dataFileDownloads[url] = {
                            loaded: event.loaded,
                            total: size
                        }
                    } else {
                        Module.dataFileDownloads[url].loaded = event.loaded
                    }
                    var total = 0;
                    var loaded = 0;
                    var num = 0;
                    for (var download in Module.dataFileDownloads) {
                        var data = Module.dataFileDownloads[download];
                        total += data.total;
                        loaded += data.loaded;
                        num++
                    }
                    total = Math.ceil(total * Module.expectedDataFileDownloads / num);
                    if (Module["setStatus"]) Module["setStatus"]("Downloading data... (" + loaded + "/" + total + ")")
                } else if (!Module.dataFileDownloads) {
                    if (Module["setStatus"]) Module["setStatus"]("Downloading data...")
                }
            };
            xhr.onerror = function(event) {
                throw new Error("NetworkError for: " + packageName)
            };
            xhr.onload = function(event) {
                if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || xhr.status == 0 && xhr.response) {
                    var packageData = xhr.response;
                    callback(packageData)
                } else {
                    throw new Error(xhr.statusText + " : " + xhr.responseURL)
                }
            };
            xhr.send(null)
        }

        function handleError(error) {
            console.error("package error:", error)
        }
        var fetchedCallback = null;
        var fetched = Module["getPreloadedPackage"] ? Module["getPreloadedPackage"](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE) : null;
        if (!fetched) fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, function(data) {
            if (fetchedCallback) {
                fetchedCallback(data);
                fetchedCallback = null
            } else {
                fetched = data
            }
        }, handleError);

        function runWithFS() {
            function assert(check, msg) {
                if (!check) throw msg + (new Error).stack
            }
            Module["FS_createPath"]("/", "res", true, true);
            Module["FS_createPath"]("/res", "freedesktop", true, true);
            Module["FS_createPath"]("/res", "icons", true, true);
            Module["FS_createPath"]("/res/icons", "graphics-window", true, true);
            Module["FS_createPath"]("/res/icons", "text-window", true, true);
            Module["FS_createPath"]("/res", "locales", true, true);
            Module["FS_createPath"]("/res", "fonts", true, true);
            Module["FS_createPath"]("/res/fonts", "private", true, true);
            Module["FS_createPath"]("/res", "shaders", true, true);
            Module["FS_createPath"]("/res", "threejs", true, true);

            function DataRequest(start, end, audio) {
                this.start = start;
                this.end = end;
                this.audio = audio
            }
            DataRequest.prototype = {
                requests: {},
                open: function(mode, name) {
                    this.name = name;
                    this.requests[name] = this;
                    Module["addRunDependency"]("fp " + this.name)
                },
                send: function() {},
                onload: function() {
                    var byteArray = this.byteArray.subarray(this.start, this.end);
                    this.finish(byteArray)
                },
                finish: function(byteArray) {
                    var that = this;
                    Module["FS_createDataFile"](this.name, null, byteArray, true, true, true);
                    Module["removeRunDependency"]("fp " + that.name);
                    this.requests[this.name] = null
                }
            };
            var files = metadata["files"];
            for (var i = 0; i < files.length; ++i) {
                new DataRequest(files[i]["start"], files[i]["end"], files[i]["audio"] || 0).open("GET", files[i]["filename"])
            }

            function processPackageData(arrayBuffer) {
                assert(arrayBuffer, "Loading data file failed.");
                assert(arrayBuffer instanceof ArrayBuffer, "bad input to processPackageData");
                var byteArray = new Uint8Array(arrayBuffer);
                DataRequest.prototype.byteArray = byteArray;
                var files = metadata["files"];
                for (var i = 0; i < files.length; ++i) {
                    DataRequest.prototype.requests[files[i].filename].onload()
                }
                Module["removeRunDependency"]("datafile_../bin/solvespace.data")
            }
            Module["addRunDependency"]("datafile_../bin/solvespace.data");
            if (!Module.preloadResults) Module.preloadResults = {};
            Module.preloadResults[PACKAGE_NAME] = {
                fromCache: false
            };
            if (fetched) {
                processPackageData(fetched);
                fetched = null
            } else {
                fetchedCallback = processPackageData
            }
        }
        if (Module["calledRun"]) {
            runWithFS()
        } else {
            if (!Module["preRun"]) Module["preRun"] = [];
            Module["preRun"].push(runWithFS)
        }
    };
    loadPackage({
        "files": [{
            "filename": "/res/freedesktop/solvespace-48x48.png",
            "start": 0,
            "end": 352
        }, {
            "filename": "/res/banner.txt",
            "start": 352,
            "end": 364
        }, {
            "filename": "/res/icons/graphics-window/angle.png",
            "start": 364,
            "end": 622
        }, {
            "filename": "/res/icons/graphics-window/arc.png",
            "start": 622,
            "end": 840
        }, {
            "filename": "/res/icons/graphics-window/assemble.png",
            "start": 840,
            "end": 1054
        }, {
            "filename": "/res/icons/graphics-window/bezier.png",
            "start": 1054,
            "end": 1256
        }, {
            "filename": "/res/icons/graphics-window/circle.png",
            "start": 1256,
            "end": 1446
        }, {
            "filename": "/res/icons/graphics-window/construction.png",
            "start": 1446,
            "end": 1649
        }, {
            "filename": "/res/icons/graphics-window/equal.png",
            "start": 1649,
            "end": 1898
        }, {
            "filename": "/res/icons/graphics-window/extrude.png",
            "start": 1898,
            "end": 2114
        }, {
            "filename": "/res/icons/graphics-window/helix.png",
            "start": 2114,
            "end": 2357
        }, {
            "filename": "/res/icons/graphics-window/horiz.png",
            "start": 2357,
            "end": 2518
        }, {
            "filename": "/res/icons/graphics-window/image.png",
            "start": 2518,
            "end": 2745
        }, {
            "filename": "/res/icons/graphics-window/in3d.png",
            "start": 2745,
            "end": 2974
        }, {
            "filename": "/res/icons/graphics-window/lathe.png",
            "start": 2974,
            "end": 3234
        }, {
            "filename": "/res/icons/graphics-window/length.png",
            "start": 3234,
            "end": 3457
        }, {
            "filename": "/res/icons/graphics-window/line.png",
            "start": 3457,
            "end": 3610
        }, {
            "filename": "/res/icons/graphics-window/ontoworkplane.png",
            "start": 3610,
            "end": 3770
        }, {
            "filename": "/res/icons/graphics-window/other-supp.png",
            "start": 3770,
            "end": 4005
        }, {
            "filename": "/res/icons/graphics-window/parallel.png",
            "start": 4005,
            "end": 4170
        }, {
            "filename": "/res/icons/graphics-window/perpendicular.png",
            "start": 4170,
            "end": 4384
        }, {
            "filename": "/res/icons/graphics-window/pointonx.png",
            "start": 4384,
            "end": 4651
        }, {
            "filename": "/res/icons/graphics-window/point.png",
            "start": 4651,
            "end": 4783
        }, {
            "filename": "/res/icons/graphics-window/rectangle.png",
            "start": 4783,
            "end": 4942
        }, {
            "filename": "/res/icons/graphics-window/ref.png",
            "start": 4942,
            "end": 5120
        }, {
            "filename": "/res/icons/graphics-window/revolve.png",
            "start": 5120,
            "end": 5384
        }, {
            "filename": "/res/icons/graphics-window/same-orientation.png",
            "start": 5384,
            "end": 5586
        }, {
            "filename": "/res/icons/graphics-window/sketch-in-3d.png",
            "start": 5586,
            "end": 5782
        }, {
            "filename": "/res/icons/graphics-window/sketch-in-plane.png",
            "start": 5782,
            "end": 5996
        }, {
            "filename": "/res/icons/graphics-window/step-rotate.png",
            "start": 5996,
            "end": 6203
        }, {
            "filename": "/res/icons/graphics-window/step-translate.png",
            "start": 6203,
            "end": 6374
        }, {
            "filename": "/res/icons/graphics-window/symmetric.png",
            "start": 6374,
            "end": 6523
        }, {
            "filename": "/res/icons/graphics-window/tangent-arc.png",
            "start": 6523,
            "end": 6755
        }, {
            "filename": "/res/icons/graphics-window/text.png",
            "start": 6755,
            "end": 6972
        }, {
            "filename": "/res/icons/graphics-window/trim.png",
            "start": 6972,
            "end": 7196
        }, {
            "filename": "/res/icons/graphics-window/vert.png",
            "start": 7196,
            "end": 7373
        }, {
            "filename": "/res/icons/text-window/constraint.png",
            "start": 7373,
            "end": 7572
        }, {
            "filename": "/res/icons/text-window/construction.png",
            "start": 7572,
            "end": 7775
        }, {
            "filename": "/res/icons/text-window/edges.png",
            "start": 7775,
            "end": 8060
        }, {
            "filename": "/res/icons/text-window/faces.png",
            "start": 8060,
            "end": 8412
        }, {
            "filename": "/res/icons/text-window/occluded-visible.png",
            "start": 8412,
            "end": 8620
        }, {
            "filename": "/res/icons/text-window/occluded-stippled.png",
            "start": 8620,
            "end": 8838
        }, {
            "filename": "/res/icons/text-window/occluded-invisible.png",
            "start": 8838,
            "end": 9034
        }, {
            "filename": "/res/icons/text-window/mesh.png",
            "start": 9034,
            "end": 9369
        }, {
            "filename": "/res/icons/text-window/normal.png",
            "start": 9369,
            "end": 9546
        }, {
            "filename": "/res/icons/text-window/outlines.png",
            "start": 9546,
            "end": 9835
        }, {
            "filename": "/res/icons/text-window/point.png",
            "start": 9835,
            "end": 9967
        }, {
            "filename": "/res/icons/text-window/shaded.png",
            "start": 9967,
            "end": 10370
        }, {
            "filename": "/res/icons/text-window/workplane.png",
            "start": 10370,
            "end": 10563
        }, {
            "filename": "/res/locales.txt",
            "start": 10563,
            "end": 10941
        }, {
            "filename": "/res/locales/cs_CZ.po",
            "start": 10941,
            "end": 69748
        }, {
            "filename": "/res/locales/de_DE.po",
            "start": 69748,
            "end": 132717
        }, {
            "filename": "/res/locales/en_US.po",
            "start": 132717,
            "end": 189185
        }, {
            "filename": "/res/locales/fr_FR.po",
            "start": 189185,
            "end": 247418
        }, {
            "filename": "/res/locales/uk_UA.po",
            "start": 247418,
            "end": 302738
        }, {
            "filename": "/res/locales/es_AR.po",
            "start": 302738,
            "end": 361841
        }, {
            "filename": "/res/locales/tr_TR.po",
            "start": 361841,
            "end": 422892
        }, {
            "filename": "/res/locales/ru_RU.po",
            "start": 422892,
            "end": 505715
        }, {
            "filename": "/res/locales/zh_CN.po",
            "start": 505715,
            "end": 554458
        }, {
            "filename": "/res/locales/ja_JP.po",
            "start": 554458,
            "end": 615099
        }, {
            "filename": "/res/fonts/unifont.hex.gz",
            "start": 615099,
            "end": 1574258
        }, {
            "filename": "/res/fonts/private/0-check-false.png",
            "start": 1574258,
            "end": 1574476
        }, {
            "filename": "/res/fonts/private/1-check-true.png",
            "start": 1574476,
            "end": 1574719
        }, {
            "filename": "/res/fonts/private/2-radio-false.png",
            "start": 1574719,
            "end": 1574947
        }, {
            "filename": "/res/fonts/private/3-radio-true.png",
            "start": 1574947,
            "end": 1575178
        }, {
            "filename": "/res/fonts/private/4-stipple-dot.png",
            "start": 1575178,
            "end": 1576114
        }, {
            "filename": "/res/fonts/private/5-stipple-dash-long.png",
            "start": 1576114,
            "end": 1577046
        }, {
            "filename": "/res/fonts/private/6-stipple-dash.png",
            "start": 1577046,
            "end": 1577978
        }, {
            "filename": "/res/fonts/private/7-stipple-zigzag.png",
            "start": 1577978,
            "end": 1578928
        }, {
            "filename": "/res/fonts/unicode.lff.gz",
            "start": 1578928,
            "end": 2061487
        }, {
            "filename": "/res/fonts/BitstreamVeraSans-Roman-builtin.ttf",
            "start": 2061487,
            "end": 2116011
        }, {
            "filename": "/res/shaders/imesh.frag",
            "start": 2116011,
            "end": 2116400
        }, {
            "filename": "/res/shaders/imesh.vert",
            "start": 2116400,
            "end": 2116776
        }, {
            "filename": "/res/shaders/imesh_point.frag",
            "start": 2116776,
            "end": 2117157
        }, {
            "filename": "/res/shaders/imesh_point.vert",
            "start": 2117157,
            "end": 2118192
        }, {
            "filename": "/res/shaders/imesh_tex.frag",
            "start": 2118192,
            "end": 2118631
        }, {
            "filename": "/res/shaders/imesh_texa.frag",
            "start": 2118631,
            "end": 2119034
        }, {
            "filename": "/res/shaders/imesh_tex.vert",
            "start": 2119034,
            "end": 2119472
        }, {
            "filename": "/res/shaders/mesh.frag",
            "start": 2119472,
            "end": 2120270
        }, {
            "filename": "/res/shaders/mesh.vert",
            "start": 2120270,
            "end": 2120801
        }, {
            "filename": "/res/shaders/mesh_fill.frag",
            "start": 2120801,
            "end": 2121190
        }, {
            "filename": "/res/shaders/mesh_fill.vert",
            "start": 2121190,
            "end": 2121557
        }, {
            "filename": "/res/shaders/edge.frag",
            "start": 2121557,
            "end": 2122594
        }, {
            "filename": "/res/shaders/edge.vert",
            "start": 2122594,
            "end": 2123840
        }, {
            "filename": "/res/shaders/outline.vert",
            "start": 2123840,
            "end": 2125795
        }, {
            "filename": "/res/threejs/three-r111.min.js.gz",
            "start": 2125795,
            "end": 2275916
        }, {
            "filename": "/res/threejs/hammer-2.0.8.js.gz",
            "start": 2275916,
            "end": 2293419
        }, {
            "filename": "/res/threejs/SolveSpaceControls.js",
            "start": 2293419,
            "end": 2312484
        }],
        "remote_package_size": 2312484
    })
})();
if (Module["ENVIRONMENT_IS_PTHREAD"]) Module["preRun"] = [];
var necessaryPreJSTasks = Module["preRun"].slice();
if (!Module["preRun"]) throw "Module.preRun should exist because file support used it; did a pre-js delete it?";
necessaryPreJSTasks.forEach(function(task) {
    if (Module["preRun"].indexOf(task) < 0) throw "All preRun tasks that exist before user pre-js code should remain after; did you replace Module or modify Module.preRun?"
});
var moduleOverrides = Object.assign({}, Module);
var arguments_ = [];
var thisProgram = "./this.program";
var quit_ = (status, toThrow) => {
    throw toThrow
};
var ENVIRONMENT_IS_WEB = typeof window == "object";
var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (Module["ENVIRONMENT"]) {
    throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)")
}
var scriptDirectory = "";

function locateFile(path) {
    if (Module["locateFile"]) {
        return Module["locateFile"](path, scriptDirectory)
    }
    return scriptDirectory + path
}
var read_, readAsync, readBinary, setWindowTitle;

function logExceptionOnExit(e) {
    if (e instanceof ExitStatus) return;
    let toLog = e;
    if (e && typeof e == "object" && e.stack) {
        toLog = [e, e.stack]
    }
    err("exiting due to exception: " + toLog)
}
var fs;
var nodePath;
var requireNodeFS;
if (ENVIRONMENT_IS_NODE) {
    if (!(typeof process == "object" && typeof require == "function")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
    if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = require("path").dirname(scriptDirectory) + "/"
    } else {
        scriptDirectory = __dirname + "/"
    }
    requireNodeFS = () => {
        if (!nodePath) {
            fs = require("fs");
            nodePath = require("path")
        }
    };
    read_ = function shell_read(filename, binary) {
        requireNodeFS();
        filename = nodePath["normalize"](filename);
        return fs.readFileSync(filename, binary ? undefined : "utf8")
    };
    readBinary = filename => {
        var ret = read_(filename, true);
        if (!ret.buffer) {
            ret = new Uint8Array(ret)
        }
        assert(ret.buffer);
        return ret
    };
    readAsync = (filename, onload, onerror) => {
        requireNodeFS();
        filename = nodePath["normalize"](filename);
        fs.readFile(filename, function(err, data) {
            if (err) onerror(err);
            else onload(data.buffer)
        })
    };
    if (process["argv"].length > 1) {
        thisProgram = process["argv"][1].replace(/\\/g, "/")
    }
    arguments_ = process["argv"].slice(2);
    if (typeof module != "undefined") {
        module["exports"] = Module
    }
    process["on"]("uncaughtException", function(ex) {
        if (!(ex instanceof ExitStatus)) {
            throw ex
        }
    });
    process["on"]("unhandledRejection", function(reason) {
        throw reason
    });
    quit_ = (status, toThrow) => {
        if (keepRuntimeAlive()) {
            process["exitCode"] = status;
            throw toThrow
        }
        logExceptionOnExit(toThrow);
        process["exit"](status)
    };
    Module["inspect"] = function() {
        return "[Emscripten Module object]"
    }
} else if (ENVIRONMENT_IS_SHELL) {
    if (typeof process == "object" && typeof require === "function" || typeof window == "object" || typeof importScripts == "function") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
    if (typeof read != "undefined") {
        read_ = function shell_read(f) {
            return read(f)
        }
    }
    readBinary = function readBinary(f) {
        let data;
        if (typeof readbuffer == "function") {
            return new Uint8Array(readbuffer(f))
        }
        data = read(f, "binary");
        assert(typeof data == "object");
        return data
    };
    readAsync = function readAsync(f, onload, onerror) {
        setTimeout(() => onload(readBinary(f)), 0)
    };
    if (typeof scriptArgs != "undefined") {
        arguments_ = scriptArgs
    } else if (typeof arguments != "undefined") {
        arguments_ = arguments
    }
    if (typeof quit == "function") {
        quit_ = (status, toThrow) => {
            logExceptionOnExit(toThrow);
            quit(status)
        }
    }
    if (typeof print != "undefined") {
        if (typeof console == "undefined") console = {};
        console.log = print;
        console.warn = console.error = typeof printErr != "undefined" ? printErr : print
    }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href
    } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src
    }
    if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1)
    } else {
        scriptDirectory = ""
    }
    if (!(typeof window == "object" || typeof importScripts == "function")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)"); {
        read_ = url => {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText
        };
        if (ENVIRONMENT_IS_WORKER) {
            readBinary = url => {
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                xhr.responseType = "arraybuffer";
                xhr.send(null);
                return new Uint8Array(xhr.response)
            }
        }
        readAsync = (url, onload, onerror) => {
            var xhr = new XMLHttpRequest;
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = () => {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    onload(xhr.response);
                    return
                }
                onerror()
            };
            xhr.onerror = onerror;
            xhr.send(null)
        }
    }
    setWindowTitle = title => document.title = title
} else {
    throw new Error("environment detection error")
}
var out = Module["print"] || console.log.bind(console);
var err = Module["printErr"] || console.warn.bind(console);
Object.assign(Module, moduleOverrides);
moduleOverrides = null;
checkIncomingModuleAPI();
if (Module["arguments"]) arguments_ = Module["arguments"];
legacyModuleProp("arguments", "arguments_");
if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
legacyModuleProp("thisProgram", "thisProgram");
if (Module["quit"]) quit_ = Module["quit"];
legacyModuleProp("quit", "quit_");
assert(typeof Module["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
assert(typeof Module["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");
assert(typeof Module["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");
assert(typeof Module["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");
assert(typeof Module["read"] == "undefined", "Module.read option was removed (modify read_ in JS)");
assert(typeof Module["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
assert(typeof Module["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");
assert(typeof Module["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify setWindowTitle in JS)");
assert(typeof Module["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");
legacyModuleProp("read", "read_");
legacyModuleProp("readAsync", "readAsync");
legacyModuleProp("readBinary", "readBinary");
legacyModuleProp("setWindowTitle", "setWindowTitle");
assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");
var POINTER_SIZE = 4;

function legacyModuleProp(prop, newName) {
    if (!Object.getOwnPropertyDescriptor(Module, prop)) {
        Object.defineProperty(Module, prop, {
            configurable: true,
            get: function() {
                abort("Module." + prop + " has been replaced with plain " + newName + " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)")
            }
        })
    }
}

function ignoredModuleProp(prop) {
    if (Object.getOwnPropertyDescriptor(Module, prop)) {
        abort("`Module." + prop + "` was supplied but `" + prop + "` not included in INCOMING_MODULE_JS_API")
    }
}

function isExportedByForceFilesystem(name) {
    return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency"
}

function missingLibrarySymbol(sym) {
    if (typeof globalThis !== "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
        Object.defineProperty(globalThis, sym, {
            configurable: true,
            get: function() {
                var msg = "`" + sym + "` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line";
                if (isExportedByForceFilesystem(sym)) {
                    msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you"
                }
                warnOnce(msg);
                return undefined
            }
        })
    }
}

function unexportedRuntimeSymbol(sym) {
    if (!Object.getOwnPropertyDescriptor(Module, sym)) {
        Object.defineProperty(Module, sym, {
            configurable: true,
            get: function() {
                var msg = "'" + sym + "' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)";
                if (isExportedByForceFilesystem(sym)) {
                    msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you"
                }
                abort(msg)
            }
        })
    }
}
var tempRet0 = 0;
var setTempRet0 = value => {
    tempRet0 = value
};
var getTempRet0 = () => tempRet0;
var wasmBinary;
if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
legacyModuleProp("wasmBinary", "wasmBinary");
var noExitRuntime = Module["noExitRuntime"] || true;
legacyModuleProp("noExitRuntime", "noExitRuntime");
if (typeof WebAssembly != "object") {
    abort("no native wasm support detected")
}
var wasmMemory;
var ABORT = false;
var EXITSTATUS;

function assert(condition, text) {
    if (!condition) {
        abort("Assertion failed" + (text ? ": " + text : ""))
    }
}
var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
    var endIdx = idx + maxBytesToRead;
    var endPtr = idx;
    while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
    if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr))
    }
    var str = "";
    while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
            str += String.fromCharCode(u0);
            continue
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
            str += String.fromCharCode((u0 & 31) << 6 | u1);
            continue
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
            u0 = (u0 & 15) << 12 | u1 << 6 | u2
        } else {
            if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte 0x" + u0.toString(16) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
            u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63
        }
        if (u0 < 65536) {
            str += String.fromCharCode(u0)
        } else {
            var ch = u0 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
        }
    }
    return str
}

function UTF8ToString(ptr, maxBytesToRead) {
    return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : ""
}

function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
            var u1 = str.charCodeAt(++i);
            u = 65536 + ((u & 1023) << 10) | u1 & 1023
        }
        if (u <= 127) {
            if (outIdx >= endIdx) break;
            heap[outIdx++] = u
        } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx) break;
            heap[outIdx++] = 192 | u >> 6;
            heap[outIdx++] = 128 | u & 63
        } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx) break;
            heap[outIdx++] = 224 | u >> 12;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63
        } else {
            if (outIdx + 3 >= endIdx) break;
            if (u > 1114111) warnOnce("Invalid Unicode code point 0x" + u.toString(16) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
            heap[outIdx++] = 240 | u >> 18;
            heap[outIdx++] = 128 | u >> 12 & 63;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63
        }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
    assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}

function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
            len++
        } else if (c <= 2047) {
            len += 2
        } else if (c >= 55296 && c <= 57343) {
            len += 4;
            ++i
        } else {
            len += 3
        }
    }
    return len
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferAndViews(buf) {
    buffer = buf;
    Module["HEAP8"] = HEAP8 = new Int8Array(buf);
    Module["HEAP16"] = HEAP16 = new Int16Array(buf);
    Module["HEAP32"] = HEAP32 = new Int32Array(buf);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(buf)
}
var TOTAL_STACK = 33554432;
if (Module["TOTAL_STACK"]) assert(TOTAL_STACK === Module["TOTAL_STACK"], "the stack size can no longer be determined at runtime");
var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 134217728;
legacyModuleProp("INITIAL_MEMORY", "INITIAL_MEMORY");
assert(INITIAL_MEMORY >= TOTAL_STACK, "INITIAL_MEMORY should be larger than TOTAL_STACK, was " + INITIAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
assert(typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != undefined && Int32Array.prototype.set != undefined, "JS engine does not provide full typed array support");
assert(!Module["wasmMemory"], "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");
assert(INITIAL_MEMORY == 134217728, "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");
var wasmTable;

function writeStackCookie() {
    var max = _emscripten_stack_get_end();
    assert((max & 3) == 0);
    HEAP32[max >> 2] = 34821223;
    HEAP32[max + 4 >> 2] = 2310721022;
    HEAPU32[0] = 1668509029
}

function checkStackCookie() {
    if (ABORT) return;
    var max = _emscripten_stack_get_end();
    var cookie1 = HEAPU32[max >> 2];
    var cookie2 = HEAPU32[max + 4 >> 2];
    if (cookie1 != 34821223 || cookie2 != 2310721022) {
        abort("Stack overflow! Stack cookie has been overwritten at 0x" + max.toString(16) + ", expected hex dwords 0x89BACDFE and 0x2135467, but received 0x" + cookie2.toString(16) + " 0x" + cookie1.toString(16))
    }
    if (HEAPU32[0] !== 1668509029) abort("Runtime error: The application has corrupted its heap memory area (address zero)!")
}(function() {
    var h16 = new Int16Array(1);
    var h8 = new Int8Array(h16.buffer);
    h16[0] = 25459;
    if (h8[0] !== 115 || h8[1] !== 99) throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)"
})();
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;

function keepRuntimeAlive() {
    return noExitRuntime
}

function preRun() {
    if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
            addOnPreRun(Module["preRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPRERUN__)
}

function initRuntime() {
    assert(!runtimeInitialized);
    runtimeInitialized = true;
    checkStackCookie();
    if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
    FS.ignorePermissions = false;
    TTY.init();
    callRuntimeCallbacks(__ATINIT__)
}

function preMain() {
    checkStackCookie();
    callRuntimeCallbacks(__ATMAIN__)
}

function postRun() {
    checkStackCookie();
    if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
            addOnPostRun(Module["postRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPOSTRUN__)
}

function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb)
}

function addOnInit(cb) {
    __ATINIT__.unshift(cb)
}

function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb)
}
assert(Math.imul, "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
assert(Math.fround, "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
assert(Math.clz32, "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
assert(Math.trunc, "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
var runDependencyTracking = {};

function getUniqueRunDependency(id) {
    var orig = id;
    while (1) {
        if (!runDependencyTracking[id]) return id;
        id = orig + Math.random()
    }
}

function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
    if (id) {
        assert(!runDependencyTracking[id]);
        runDependencyTracking[id] = 1;
        if (runDependencyWatcher === null && typeof setInterval != "undefined") {
            runDependencyWatcher = setInterval(function() {
                if (ABORT) {
                    clearInterval(runDependencyWatcher);
                    runDependencyWatcher = null;
                    return
                }
                var shown = false;
                for (var dep in runDependencyTracking) {
                    if (!shown) {
                        shown = true;
                        err("still waiting on run dependencies:")
                    }
                    err("dependency: " + dep)
                }
                if (shown) {
                    err("(end of list)")
                }
            }, 1e4)
        }
    } else {
        err("warning: run dependency added without ID")
    }
}

function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
    if (id) {
        assert(runDependencyTracking[id]);
        delete runDependencyTracking[id]
    } else {
        err("warning: run dependency removed without ID")
    }
    if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null
        }
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback()
        }
    }
}

function abort(what) {
    {
        if (Module["onAbort"]) {
            Module["onAbort"](what)
        }
    }
    what = "Aborted(" + what + ")";
    err(what);
    ABORT = true;
    EXITSTATUS = 1;
    var e = new WebAssembly.RuntimeError(what);
    throw e
}
var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
    return filename.startsWith(dataURIPrefix)
}

function isFileURI(filename) {
    return filename.startsWith("file://")
}

function createExportWrapper(name, fixedasm) {
    return function() {
        var displayName = name;
        var asm = fixedasm;
        if (!fixedasm) {
            asm = Module["asm"]
        }
        assert(runtimeInitialized, "native function `" + displayName + "` called before runtime initialization");
        if (!asm[name]) {
            assert(asm[name], "exported native function `" + displayName + "` not found")
        }
        return asm[name].apply(null, arguments)
    }
}
var wasmBinaryFile;
wasmBinaryFile = "solvespace.wasm";
if (!isDataURI(wasmBinaryFile)) {
    wasmBinaryFile = locateFile(wasmBinaryFile)
}

function getBinary(file) {
    try {
        if (file == wasmBinaryFile && wasmBinary) {
            return new Uint8Array(wasmBinary)
        }
        if (readBinary) {
            return readBinary(file)
        }
        throw "both async and sync fetching of the wasm failed"
    } catch (err) {
        abort(err)
    }
}

function getBinaryPromise() {
    if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch == "function" && !isFileURI(wasmBinaryFile)) {
            return fetch(wasmBinaryFile, {
                credentials: "same-origin"
            }).then(function(response) {
                if (!response["ok"]) {
                    throw "failed to load wasm binary file at '" + wasmBinaryFile + "'"
                }
                return response["arrayBuffer"]()
            }).catch(function() {
                return getBinary(wasmBinaryFile)
            })
        } else {
            if (readAsync) {
                return new Promise(function(resolve, reject) {
                    readAsync(wasmBinaryFile, function(response) {
                        resolve(new Uint8Array(response))
                    }, reject)
                })
            }
        }
    }
    return Promise.resolve().then(function() {
        return getBinary(wasmBinaryFile)
    })
}

function createWasm() {
    var info = {
        "env": asmLibraryArg,
        "wasi_snapshot_preview1": asmLibraryArg
    };

    function receiveInstance(instance, module) {
        var exports = instance.exports;
        exports = Asyncify.instrumentWasmExports(exports);
        Module["asm"] = exports;
        wasmMemory = Module["asm"]["memory"];
        assert(wasmMemory, "memory not found in wasm exports");
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module["asm"]["__indirect_function_table"];
        assert(wasmTable, "table not found in wasm exports");
        addOnInit(Module["asm"]["__wasm_call_ctors"]);
        removeRunDependency("wasm-instantiate")
    }
    addRunDependency("wasm-instantiate");
    var trueModule = Module;

    function receiveInstantiationResult(result) {
        assert(Module === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
        trueModule = null;
        receiveInstance(result["instance"])
    }

    function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
            return WebAssembly.instantiate(binary, info)
        }).then(function(instance) {
            return instance
        }).then(receiver, function(reason) {
            err("failed to asynchronously prepare wasm: " + reason);
            if (isFileURI(wasmBinaryFile)) {
                err("warning: Loading from a file URI (" + wasmBinaryFile + ") is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing")
            }
            abort(reason)
        })
    }

    function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
            return fetch(wasmBinaryFile, {
                credentials: "same-origin"
            }).then(function(response) {
                var result = WebAssembly.instantiateStreaming(response, info);
                return result.then(receiveInstantiationResult, function(reason) {
                    err("wasm streaming compile failed: " + reason);
                    err("falling back to ArrayBuffer instantiation");
                    return instantiateArrayBuffer(receiveInstantiationResult)
                })
            })
        } else {
            return instantiateArrayBuffer(receiveInstantiationResult)
        }
    }
    if (Module["instantiateWasm"]) {
        try {
            var exports = Module["instantiateWasm"](info, receiveInstance);
            exports = Asyncify.instrumentWasmExports(exports);
            return exports
        } catch (e) {
            err("Module.instantiateWasm callback failed with error: " + e);
            return false
        }
    }
    instantiateAsync();
    return {}
}
var tempDouble;
var tempI64;
var ASM_CONSTS = {
    777896: $0 => {
        $Wrap$ret = UTF8ToString($0)
    },
    777925: ($0, $1) => {
        $Wrap$ret = Module.dynCall_vi.bind(null, $0, $1)
    },
    777974: () => {
        return allocate($Wrap$input, ALLOC_NORMAL)
    }
};

function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status
}

function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
        callbacks.shift()(Module)
    }
}

function withStackSave(f) {
    var stack = stackSave();
    var ret = f();
    stackRestore(stack);
    return ret
}

function demangle(func) {
    warnOnce("warning: build with -sDEMANGLE_SUPPORT to link in libcxxabi demangling");
    return func
}

function demangleAll(text) {
    var regex = /\b_Z[\w\d_]+/g;
    return text.replace(regex, function(x) {
        var y = demangle(x);
        return x === y ? x : y + " [" + x + "]"
    })
}

function dynCallLegacy(sig, ptr, args) {
    assert("dynCall_" + sig in Module, "bad function pointer type - no table for sig '" + sig + "'");
    if (args && args.length) {
        assert(args.length === sig.substring(1).replace(/j/g, "--").length)
    } else {
        assert(sig.length == 1)
    }
    var f = Module["dynCall_" + sig];
    return args && args.length ? f.apply(null, [ptr].concat(args)) : f.call(null, ptr)
}
var wasmTableMirror = [];

function getWasmTableEntry(funcPtr) {
    var func = wasmTableMirror[funcPtr];
    if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr)
    }
    assert(wasmTable.get(funcPtr) == func, "JavaScript-side Wasm function table mirror is out of date!");
    return func
}

function handleException(e) {
    if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS
    }
    quit_(1, e)
}

function jsStackTrace() {
    var error = new Error;
    if (!error.stack) {
        try {
            throw new Error
        } catch (e) {
            error = e
        }
        if (!error.stack) {
            return "(no stack trace available)"
        }
    }
    return error.stack.toString()
}

function warnOnce(text) {
    if (!warnOnce.shown) warnOnce.shown = {};
    if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
        err(text)
    }
}

function writeArrayToMemory(array, buffer) {
    assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
    HEAP8.set(array, buffer)
}

function ___cxa_allocate_exception(size) {
    return _malloc(size + 24) + 24
}

function ExceptionInfo(excPtr) {
    this.excPtr = excPtr;
    this.ptr = excPtr - 24;
    this.set_type = function(type) {
        HEAPU32[this.ptr + 4 >> 2] = type
    };
    this.get_type = function() {
        return HEAPU32[this.ptr + 4 >> 2]
    };
    this.set_destructor = function(destructor) {
        HEAPU32[this.ptr + 8 >> 2] = destructor
    };
    this.get_destructor = function() {
        return HEAPU32[this.ptr + 8 >> 2]
    };
    this.set_refcount = function(refcount) {
        HEAP32[this.ptr >> 2] = refcount
    };
    this.set_caught = function(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12 >> 0] = caught
    };
    this.get_caught = function() {
        return HEAP8[this.ptr + 12 >> 0] != 0
    };
    this.set_rethrown = function(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13 >> 0] = rethrown
    };
    this.get_rethrown = function() {
        return HEAP8[this.ptr + 13 >> 0] != 0
    };
    this.init = function(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
        this.set_refcount(0);
        this.set_caught(false);
        this.set_rethrown(false)
    };
    this.add_ref = function() {
        var value = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = value + 1
    };
    this.release_ref = function() {
        var prev = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = prev - 1;
        assert(prev > 0);
        return prev === 1
    };
    this.set_adjusted_ptr = function(adjustedPtr) {
        HEAPU32[this.ptr + 16 >> 2] = adjustedPtr
    };
    this.get_adjusted_ptr = function() {
        return HEAPU32[this.ptr + 16 >> 2]
    };
    this.get_exception_ptr = function() {
        var isPointer = ___cxa_is_pointer_type(this.get_type());
        if (isPointer) {
            return HEAPU32[this.excPtr >> 2]
        }
        var adjusted = this.get_adjusted_ptr();
        if (adjusted !== 0) return adjusted;
        return this.excPtr
    }
}
var exceptionLast = 0;
var uncaughtExceptionCount = 0;

function ___cxa_throw(ptr, type, destructor) {
    var info = new ExceptionInfo(ptr);
    info.init(type, destructor);
    exceptionLast = ptr;
    uncaughtExceptionCount++;
    throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch."
}

function setErrNo(value) {
    HEAP32[___errno_location() >> 2] = value;
    return value
}
var PATH = {
    isAbs: path => path.charAt(0) === "/",
    splitPath: filename => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1)
    },
    normalizeArray: (parts, allowAboveRoot) => {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === ".") {
                parts.splice(i, 1)
            } else if (last === "..") {
                parts.splice(i, 1);
                up++
            } else if (up) {
                parts.splice(i, 1);
                up--
            }
        }
        if (allowAboveRoot) {
            for (; up; up--) {
                parts.unshift("..")
            }
        }
        return parts
    },
    normalize: path => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.substr(-1) === "/";
        path = PATH.normalizeArray(path.split("/").filter(p => !!p), !isAbsolute).join("/");
        if (!path && !isAbsolute) {
            path = "."
        }
        if (path && trailingSlash) {
            path += "/"
        }
        return (isAbsolute ? "/" : "") + path
    },
    dirname: path => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
            return "."
        }
        if (dir) {
            dir = dir.substr(0, dir.length - 1)
        }
        return root + dir
    },
    basename: path => {
        if (path === "/") return "/";
        path = PATH.normalize(path);
        path = path.replace(/\/$/, "");
        var lastSlash = path.lastIndexOf("/");
        if (lastSlash === -1) return path;
        return path.substr(lastSlash + 1)
    },
    join: function() {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join("/"))
    },
    join2: (l, r) => {
        return PATH.normalize(l + "/" + r)
    }
};

function getRandomDevice() {
    if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
        var randomBuffer = new Uint8Array(1);
        return () => {
            crypto.getRandomValues(randomBuffer);
            return randomBuffer[0]
        }
    } else if (ENVIRONMENT_IS_NODE) {
        try {
            var crypto_module = require("crypto");
            return () => crypto_module["randomBytes"](1)[0]
        } catch (e) {}
    }
    return () => abort("no cryptographic support found for randomDevice. consider polyfilling it if you want to use something insecure like Math.random(), e.g. put this in a --pre-js: var crypto = { getRandomValues: function(array) { for (var i = 0; i < array.length; i++) array[i] = (Math.random()*256)|0 } };")
}
var PATH_FS = {
    resolve: function() {
        var resolvedPath = "",
            resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
            var path = i >= 0 ? arguments[i] : FS.cwd();
            if (typeof path != "string") {
                throw new TypeError("Arguments to path.resolve must be strings")
            } else if (!path) {
                return ""
            }
            resolvedPath = path + "/" + resolvedPath;
            resolvedAbsolute = PATH.isAbs(path)
        }
        resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(p => !!p), !resolvedAbsolute).join("/");
        return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
    },
    relative: (from, to) => {
        from = PATH_FS.resolve(from).substr(1);
        to = PATH_FS.resolve(to).substr(1);

        function trim(arr) {
            var start = 0;
            for (; start < arr.length; start++) {
                if (arr[start] !== "") break
            }
            var end = arr.length - 1;
            for (; end >= 0; end--) {
                if (arr[end] !== "") break
            }
            if (start > end) return [];
            return arr.slice(start, end - start + 1)
        }
        var fromParts = trim(from.split("/"));
        var toParts = trim(to.split("/"));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
            if (fromParts[i] !== toParts[i]) {
                samePartsLength = i;
                break
            }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
            outputParts.push("..")
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join("/")
    }
};

function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array
}
var TTY = {
    ttys: [],
    init: function() {},
    shutdown: function() {},
    register: function(dev, ops) {
        TTY.ttys[dev] = {
            input: [],
            output: [],
            ops: ops
        };
        FS.registerDevice(dev, TTY.stream_ops)
    },
    stream_ops: {
        open: function(stream) {
            var tty = TTY.ttys[stream.node.rdev];
            if (!tty) {
                throw new FS.ErrnoError(43)
            }
            stream.tty = tty;
            stream.seekable = false
        },
        close: function(stream) {
            stream.tty.ops.flush(stream.tty)
        },
        flush: function(stream) {
            stream.tty.ops.flush(stream.tty)
        },
        read: function(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.get_char) {
                throw new FS.ErrnoError(60)
            }
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
                var result;
                try {
                    result = stream.tty.ops.get_char(stream.tty)
                } catch (e) {
                    throw new FS.ErrnoError(29)
                }
                if (result === undefined && bytesRead === 0) {
                    throw new FS.ErrnoError(6)
                }
                if (result === null || result === undefined) break;
                bytesRead++;
                buffer[offset + i] = result
            }
            if (bytesRead) {
                stream.node.timestamp = Date.now()
            }
            return bytesRead
        },
        write: function(stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.put_char) {
                throw new FS.ErrnoError(60)
            }
            try {
                for (var i = 0; i < length; i++) {
                    stream.tty.ops.put_char(stream.tty, buffer[offset + i])
                }
            } catch (e) {
                throw new FS.ErrnoError(29)
            }
            if (length) {
                stream.node.timestamp = Date.now()
            }
            return i
        }
    },
    default_tty_ops: {
        get_char: function(tty) {
            if (!tty.input.length) {
                var result = null;
                if (ENVIRONMENT_IS_NODE) {
                    var BUFSIZE = 256;
                    var buf = Buffer.alloc(BUFSIZE);
                    var bytesRead = 0;
                    try {
                        bytesRead = fs.readSync(process.stdin.fd, buf, 0, BUFSIZE, -1)
                    } catch (e) {
                        if (e.toString().includes("EOF")) bytesRead = 0;
                        else throw e
                    }
                    if (bytesRead > 0) {
                        result = buf.slice(0, bytesRead).toString("utf-8")
                    } else {
                        result = null
                    }
                } else if (typeof window != "undefined" && typeof window.prompt == "function") {
                    result = window.prompt("Input: ");
                    if (result !== null) {
                        result += "\n"
                    }
                } else if (typeof readline == "function") {
                    result = readline();
                    if (result !== null) {
                        result += "\n"
                    }
                }
                if (!result) {
                    return null
                }
                tty.input = intArrayFromString(result, true)
            }
            return tty.input.shift()
        },
        put_char: function(tty, val) {
            if (val === null || val === 10) {
                out(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0) tty.output.push(val)
            }
        },
        flush: function(tty) {
            if (tty.output && tty.output.length > 0) {
                out(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        }
    },
    default_tty1_ops: {
        put_char: function(tty, val) {
            if (val === null || val === 10) {
                err(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0) tty.output.push(val)
            }
        },
        flush: function(tty) {
            if (tty.output && tty.output.length > 0) {
                err(UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        }
    }
};

function mmapAlloc(size) {
    abort("internal error: mmapAlloc called but `emscripten_builtin_memalign` native symbol not exported")
}
var MEMFS = {
    ops_table: null,
    mount: function(mount) {
        return MEMFS.createNode(null, "/", 16384 | 511, 0)
    },
    createNode: function(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
            throw new FS.ErrnoError(63)
        }
        if (!MEMFS.ops_table) {
            MEMFS.ops_table = {
                dir: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        lookup: MEMFS.node_ops.lookup,
                        mknod: MEMFS.node_ops.mknod,
                        rename: MEMFS.node_ops.rename,
                        unlink: MEMFS.node_ops.unlink,
                        rmdir: MEMFS.node_ops.rmdir,
                        readdir: MEMFS.node_ops.readdir,
                        symlink: MEMFS.node_ops.symlink
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek
                    }
                },
                file: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: {
                        llseek: MEMFS.stream_ops.llseek,
                        read: MEMFS.stream_ops.read,
                        write: MEMFS.stream_ops.write,
                        allocate: MEMFS.stream_ops.allocate,
                        mmap: MEMFS.stream_ops.mmap,
                        msync: MEMFS.stream_ops.msync
                    }
                },
                link: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        readlink: MEMFS.node_ops.readlink
                    },
                    stream: {}
                },
                chrdev: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr
                    },
                    stream: FS.chrdev_stream_ops
                }
            }
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
            node.node_ops = MEMFS.ops_table.dir.node;
            node.stream_ops = MEMFS.ops_table.dir.stream;
            node.contents = {}
        } else if (FS.isFile(node.mode)) {
            node.node_ops = MEMFS.ops_table.file.node;
            node.stream_ops = MEMFS.ops_table.file.stream;
            node.usedBytes = 0;
            node.contents = null
        } else if (FS.isLink(node.mode)) {
            node.node_ops = MEMFS.ops_table.link.node;
            node.stream_ops = MEMFS.ops_table.link.stream
        } else if (FS.isChrdev(node.mode)) {
            node.node_ops = MEMFS.ops_table.chrdev.node;
            node.stream_ops = MEMFS.ops_table.chrdev.stream
        }
        node.timestamp = Date.now();
        if (parent) {
            parent.contents[name] = node;
            parent.timestamp = node.timestamp
        }
        return node
    },
    getFileDataAsTypedArray: function(node) {
        if (!node.contents) return new Uint8Array(0);
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents)
    },
    expandFileStorage: function(node, newCapacity) {
        var prevCapacity = node.contents ? node.contents.length : 0;
        if (prevCapacity >= newCapacity) return;
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
        if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
        var oldContents = node.contents;
        node.contents = new Uint8Array(newCapacity);
        if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0)
    },
    resizeFileStorage: function(node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
            node.contents = null;
            node.usedBytes = 0
        } else {
            var oldContents = node.contents;
            node.contents = new Uint8Array(newSize);
            if (oldContents) {
                node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
            }
            node.usedBytes = newSize
        }
    },
    node_ops: {
        getattr: function(node) {
            var attr = {};
            attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
            attr.ino = node.id;
            attr.mode = node.mode;
            attr.nlink = 1;
            attr.uid = 0;
            attr.gid = 0;
            attr.rdev = node.rdev;
            if (FS.isDir(node.mode)) {
                attr.size = 4096
            } else if (FS.isFile(node.mode)) {
                attr.size = node.usedBytes
            } else if (FS.isLink(node.mode)) {
                attr.size = node.link.length
            } else {
                attr.size = 0
            }
            attr.atime = new Date(node.timestamp);
            attr.mtime = new Date(node.timestamp);
            attr.ctime = new Date(node.timestamp);
            attr.blksize = 4096;
            attr.blocks = Math.ceil(attr.size / attr.blksize);
            return attr
        },
        setattr: function(node, attr) {
            if (attr.mode !== undefined) {
                node.mode = attr.mode
            }
            if (attr.timestamp !== undefined) {
                node.timestamp = attr.timestamp
            }
            if (attr.size !== undefined) {
                MEMFS.resizeFileStorage(node, attr.size)
            }
        },
        lookup: function(parent, name) {
            throw FS.genericErrors[44]
        },
        mknod: function(parent, name, mode, dev) {
            return MEMFS.createNode(parent, name, mode, dev)
        },
        rename: function(old_node, new_dir, new_name) {
            if (FS.isDir(old_node.mode)) {
                var new_node;
                try {
                    new_node = FS.lookupNode(new_dir, new_name)
                } catch (e) {}
                if (new_node) {
                    for (var i in new_node.contents) {
                        throw new FS.ErrnoError(55)
                    }
                }
            }
            delete old_node.parent.contents[old_node.name];
            old_node.parent.timestamp = Date.now();
            old_node.name = new_name;
            new_dir.contents[new_name] = old_node;
            new_dir.timestamp = old_node.parent.timestamp;
            old_node.parent = new_dir
        },
        unlink: function(parent, name) {
            delete parent.contents[name];
            parent.timestamp = Date.now()
        },
        rmdir: function(parent, name) {
            var node = FS.lookupNode(parent, name);
            for (var i in node.contents) {
                throw new FS.ErrnoError(55)
            }
            delete parent.contents[name];
            parent.timestamp = Date.now()
        },
        readdir: function(node) {
            var entries = [".", ".."];
            for (var key in node.contents) {
                if (!node.contents.hasOwnProperty(key)) {
                    continue
                }
                entries.push(key)
            }
            return entries
        },
        symlink: function(parent, newname, oldpath) {
            var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
            node.link = oldpath;
            return node
        },
        readlink: function(node) {
            if (!FS.isLink(node.mode)) {
                throw new FS.ErrnoError(28)
            }
            return node.link
        }
    },
    stream_ops: {
        read: function(stream, buffer, offset, length, position) {
            var contents = stream.node.contents;
            if (position >= stream.node.usedBytes) return 0;
            var size = Math.min(stream.node.usedBytes - position, length);
            assert(size >= 0);
            if (size > 8 && contents.subarray) {
                buffer.set(contents.subarray(position, position + size), offset)
            } else {
                for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i]
            }
            return size
        },
        write: function(stream, buffer, offset, length, position, canOwn) {
            assert(!(buffer instanceof ArrayBuffer));
            if (buffer.buffer === HEAP8.buffer) {
                canOwn = false
            }
            if (!length) return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                if (canOwn) {
                    assert(position === 0, "canOwn must imply no weird position inside the file");
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (node.usedBytes === 0 && position === 0) {
                    node.contents = buffer.slice(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray) {
                node.contents.set(buffer.subarray(offset, offset + length), position)
            } else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        },
        llseek: function(stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    position += stream.node.usedBytes
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(28)
            }
            return position
        },
        allocate: function(stream, offset, length) {
            MEMFS.expandFileStorage(stream.node, offset + length);
            stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
        },
        mmap: function(stream, length, position, prot, flags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(43)
            }
            var ptr;
            var allocated;
            var contents = stream.node.contents;
            if (!(flags & 2) && contents.buffer === buffer) {
                allocated = false;
                ptr = contents.byteOffset
            } else {
                if (position > 0 || position + length < contents.length) {
                    if (contents.subarray) {
                        contents = contents.subarray(position, position + length)
                    } else {
                        contents = Array.prototype.slice.call(contents, position, position + length)
                    }
                }
                allocated = true;
                ptr = mmapAlloc(length);
                if (!ptr) {
                    throw new FS.ErrnoError(48)
                }
                HEAP8.set(contents, ptr)
            }
            return {
                ptr: ptr,
                allocated: allocated
            }
        },
        msync: function(stream, buffer, offset, length, mmapFlags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(43)
            }
            if (mmapFlags & 2) {
                return 0
            }
            var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
            return 0
        }
    }
};

function asyncLoad(url, onload, onerror, noRunDep) {
    var dep = !noRunDep ? getUniqueRunDependency("al " + url) : "";
    readAsync(url, arrayBuffer => {
        assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
        onload(new Uint8Array(arrayBuffer));
        if (dep) removeRunDependency(dep)
    }, event => {
        if (onerror) {
            onerror()
        } else {
            throw 'Loading data file "' + url + '" failed.'
        }
    });
    if (dep) addRunDependency(dep)
}
var ERRNO_MESSAGES = {
    0: "Success",
    1: "Arg list too long",
    2: "Permission denied",
    3: "Address already in use",
    4: "Address not available",
    5: "Address family not supported by protocol family",
    6: "No more processes",
    7: "Socket already connected",
    8: "Bad file number",
    9: "Trying to read unreadable message",
    10: "Mount device busy",
    11: "Operation canceled",
    12: "No children",
    13: "Connection aborted",
    14: "Connection refused",
    15: "Connection reset by peer",
    16: "File locking deadlock error",
    17: "Destination address required",
    18: "Math arg out of domain of func",
    19: "Quota exceeded",
    20: "File exists",
    21: "Bad address",
    22: "File too large",
    23: "Host is unreachable",
    24: "Identifier removed",
    25: "Illegal byte sequence",
    26: "Connection already in progress",
    27: "Interrupted system call",
    28: "Invalid argument",
    29: "I/O error",
    30: "Socket is already connected",
    31: "Is a directory",
    32: "Too many symbolic links",
    33: "Too many open files",
    34: "Too many links",
    35: "Message too long",
    36: "Multihop attempted",
    37: "File or path name too long",
    38: "Network interface is not configured",
    39: "Connection reset by network",
    40: "Network is unreachable",
    41: "Too many open files in system",
    42: "No buffer space available",
    43: "No such device",
    44: "No such file or directory",
    45: "Exec format error",
    46: "No record locks available",
    47: "The link has been severed",
    48: "Not enough core",
    49: "No message of desired type",
    50: "Protocol not available",
    51: "No space left on device",
    52: "Function not implemented",
    53: "Socket is not connected",
    54: "Not a directory",
    55: "Directory not empty",
    56: "State not recoverable",
    57: "Socket operation on non-socket",
    59: "Not a typewriter",
    60: "No such device or address",
    61: "Value too large for defined data type",
    62: "Previous owner died",
    63: "Not super-user",
    64: "Broken pipe",
    65: "Protocol error",
    66: "Unknown protocol",
    67: "Protocol wrong type for socket",
    68: "Math result not representable",
    69: "Read only file system",
    70: "Illegal seek",
    71: "No such process",
    72: "Stale file handle",
    73: "Connection timed out",
    74: "Text file busy",
    75: "Cross-device link",
    100: "Device not a stream",
    101: "Bad font file fmt",
    102: "Invalid slot",
    103: "Invalid request code",
    104: "No anode",
    105: "Block device required",
    106: "Channel number out of range",
    107: "Level 3 halted",
    108: "Level 3 reset",
    109: "Link number out of range",
    110: "Protocol driver not attached",
    111: "No CSI structure available",
    112: "Level 2 halted",
    113: "Invalid exchange",
    114: "Invalid request descriptor",
    115: "Exchange full",
    116: "No data (for no delay io)",
    117: "Timer expired",
    118: "Out of streams resources",
    119: "Machine is not on the network",
    120: "Package not installed",
    121: "The object is remote",
    122: "Advertise error",
    123: "Srmount error",
    124: "Communication error on send",
    125: "Cross mount point (not really error)",
    126: "Given log. name not unique",
    127: "f.d. invalid for this operation",
    128: "Remote address changed",
    129: "Can   access a needed shared lib",
    130: "Accessing a corrupted shared lib",
    131: ".lib section in a.out corrupted",
    132: "Attempting to link in too many libs",
    133: "Attempting to exec a shared library",
    135: "Streams pipe error",
    136: "Too many users",
    137: "Socket type not supported",
    138: "Not supported",
    139: "Protocol family not supported",
    140: "Can't send after socket shutdown",
    141: "Too many references",
    142: "Host is down",
    148: "No medium (in tape drive)",
    156: "Level 2 not synchronized"
};
var ERRNO_CODES = {};
var FS = {
    root: null,
    mounts: [],
    devices: {},
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    ErrnoError: null,
    genericErrors: {},
    filesystems: null,
    syncFSRequests: 0,
    lookupPath: (path, opts = {}) => {
        path = PATH_FS.resolve(FS.cwd(), path);
        if (!path) return {
            path: "",
            node: null
        };
        var defaults = {
            follow_mount: true,
            recurse_count: 0
        };
        opts = Object.assign(defaults, opts);
        if (opts.recurse_count > 8) {
            throw new FS.ErrnoError(32)
        }
        var parts = PATH.normalizeArray(path.split("/").filter(p => !!p), false);
        var current = FS.root;
        var current_path = "/";
        for (var i = 0; i < parts.length; i++) {
            var islast = i === parts.length - 1;
            if (islast && opts.parent) {
                break
            }
            current = FS.lookupNode(current, parts[i]);
            current_path = PATH.join2(current_path, parts[i]);
            if (FS.isMountpoint(current)) {
                if (!islast || islast && opts.follow_mount) {
                    current = current.mounted.root
                }
            }
            if (!islast || opts.follow) {
                var count = 0;
                while (FS.isLink(current.mode)) {
                    var link = FS.readlink(current_path);
                    current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
                    var lookup = FS.lookupPath(current_path, {
                        recurse_count: opts.recurse_count + 1
                    });
                    current = lookup.node;
                    if (count++ > 40) {
                        throw new FS.ErrnoError(32)
                    }
                }
            }
        }
        return {
            path: current_path,
            node: current
        }
    },
    getPath: node => {
        var path;
        while (true) {
            if (FS.isRoot(node)) {
                var mount = node.mount.mountpoint;
                if (!path) return mount;
                return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
            }
            path = path ? node.name + "/" + path : node.name;
            node = node.parent
        }
    },
    hashName: (parentid, name) => {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = (hash << 5) - hash + name.charCodeAt(i) | 0
        }
        return (parentid + hash >>> 0) % FS.nameTable.length
    },
    hashAddNode: node => {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node
    },
    hashRemoveNode: node => {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
            FS.nameTable[hash] = node.name_next
        } else {
            var current = FS.nameTable[hash];
            while (current) {
                if (current.name_next === node) {
                    current.name_next = node.name_next;
                    break
                }
                current = current.name_next
            }
        }
    },
    lookupNode: (parent, name) => {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
            throw new FS.ErrnoError(errCode, parent)
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
            var nodeName = node.name;
            if (node.parent.id === parent.id && nodeName === name) {
                return node
            }
        }
        return FS.lookup(parent, name)
    },
    createNode: (parent, name, mode, rdev) => {
        assert(typeof parent == "object");
        var node = new FS.FSNode(parent, name, mode, rdev);
        FS.hashAddNode(node);
        return node
    },
    destroyNode: node => {
        FS.hashRemoveNode(node)
    },
    isRoot: node => {
        return node === node.parent
    },
    isMountpoint: node => {
        return !!node.mounted
    },
    isFile: mode => {
        return (mode & 61440) === 32768
    },
    isDir: mode => {
        return (mode & 61440) === 16384
    },
    isLink: mode => {
        return (mode & 61440) === 40960
    },
    isChrdev: mode => {
        return (mode & 61440) === 8192
    },
    isBlkdev: mode => {
        return (mode & 61440) === 24576
    },
    isFIFO: mode => {
        return (mode & 61440) === 4096
    },
    isSocket: mode => {
        return (mode & 49152) === 49152
    },
    flagModes: {
        "r": 0,
        "r+": 2,
        "w": 577,
        "w+": 578,
        "a": 1089,
        "a+": 1090
    },
    modeStringToFlags: str => {
        var flags = FS.flagModes[str];
        if (typeof flags == "undefined") {
            throw new Error("Unknown file open mode: " + str)
        }
        return flags
    },
    flagsToPermissionString: flag => {
        var perms = ["r", "w", "rw"][flag & 3];
        if (flag & 512) {
            perms += "w"
        }
        return perms
    },
    nodePermissions: (node, perms) => {
        if (FS.ignorePermissions) {
            return 0
        }
        if (perms.includes("r") && !(node.mode & 292)) {
            return 2
        } else if (perms.includes("w") && !(node.mode & 146)) {
            return 2
        } else if (perms.includes("x") && !(node.mode & 73)) {
            return 2
        }
        return 0
    },
    mayLookup: dir => {
        var errCode = FS.nodePermissions(dir, "x");
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0
    },
    mayCreate: (dir, name) => {
        try {
            var node = FS.lookupNode(dir, name);
            return 20
        } catch (e) {}
        return FS.nodePermissions(dir, "wx")
    },
    mayDelete: (dir, name, isdir) => {
        var node;
        try {
            node = FS.lookupNode(dir, name)
        } catch (e) {
            return e.errno
        }
        var errCode = FS.nodePermissions(dir, "wx");
        if (errCode) {
            return errCode
        }
        if (isdir) {
            if (!FS.isDir(node.mode)) {
                return 54
            }
            if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                return 10
            }
        } else {
            if (FS.isDir(node.mode)) {
                return 31
            }
        }
        return 0
    },
    mayOpen: (node, flags) => {
        if (!node) {
            return 44
        }
        if (FS.isLink(node.mode)) {
            return 32
        } else if (FS.isDir(node.mode)) {
            if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
                return 31
            }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
    },
    MAX_OPEN_FDS: 4096,
    nextfd: (fd_start = 0, fd_end = FS.MAX_OPEN_FDS) => {
        for (var fd = fd_start; fd <= fd_end; fd++) {
            if (!FS.streams[fd]) {
                return fd
            }
        }
        throw new FS.ErrnoError(33)
    },
    getStream: fd => FS.streams[fd],
    createStream: (stream, fd_start, fd_end) => {
        if (!FS.FSStream) {
            FS.FSStream = function() {
                this.shared = {}
            };
            FS.FSStream.prototype = {};
            Object.defineProperties(FS.FSStream.prototype, {
                object: {
                    get: function() {
                        return this.node
                    },
                    set: function(val) {
                        this.node = val
                    }
                },
                isRead: {
                    get: function() {
                        return (this.flags & 2097155) !== 1
                    }
                },
                isWrite: {
                    get: function() {
                        return (this.flags & 2097155) !== 0
                    }
                },
                isAppend: {
                    get: function() {
                        return this.flags & 1024
                    }
                },
                flags: {
                    get: function() {
                        return this.shared.flags
                    },
                    set: function(val) {
                        this.shared.flags = val
                    }
                },
                position: {
                    get: function() {
                        return this.shared.position
                    },
                    set: function(val) {
                        this.shared.position = val
                    }
                }
            })
        }
        stream = Object.assign(new FS.FSStream, stream);
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream
    },
    closeStream: fd => {
        FS.streams[fd] = null
    },
    chrdev_stream_ops: {
        open: stream => {
            var device = FS.getDevice(stream.node.rdev);
            stream.stream_ops = device.stream_ops;
            if (stream.stream_ops.open) {
                stream.stream_ops.open(stream)
            }
        },
        llseek: () => {
            throw new FS.ErrnoError(70)
        }
    },
    major: dev => dev >> 8,
    minor: dev => dev & 255,
    makedev: (ma, mi) => ma << 8 | mi,
    registerDevice: (dev, ops) => {
        FS.devices[dev] = {
            stream_ops: ops
        }
    },
    getDevice: dev => FS.devices[dev],
    getMounts: mount => {
        var mounts = [];
        var check = [mount];
        while (check.length) {
            var m = check.pop();
            mounts.push(m);
            check.push.apply(check, m.mounts)
        }
        return mounts
    },
    syncfs: (populate, callback) => {
        if (typeof populate == "function") {
            callback = populate;
            populate = false
        }
        FS.syncFSRequests++;
        if (FS.syncFSRequests > 1) {
            err("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work")
        }
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;

        function doCallback(errCode) {
            assert(FS.syncFSRequests > 0);
            FS.syncFSRequests--;
            return callback(errCode)
        }

        function done(errCode) {
            if (errCode) {
                if (!done.errored) {
                    done.errored = true;
                    return doCallback(errCode)
                }
                return
            }
            if (++completed >= mounts.length) {
                doCallback(null)
            }
        }
        mounts.forEach(mount => {
            if (!mount.type.syncfs) {
                return done(null)
            }
            mount.type.syncfs(mount, populate, done)
        })
    },
    mount: (type, opts, mountpoint) => {
        if (typeof type == "string") {
            throw type
        }
        var root = mountpoint === "/";
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) {
            throw new FS.ErrnoError(10)
        } else if (!root && !pseudo) {
            var lookup = FS.lookupPath(mountpoint, {
                follow_mount: false
            });
            mountpoint = lookup.path;
            node = lookup.node;
            if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(10)
            }
            if (!FS.isDir(node.mode)) {
                throw new FS.ErrnoError(54)
            }
        }
        var mount = {
            type: type,
            opts: opts,
            mountpoint: mountpoint,
            mounts: []
        };
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) {
            FS.root = mountRoot
        } else if (node) {
            node.mounted = mount;
            if (node.mount) {
                node.mount.mounts.push(mount)
            }
        }
        return mountRoot
    },
    unmount: mountpoint => {
        var lookup = FS.lookupPath(mountpoint, {
            follow_mount: false
        });
        if (!FS.isMountpoint(lookup.node)) {
            throw new FS.ErrnoError(28)
        }
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach(hash => {
            var current = FS.nameTable[hash];
            while (current) {
                var next = current.name_next;
                if (mounts.includes(current.mount)) {
                    FS.destroyNode(current)
                }
                current = next
            }
        });
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1)
    },
    lookup: (parent, name) => {
        return parent.node_ops.lookup(parent, name)
    },
    mknod: (path, mode, dev) => {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === "." || name === "..") {
            throw new FS.ErrnoError(28)
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.mknod) {
            throw new FS.ErrnoError(63)
        }
        return parent.node_ops.mknod(parent, name, mode, dev)
    },
    create: (path, mode) => {
        mode = mode !== undefined ? mode : 438;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0)
    },
    mkdir: (path, mode) => {
        mode = mode !== undefined ? mode : 511;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0)
    },
    mkdirTree: (path, mode) => {
        var dirs = path.split("/");
        var d = "";
        for (var i = 0; i < dirs.length; ++i) {
            if (!dirs[i]) continue;
            d += "/" + dirs[i];
            try {
                FS.mkdir(d, mode)
            } catch (e) {
                if (e.errno != 20) throw e
            }
        }
    },
    mkdev: (path, mode, dev) => {
        if (typeof dev == "undefined") {
            dev = mode;
            mode = 438
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev)
    },
    symlink: (oldpath, newpath) => {
        if (!PATH_FS.resolve(oldpath)) {
            throw new FS.ErrnoError(44)
        }
        var lookup = FS.lookupPath(newpath, {
            parent: true
        });
        var parent = lookup.node;
        if (!parent) {
            throw new FS.ErrnoError(44)
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.symlink) {
            throw new FS.ErrnoError(63)
        }
        return parent.node_ops.symlink(parent, newname, oldpath)
    },
    rename: (old_path, new_path) => {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        lookup = FS.lookupPath(old_path, {
            parent: true
        });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, {
            parent: true
        });
        new_dir = lookup.node;
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        if (old_dir.mount !== new_dir.mount) {
            throw new FS.ErrnoError(75)
        }
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(28)
        }
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(55)
        }
        var new_node;
        try {
            new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {}
        if (old_node === new_node) {
            return
        }
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!old_dir.node_ops.rename) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
            throw new FS.ErrnoError(10)
        }
        if (new_dir !== old_dir) {
            errCode = FS.nodePermissions(old_dir, "w");
            if (errCode) {
                throw new FS.ErrnoError(errCode)
            }
        }
        FS.hashRemoveNode(old_node);
        try {
            old_dir.node_ops.rename(old_node, new_dir, new_name)
        } catch (e) {
            throw e
        } finally {
            FS.hashAddNode(old_node)
        }
    },
    rmdir: path => {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.rmdir) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10)
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node)
    },
    readdir: path => {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
            throw new FS.ErrnoError(54)
        }
        return node.node_ops.readdir(node)
    },
    unlink: path => {
        var lookup = FS.lookupPath(path, {
            parent: true
        });
        var parent = lookup.node;
        if (!parent) {
            throw new FS.ErrnoError(44)
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        if (!parent.node_ops.unlink) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10)
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node)
    },
    readlink: path => {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
            throw new FS.ErrnoError(44)
        }
        if (!link.node_ops.readlink) {
            throw new FS.ErrnoError(28)
        }
        return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
    },
    stat: (path, dontFollow) => {
        var lookup = FS.lookupPath(path, {
            follow: !dontFollow
        });
        var node = lookup.node;
        if (!node) {
            throw new FS.ErrnoError(44)
        }
        if (!node.node_ops.getattr) {
            throw new FS.ErrnoError(63)
        }
        return node.node_ops.getattr(node)
    },
    lstat: path => {
        return FS.stat(path, true)
    },
    chmod: (path, mode, dontFollow) => {
        var node;
        if (typeof path == "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        node.node_ops.setattr(node, {
            mode: mode & 4095 | node.mode & ~4095,
            timestamp: Date.now()
        })
    },
    lchmod: (path, mode) => {
        FS.chmod(path, mode, true)
    },
    fchmod: (fd, mode) => {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        FS.chmod(stream.node, mode)
    },
    chown: (path, uid, gid, dontFollow) => {
        var node;
        if (typeof path == "string") {
            var lookup = FS.lookupPath(path, {
                follow: !dontFollow
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        node.node_ops.setattr(node, {
            timestamp: Date.now()
        })
    },
    lchown: (path, uid, gid) => {
        FS.chown(path, uid, gid, true)
    },
    fchown: (fd, uid, gid) => {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        FS.chown(stream.node, uid, gid)
    },
    truncate: (path, len) => {
        if (len < 0) {
            throw new FS.ErrnoError(28)
        }
        var node;
        if (typeof path == "string") {
            var lookup = FS.lookupPath(path, {
                follow: true
            });
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(63)
        }
        if (FS.isDir(node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!FS.isFile(node.mode)) {
            throw new FS.ErrnoError(28)
        }
        var errCode = FS.nodePermissions(node, "w");
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        node.node_ops.setattr(node, {
            size: len,
            timestamp: Date.now()
        })
    },
    ftruncate: (fd, len) => {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(28)
        }
        FS.truncate(stream.node, len)
    },
    utime: (path, atime, mtime) => {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        var node = lookup.node;
        node.node_ops.setattr(node, {
            timestamp: Math.max(atime, mtime)
        })
    },
    open: (path, flags, mode) => {
        if (path === "") {
            throw new FS.ErrnoError(44)
        }
        flags = typeof flags == "string" ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode == "undefined" ? 438 : mode;
        if (flags & 64) {
            mode = mode & 4095 | 32768
        } else {
            mode = 0
        }
        var node;
        if (typeof path == "object") {
            node = path
        } else {
            path = PATH.normalize(path);
            try {
                var lookup = FS.lookupPath(path, {
                    follow: !(flags & 131072)
                });
                node = lookup.node
            } catch (e) {}
        }
        var created = false;
        if (flags & 64) {
            if (node) {
                if (flags & 128) {
                    throw new FS.ErrnoError(20)
                }
            } else {
                node = FS.mknod(path, mode, 0);
                created = true
            }
        }
        if (!node) {
            throw new FS.ErrnoError(44)
        }
        if (FS.isChrdev(node.mode)) {
            flags &= ~512
        }
        if (flags & 65536 && !FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54)
        }
        if (!created) {
            var errCode = FS.mayOpen(node, flags);
            if (errCode) {
                throw new FS.ErrnoError(errCode)
            }
        }
        if (flags & 512 && !created) {
            FS.truncate(node, 0)
        }
        flags &= ~(128 | 512 | 131072);
        var stream = FS.createStream({
            node: node,
            path: FS.getPath(node),
            flags: flags,
            seekable: true,
            position: 0,
            stream_ops: node.stream_ops,
            ungotten: [],
            error: false
        });
        if (stream.stream_ops.open) {
            stream.stream_ops.open(stream)
        }
        if (Module["logReadFiles"] && !(flags & 1)) {
            if (!FS.readFiles) FS.readFiles = {};
            if (!(path in FS.readFiles)) {
                FS.readFiles[path] = 1
            }
        }
        return stream
    },
    close: stream => {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (stream.getdents) stream.getdents = null;
        try {
            if (stream.stream_ops.close) {
                stream.stream_ops.close(stream)
            }
        } catch (e) {
            throw e
        } finally {
            FS.closeStream(stream.fd)
        }
        stream.fd = null
    },
    isClosed: stream => {
        return stream.fd === null
    },
    llseek: (stream, offset, whence) => {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
            throw new FS.ErrnoError(70)
        }
        if (whence != 0 && whence != 1 && whence != 2) {
            throw new FS.ErrnoError(28)
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position
    },
    read: (stream, buffer, offset, length, position) => {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(28)
        }
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(8)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!stream.stream_ops.read) {
            throw new FS.ErrnoError(28)
        }
        var seeking = typeof position != "undefined";
        if (!seeking) {
            position = stream.position
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(70)
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead
    },
    write: (stream, buffer, offset, length, position, canOwn) => {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(28)
        }
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(8)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(31)
        }
        if (!stream.stream_ops.write) {
            throw new FS.ErrnoError(28)
        }
        if (stream.seekable && stream.flags & 1024) {
            FS.llseek(stream, 0, 2)
        }
        var seeking = typeof position != "undefined";
        if (!seeking) {
            position = stream.position
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(70)
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten
    },
    allocate: (stream, offset, length) => {
        if (FS.isClosed(stream)) {
            throw new FS.ErrnoError(8)
        }
        if (offset < 0 || length <= 0) {
            throw new FS.ErrnoError(28)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(8)
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(43)
        }
        if (!stream.stream_ops.allocate) {
            throw new FS.ErrnoError(138)
        }
        stream.stream_ops.allocate(stream, offset, length)
    },
    mmap: (stream, length, position, prot, flags) => {
        if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
            throw new FS.ErrnoError(2)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(2)
        }
        if (!stream.stream_ops.mmap) {
            throw new FS.ErrnoError(43)
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags)
    },
    msync: (stream, buffer, offset, length, mmapFlags) => {
        if (!stream || !stream.stream_ops.msync) {
            return 0
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
    },
    munmap: stream => 0,
    ioctl: (stream, cmd, arg) => {
        if (!stream.stream_ops.ioctl) {
            throw new FS.ErrnoError(59)
        }
        return stream.stream_ops.ioctl(stream, cmd, arg)
    },
    readFile: (path, opts = {}) => {
        opts.flags = opts.flags || 0;
        opts.encoding = opts.encoding || "binary";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === "utf8") {
            ret = UTF8ArrayToString(buf, 0)
        } else if (opts.encoding === "binary") {
            ret = buf
        }
        FS.close(stream);
        return ret
    },
    writeFile: (path, data, opts = {}) => {
        opts.flags = opts.flags || 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        if (typeof data == "string") {
            var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
            var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
            FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn)
        } else if (ArrayBuffer.isView(data)) {
            FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn)
        } else {
            throw new Error("Unsupported data type")
        }
        FS.close(stream)
    },
    cwd: () => FS.currentPath,
    chdir: path => {
        var lookup = FS.lookupPath(path, {
            follow: true
        });
        if (lookup.node === null) {
            throw new FS.ErrnoError(44)
        }
        if (!FS.isDir(lookup.node.mode)) {
            throw new FS.ErrnoError(54)
        }
        var errCode = FS.nodePermissions(lookup.node, "x");
        if (errCode) {
            throw new FS.ErrnoError(errCode)
        }
        FS.currentPath = lookup.path
    },
    createDefaultDirectories: () => {
        FS.mkdir("/tmp");
        FS.mkdir("/home");
        FS.mkdir("/home/web_user")
    },
    createDefaultDevices: () => {
        FS.mkdir("/dev");
        FS.registerDevice(FS.makedev(1, 3), {
            read: () => 0,
            write: (stream, buffer, offset, length, pos) => length
        });
        FS.mkdev("/dev/null", FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev("/dev/tty", FS.makedev(5, 0));
        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
        var random_device = getRandomDevice();
        FS.createDevice("/dev", "random", random_device);
        FS.createDevice("/dev", "urandom", random_device);
        FS.mkdir("/dev/shm");
        FS.mkdir("/dev/shm/tmp")
    },
    createSpecialDirectories: () => {
        FS.mkdir("/proc");
        var proc_self = FS.mkdir("/proc/self");
        FS.mkdir("/proc/self/fd");
        FS.mount({
            mount: () => {
                var node = FS.createNode(proc_self, "fd", 16384 | 511, 73);
                node.node_ops = {
                    lookup: (parent, name) => {
                        var fd = +name;
                        var stream = FS.getStream(fd);
                        if (!stream) throw new FS.ErrnoError(8);
                        var ret = {
                            parent: null,
                            mount: {
                                mountpoint: "fake"
                            },
                            node_ops: {
                                readlink: () => stream.path
                            }
                        };
                        ret.parent = ret;
                        return ret
                    }
                };
                return node
            }
        }, {}, "/proc/self/fd")
    },
    createStandardStreams: () => {
        if (Module["stdin"]) {
            FS.createDevice("/dev", "stdin", Module["stdin"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdin")
        }
        if (Module["stdout"]) {
            FS.createDevice("/dev", "stdout", null, Module["stdout"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdout")
        }
        if (Module["stderr"]) {
            FS.createDevice("/dev", "stderr", null, Module["stderr"])
        } else {
            FS.symlink("/dev/tty1", "/dev/stderr")
        }
        var stdin = FS.open("/dev/stdin", 0);
        var stdout = FS.open("/dev/stdout", 1);
        var stderr = FS.open("/dev/stderr", 1);
        assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
        assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
        assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")")
    },
    ensureErrnoError: () => {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
            this.node = node;
            this.setErrno = function(errno) {
                this.errno = errno;
                for (var key in ERRNO_CODES) {
                    if (ERRNO_CODES[key] === errno) {
                        this.code = key;
                        break
                    }
                }
            };
            this.setErrno(errno);
            this.message = ERRNO_MESSAGES[errno];
            if (this.stack) {
                Object.defineProperty(this, "stack", {
                    value: (new Error).stack,
                    writable: true
                });
                this.stack = demangleAll(this.stack)
            }
        };
        FS.ErrnoError.prototype = new Error;
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        [44].forEach(code => {
            FS.genericErrors[code] = new FS.ErrnoError(code);
            FS.genericErrors[code].stack = "<generic error, no stack>"
        })
    },
    staticInit: () => {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, "/");
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = {
            "MEMFS": MEMFS
        }
    },
    init: (input, output, error) => {
        assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
        FS.init.initialized = true;
        FS.ensureErrnoError();
        Module["stdin"] = input || Module["stdin"];
        Module["stdout"] = output || Module["stdout"];
        Module["stderr"] = error || Module["stderr"];
        FS.createStandardStreams()
    },
    quit: () => {
        FS.init.initialized = false;
        _fflush(0);
        for (var i = 0; i < FS.streams.length; i++) {
            var stream = FS.streams[i];
            if (!stream) {
                continue
            }
            FS.close(stream)
        }
    },
    getMode: (canRead, canWrite) => {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode
    },
    findObject: (path, dontResolveLastLink) => {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
            return null
        }
        return ret.object
    },
    analyzePath: (path, dontResolveLastLink) => {
        try {
            var lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            path = lookup.path
        } catch (e) {}
        var ret = {
            isRoot: false,
            exists: false,
            error: 0,
            name: null,
            path: null,
            object: null,
            parentExists: false,
            parentPath: null,
            parentObject: null
        };
        try {
            var lookup = FS.lookupPath(path, {
                parent: true
            });
            ret.parentExists = true;
            ret.parentPath = lookup.path;
            ret.parentObject = lookup.node;
            ret.name = PATH.basename(path);
            lookup = FS.lookupPath(path, {
                follow: !dontResolveLastLink
            });
            ret.exists = true;
            ret.path = lookup.path;
            ret.object = lookup.node;
            ret.name = lookup.node.name;
            ret.isRoot = lookup.path === "/"
        } catch (e) {
            ret.error = e.errno
        }
        return ret
    },
    createPath: (parent, path, canRead, canWrite) => {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        var parts = path.split("/").reverse();
        while (parts.length) {
            var part = parts.pop();
            if (!part) continue;
            var current = PATH.join2(parent, part);
            try {
                FS.mkdir(current)
            } catch (e) {}
            parent = current
        }
        return current
    },
    createFile: (parent, name, properties, canRead, canWrite) => {
        var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode)
    },
    createDataFile: (parent, name, data, canRead, canWrite, canOwn) => {
        var path = name;
        if (parent) {
            parent = typeof parent == "string" ? parent : FS.getPath(parent);
            path = name ? PATH.join2(parent, name) : parent
        }
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
            if (typeof data == "string") {
                var arr = new Array(data.length);
                for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
                data = arr
            }
            FS.chmod(node, mode | 146);
            var stream = FS.open(node, 577);
            FS.write(stream, data, 0, data.length, 0, canOwn);
            FS.close(stream);
            FS.chmod(node, mode)
        }
        return node
    },
    createDevice: (parent, name, input, output) => {
        var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
            open: stream => {
                stream.seekable = false
            },
            close: stream => {
                if (output && output.buffer && output.buffer.length) {
                    output(10)
                }
            },
            read: (stream, buffer, offset, length, pos) => {
                var bytesRead = 0;
                for (var i = 0; i < length; i++) {
                    var result;
                    try {
                        result = input()
                    } catch (e) {
                        throw new FS.ErrnoError(29)
                    }
                    if (result === undefined && bytesRead === 0) {
                        throw new FS.ErrnoError(6)
                    }
                    if (result === null || result === undefined) break;
                    bytesRead++;
                    buffer[offset + i] = result
                }
                if (bytesRead) {
                    stream.node.timestamp = Date.now()
                }
                return bytesRead
            },
            write: (stream, buffer, offset, length, pos) => {
                for (var i = 0; i < length; i++) {
                    try {
                        output(buffer[offset + i])
                    } catch (e) {
                        throw new FS.ErrnoError(29)
                    }
                }
                if (length) {
                    stream.node.timestamp = Date.now()
                }
                return i
            }
        });
        return FS.mkdev(path, mode, dev)
    },
    forceLoadFile: obj => {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (typeof XMLHttpRequest != "undefined") {
            throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
        } else if (read_) {
            try {
                obj.contents = intArrayFromString(read_(obj.url), true);
                obj.usedBytes = obj.contents.length
            } catch (e) {
                throw new FS.ErrnoError(29)
            }
        } else {
            throw new Error("Cannot load without read() or XMLHttpRequest.")
        }
    },
    createLazyFile: (parent, name, url, canRead, canWrite) => {
        function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length - 1 || idx < 0) {
                return undefined
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = idx / this.chunkSize | 0;
            return this.getter(chunkNum)[chunkOffset]
        };
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter
        };
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
            var xhr = new XMLHttpRequest;
            xhr.open("HEAD", url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
            var chunkSize = 1024 * 1024;
            if (!hasByteServing) chunkSize = datalength;
            var doXHR = (from, to) => {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                xhr.responseType = "arraybuffer";
                if (xhr.overrideMimeType) {
                    xhr.overrideMimeType("text/plain; charset=x-user-defined")
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                    return new Uint8Array(xhr.response || [])
                }
                return intArrayFromString(xhr.responseText || "", true)
            };
            var lazyArray = this;
            lazyArray.setDataGetter(chunkNum => {
                var start = chunkNum * chunkSize;
                var end = (chunkNum + 1) * chunkSize - 1;
                end = Math.min(end, datalength - 1);
                if (typeof lazyArray.chunks[chunkNum] == "undefined") {
                    lazyArray.chunks[chunkNum] = doXHR(start, end)
                }
                if (typeof lazyArray.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum]
            });
            if (usesGzip || !datalength) {
                chunkSize = datalength = 1;
                datalength = this.getter(0).length;
                chunkSize = datalength;
                out("LazyFiles on gzip forces download of the whole file when length is accessed")
            }
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true
        };
        if (typeof XMLHttpRequest != "undefined") {
            if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
            var lazyArray = new LazyUint8Array;
            Object.defineProperties(lazyArray, {
                length: {
                    get: function() {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._length
                    }
                },
                chunkSize: {
                    get: function() {
                        if (!this.lengthKnown) {
                            this.cacheLength()
                        }
                        return this._chunkSize
                    }
                }
            });
            var properties = {
                isDevice: false,
                contents: lazyArray
            }
        } else {
            var properties = {
                isDevice: false,
                url: url
            }
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) {
            node.contents = properties.contents
        } else if (properties.url) {
            node.contents = null;
            node.url = properties.url
        }
        Object.defineProperties(node, {
            usedBytes: {
                get: function() {
                    return this.contents.length
                }
            }
        });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(key => {
            var fn = node.stream_ops[key];
            stream_ops[key] = function forceLoadLazyFile() {
                FS.forceLoadFile(node);
                return fn.apply(null, arguments)
            }
        });

        function writeChunks(stream, buffer, offset, length, position) {
            var contents = stream.node.contents;
            if (position >= contents.length) return 0;
            var size = Math.min(contents.length - position, length);
            assert(size >= 0);
            if (contents.slice) {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents[position + i]
                }
            } else {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents.get(position + i)
                }
            }
            return size
        }
        stream_ops.read = (stream, buffer, offset, length, position) => {
            FS.forceLoadFile(node);
            return writeChunks(stream, buffer, offset, length, position)
        };
        stream_ops.mmap = (stream, length, position, prot, flags) => {
            FS.forceLoadFile(node);
            var ptr = mmapAlloc(length);
            if (!ptr) {
                throw new FS.ErrnoError(48)
            }
            writeChunks(stream, HEAP8, ptr, length, position);
            return {
                ptr: ptr,
                allocated: true
            }
        };
        node.stream_ops = stream_ops;
        return node
    },
    createPreloadedFile: (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
        var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency("cp " + fullname);

        function processData(byteArray) {
            function finish(byteArray) {
                if (preFinish) preFinish();
                if (!dontCreateFile) {
                    FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
                }
                if (onload) onload();
                removeRunDependency(dep)
            }
            if (Browser.handledByPreloadPlugin(byteArray, fullname, finish, () => {
                    if (onerror) onerror();
                    removeRunDependency(dep)
                })) {
                return
            }
            finish(byteArray)
        }
        addRunDependency(dep);
        if (typeof url == "string") {
            asyncLoad(url, byteArray => processData(byteArray), onerror)
        } else {
            processData(url)
        }
    },
    indexedDB: () => {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
    },
    DB_NAME: () => {
        return "EM_FS_" + window.location.pathname
    },
    DB_VERSION: 20,
    DB_STORE_NAME: "FILE_DATA",
    saveFilesToDB: (paths, onload, onerror) => {
        onload = onload || (() => {});
        onerror = onerror || (() => {});
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = () => {
            out("creating db");
            var db = openRequest.result;
            db.createObjectStore(FS.DB_STORE_NAME)
        };
        openRequest.onsuccess = () => {
            var db = openRequest.result;
            var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0,
                fail = 0,
                total = paths.length;

            function finish() {
                if (fail == 0) onload();
                else onerror()
            }
            paths.forEach(path => {
                var putRequest = files.put(FS.analyzePath(path).object.contents, path);
                putRequest.onsuccess = () => {
                    ok++;
                    if (ok + fail == total) finish()
                };
                putRequest.onerror = () => {
                    fail++;
                    if (ok + fail == total) finish()
                }
            });
            transaction.onerror = onerror
        };
        openRequest.onerror = onerror
    },
    loadFilesFromDB: (paths, onload, onerror) => {
        onload = onload || (() => {});
        onerror = onerror || (() => {});
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = onerror;
        openRequest.onsuccess = () => {
            var db = openRequest.result;
            try {
                var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
            } catch (e) {
                onerror(e);
                return
            }
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0,
                fail = 0,
                total = paths.length;

            function finish() {
                if (fail == 0) onload();
                else onerror()
            }
            paths.forEach(path => {
                var getRequest = files.get(path);
                getRequest.onsuccess = () => {
                    if (FS.analyzePath(path).exists) {
                        FS.unlink(path)
                    }
                    FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
                    ok++;
                    if (ok + fail == total) finish()
                };
                getRequest.onerror = () => {
                    fail++;
                    if (ok + fail == total) finish()
                }
            });
            transaction.onerror = onerror
        };
        openRequest.onerror = onerror
    },
    absolutePath: () => {
        abort("FS.absolutePath has been removed; use PATH_FS.resolve instead")
    },
    createFolder: () => {
        abort("FS.createFolder has been removed; use FS.mkdir instead")
    },
    createLink: () => {
        abort("FS.createLink has been removed; use FS.symlink instead")
    },
    joinPath: () => {
        abort("FS.joinPath has been removed; use PATH.join instead")
    },
    mmapAlloc: () => {
        abort("FS.mmapAlloc has been replaced by the top level function mmapAlloc")
    },
    standardizePath: () => {
        abort("FS.standardizePath has been removed; use PATH.normalize instead")
    }
};
var SYSCALLS = {
    DEFAULT_POLLMASK: 5,
    calculateAt: function(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
            return path
        }
        var dir;
        if (dirfd === -100) {
            dir = FS.cwd()
        } else {
            var dirstream = FS.getStream(dirfd);
            if (!dirstream) throw new FS.ErrnoError(8);
            dir = dirstream.path
        }
        if (path.length == 0) {
            if (!allowEmpty) {
                throw new FS.ErrnoError(44)
            }
            return dir
        }
        return PATH.join2(dir, path)
    },
    doStat: function(func, path, buf) {
        try {
            var stat = func(path)
        } catch (e) {
            if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
                return -54
            }
            throw e
        }
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[buf + 8 >> 2] = stat.ino;
        HEAP32[buf + 12 >> 2] = stat.mode;
        HEAP32[buf + 16 >> 2] = stat.nlink;
        HEAP32[buf + 20 >> 2] = stat.uid;
        HEAP32[buf + 24 >> 2] = stat.gid;
        HEAP32[buf + 28 >> 2] = stat.rdev;
        tempI64 = [stat.size >>> 0, (tempDouble = stat.size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 40 >> 2] = tempI64[0], HEAP32[buf + 44 >> 2] = tempI64[1];
        HEAP32[buf + 48 >> 2] = 4096;
        HEAP32[buf + 52 >> 2] = stat.blocks;
        tempI64 = [Math.floor(stat.atime.getTime() / 1e3) >>> 0, (tempDouble = Math.floor(stat.atime.getTime() / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 56 >> 2] = tempI64[0], HEAP32[buf + 60 >> 2] = tempI64[1];
        HEAP32[buf + 64 >> 2] = 0;
        tempI64 = [Math.floor(stat.mtime.getTime() / 1e3) >>> 0, (tempDouble = Math.floor(stat.mtime.getTime() / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 72 >> 2] = tempI64[0], HEAP32[buf + 76 >> 2] = tempI64[1];
        HEAP32[buf + 80 >> 2] = 0;
        tempI64 = [Math.floor(stat.ctime.getTime() / 1e3) >>> 0, (tempDouble = Math.floor(stat.ctime.getTime() / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 88 >> 2] = tempI64[0], HEAP32[buf + 92 >> 2] = tempI64[1];
        HEAP32[buf + 96 >> 2] = 0;
        tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 104 >> 2] = tempI64[0], HEAP32[buf + 108 >> 2] = tempI64[1];
        return 0
    },
    doMsync: function(addr, stream, len, flags, offset) {
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags)
    },
    varargs: undefined,
    get: function() {
        assert(SYSCALLS.varargs != undefined);
        SYSCALLS.varargs += 4;
        var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
        return ret
    },
    getStr: function(ptr) {
        var ret = UTF8ToString(ptr);
        return ret
    },
    getStreamFromFD: function(fd) {
        var stream = FS.getStream(fd);
        if (!stream) throw new FS.ErrnoError(8);
        return stream
    }
};

function ___syscall_fcntl64(fd, cmd, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
            case 0: {
                var arg = SYSCALLS.get();
                if (arg < 0) {
                    return -28
                }
                var newStream;
                newStream = FS.createStream(stream, arg);
                return newStream.fd
            }
            case 1:
            case 2:
                return 0;
            case 3:
                return stream.flags;
            case 4: {
                var arg = SYSCALLS.get();
                stream.flags |= arg;
                return 0
            }
            case 5: {
                var arg = SYSCALLS.get();
                var offset = 0;
                HEAP16[arg + offset >> 1] = 2;
                return 0
            }
            case 6:
            case 7:
                return 0;
            case 16:
            case 8:
                return -28;
            case 9:
                setErrNo(28);
                return -1;
            default: {
                return -28
            }
        }
    } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return -e.errno
    }
}

function ___syscall_getcwd(buf, size) {
    try {
        if (size === 0) return -28;
        var cwd = FS.cwd();
        var cwdLengthInBytes = lengthBytesUTF8(cwd) + 1;
        if (size < cwdLengthInBytes) return -68;
        stringToUTF8(cwd, buf, size);
        return cwdLengthInBytes
    } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return -e.errno
    }
}

function ___syscall_ioctl(fd, op, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (op) {
            case 21509:
            case 21505: {
                if (!stream.tty) return -59;
                return 0
            }
            case 21510:
            case 21511:
            case 21512:
            case 21506:
            case 21507:
            case 21508: {
                if (!stream.tty) return -59;
                return 0
            }
            case 21519: {
                if (!stream.tty) return -59;
                var argp = SYSCALLS.get();
                HEAP32[argp >> 2] = 0;
                return 0
            }
            case 21520: {
                if (!stream.tty) return -59;
                return -28
            }
            case 21531: {
                var argp = SYSCALLS.get();
                return FS.ioctl(stream, op, argp)
            }
            case 21523: {
                if (!stream.tty) return -59;
                return 0
            }
            case 21524: {
                if (!stream.tty) return -59;
                return 0
            }
            default:
                return -28
        }
    } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return -e.errno
    }
}

function ___syscall_openat(dirfd, path, flags, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        var mode = varargs ? SYSCALLS.get() : 0;
        return FS.open(path, flags, mode).fd
    } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return -e.errno
    }
}

function ___syscall_rmdir(path) {
    try {
        path = SYSCALLS.getStr(path);
        FS.rmdir(path);
        return 0
    } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return -e.errno
    }
}

function ___syscall_unlinkat(dirfd, path, flags) {
    try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (flags === 0) {
            FS.unlink(path)
        } else if (flags === 512) {
            FS.rmdir(path)
        } else {
            abort("Invalid flags passed to unlinkat")
        }
        return 0
    } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return -e.errno
    }
}

function __embind_register_bigint(primitiveType, name, size, minRange, maxRange) {}

function getShiftFromSize(size) {
    switch (size) {
        case 1:
            return 0;
        case 2:
            return 1;
        case 4:
            return 2;
        case 8:
            return 3;
        default:
            throw new TypeError("Unknown type size: " + size)
    }
}

function embind_init_charCodes() {
    var codes = new Array(256);
    for (var i = 0; i < 256; ++i) {
        codes[i] = String.fromCharCode(i)
    }
    embind_charCodes = codes
}
var embind_charCodes = undefined;

function readLatin1String(ptr) {
    var ret = "";
    var c = ptr;
    while (HEAPU8[c]) {
        ret += embind_charCodes[HEAPU8[c++]]
    }
    return ret
}
var awaitingDependencies = {};
var registeredTypes = {};
var typeDependencies = {};
var char_0 = 48;
var char_9 = 57;

function makeLegalFunctionName(name) {
    if (undefined === name) {
        return "_unknown"
    }
    name = name.replace(/[^a-zA-Z0-9_]/g, "$");
    var f = name.charCodeAt(0);
    if (f >= char_0 && f <= char_9) {
        return "_" + name
    }
    return name
}

function createNamedFunction(name, body) {
    name = makeLegalFunctionName(name);
    return new Function("body", "return function " + name + "() {\n" + '    "use strict";' + "    return body.apply(this, arguments);\n" + "};\n")(body)
}

function extendError(baseErrorType, errorName) {
    var errorClass = createNamedFunction(errorName, function(message) {
        this.name = errorName;
        this.message = message;
        var stack = new Error(message).stack;
        if (stack !== undefined) {
            this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "")
        }
    });
    errorClass.prototype = Object.create(baseErrorType.prototype);
    errorClass.prototype.constructor = errorClass;
    errorClass.prototype.toString = function() {
        if (this.message === undefined) {
            return this.name
        } else {
            return this.name + ": " + this.message
        }
    };
    return errorClass
}
var BindingError = undefined;

function throwBindingError(message) {
    throw new BindingError(message)
}
var InternalError = undefined;

function throwInternalError(message) {
    throw new InternalError(message)
}

function registerType(rawType, registeredInstance, options = {}) {
    if (!("argPackAdvance" in registeredInstance)) {
        throw new TypeError("registerType registeredInstance requires argPackAdvance")
    }
    var name = registeredInstance.name;
    if (!rawType) {
        throwBindingError('type "' + name + '" must have a positive integer typeid pointer')
    }
    if (registeredTypes.hasOwnProperty(rawType)) {
        if (options.ignoreDuplicateRegistrations) {
            return
        } else {
            throwBindingError("Cannot register type '" + name + "' twice")
        }
    }
    registeredTypes[rawType] = registeredInstance;
    delete typeDependencies[rawType];
    if (awaitingDependencies.hasOwnProperty(rawType)) {
        var callbacks = awaitingDependencies[rawType];
        delete awaitingDependencies[rawType];
        callbacks.forEach(cb => cb())
    }
}

function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
    var shift = getShiftFromSize(size);
    name = readLatin1String(name);
    registerType(rawType, {
        name: name,
        "fromWireType": function(wt) {
            return !!wt
        },
        "toWireType": function(destructors, o) {
            return o ? trueValue : falseValue
        },
        "argPackAdvance": 8,
        "readValueFromPointer": function(pointer) {
            var heap;
            if (size === 1) {
                heap = HEAP8
            } else if (size === 2) {
                heap = HEAP16
            } else if (size === 4) {
                heap = HEAP32
            } else {
                throw new TypeError("Unknown boolean type size: " + name)
            }
            return this["fromWireType"](heap[pointer >> shift])
        },
        destructorFunction: null
    })
}
var emval_free_list = [];
var emval_handle_array = [{}, {
    value: undefined
}, {
    value: null
}, {
    value: true
}, {
    value: false
}];

function __emval_decref(handle) {
    if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
        emval_handle_array[handle] = undefined;
        emval_free_list.push(handle)
    }
}

function count_emval_handles() {
    var count = 0;
    for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== undefined) {
            ++count
        }
    }
    return count
}

function get_first_emval() {
    for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== undefined) {
            return emval_handle_array[i]
        }
    }
    return null
}

function init_emval() {
    Module["count_emval_handles"] = count_emval_handles;
    Module["get_first_emval"] = get_first_emval
}
var Emval = {
    toValue: handle => {
        if (!handle) {
            throwBindingError("Cannot use deleted val. handle = " + handle)
        }
        return emval_handle_array[handle].value
    },
    toHandle: value => {
        switch (value) {
            case undefined:
                return 1;
            case null:
                return 2;
            case true:
                return 3;
            case false:
                return 4;
            default: {
                var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
                emval_handle_array[handle] = {
                    refcount: 1,
                    value: value
                };
                return handle
            }
        }
    }
};

function simpleReadValueFromPointer(pointer) {
    return this["fromWireType"](HEAP32[pointer >> 2])
}

function __embind_register_emval(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
        name: name,
        "fromWireType": function(handle) {
            var rv = Emval.toValue(handle);
            __emval_decref(handle);
            return rv
        },
        "toWireType": function(destructors, value) {
            return Emval.toHandle(value)
        },
        "argPackAdvance": 8,
        "readValueFromPointer": simpleReadValueFromPointer,
        destructorFunction: null
    })
}

function embindRepr(v) {
    if (v === null) {
        return "null"
    }
    var t = typeof v;
    if (t === "object" || t === "array" || t === "function") {
        return v.toString()
    } else {
        return "" + v
    }
}

function floatReadValueFromPointer(name, shift) {
    switch (shift) {
        case 2:
            return function(pointer) {
                return this["fromWireType"](HEAPF32[pointer >> 2])
            };
        case 3:
            return function(pointer) {
                return this["fromWireType"](HEAPF64[pointer >> 3])
            };
        default:
            throw new TypeError("Unknown float type: " + name)
    }
}

function __embind_register_float(rawType, name, size) {
    var shift = getShiftFromSize(size);
    name = readLatin1String(name);
    registerType(rawType, {
        name: name,
        "fromWireType": function(value) {
            return value
        },
        "toWireType": function(destructors, value) {
            if (typeof value != "number" && typeof value != "boolean") {
                throw new TypeError('Cannot convert "' + embindRepr(value) + '" to ' + this.name)
            }
            return value
        },
        "argPackAdvance": 8,
        "readValueFromPointer": floatReadValueFromPointer(name, shift),
        destructorFunction: null
    })
}

function integerReadValueFromPointer(name, shift, signed) {
    switch (shift) {
        case 0:
            return signed ? function readS8FromPointer(pointer) {
                return HEAP8[pointer]
            } : function readU8FromPointer(pointer) {
                return HEAPU8[pointer]
            };
        case 1:
            return signed ? function readS16FromPointer(pointer) {
                return HEAP16[pointer >> 1]
            } : function readU16FromPointer(pointer) {
                return HEAPU16[pointer >> 1]
            };
        case 2:
            return signed ? function readS32FromPointer(pointer) {
                return HEAP32[pointer >> 2]
            } : function readU32FromPointer(pointer) {
                return HEAPU32[pointer >> 2]
            };
        default:
            throw new TypeError("Unknown integer type: " + name)
    }
}

function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
    name = readLatin1String(name);
    if (maxRange === -1) {
        maxRange = 4294967295
    }
    var shift = getShiftFromSize(size);
    var fromWireType = value => value;
    if (minRange === 0) {
        var bitshift = 32 - 8 * size;
        fromWireType = value => value << bitshift >>> bitshift
    }
    var isUnsignedType = name.includes("unsigned");
    var checkAssertions = (value, toTypeName) => {
        if (typeof value != "number" && typeof value != "boolean") {
            throw new TypeError('Cannot convert "' + embindRepr(value) + '" to ' + toTypeName)
        }
        if (value < minRange || value > maxRange) {
            throw new TypeError('Passing a number "' + embindRepr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ", " + maxRange + "]!")
        }
    };
    var toWireType;
    if (isUnsignedType) {
        toWireType = function(destructors, value) {
            checkAssertions(value, this.name);
            return value >>> 0
        }
    } else {
        toWireType = function(destructors, value) {
            checkAssertions(value, this.name);
            return value
        }
    }
    registerType(primitiveType, {
        name: name,
        "fromWireType": fromWireType,
        "toWireType": toWireType,
        "argPackAdvance": 8,
        "readValueFromPointer": integerReadValueFromPointer(name, shift, minRange !== 0),
        destructorFunction: null
    })
}

function __embind_register_memory_view(rawType, dataTypeIndex, name) {
    var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
    var TA = typeMapping[dataTypeIndex];

    function decodeMemoryView(handle) {
        handle = handle >> 2;
        var heap = HEAPU32;
        var size = heap[handle];
        var data = heap[handle + 1];
        return new TA(buffer, data, size)
    }
    name = readLatin1String(name);
    registerType(rawType, {
        name: name,
        "fromWireType": decodeMemoryView,
        "argPackAdvance": 8,
        "readValueFromPointer": decodeMemoryView
    }, {
        ignoreDuplicateRegistrations: true
    })
}

function __embind_register_std_string(rawType, name) {
    name = readLatin1String(name);
    var stdStringIsUTF8 = name === "std::string";
    registerType(rawType, {
        name: name,
        "fromWireType": function(value) {
            var length = HEAPU32[value >> 2];
            var payload = value + 4;
            var str;
            if (stdStringIsUTF8) {
                var decodeStartPtr = payload;
                for (var i = 0; i <= length; ++i) {
                    var currentBytePtr = payload + i;
                    if (i == length || HEAPU8[currentBytePtr] == 0) {
                        var maxRead = currentBytePtr - decodeStartPtr;
                        var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
                        if (str === undefined) {
                            str = stringSegment
                        } else {
                            str += String.fromCharCode(0);
                            str += stringSegment
                        }
                        decodeStartPtr = currentBytePtr + 1
                    }
                }
            } else {
                var a = new Array(length);
                for (var i = 0; i < length; ++i) {
                    a[i] = String.fromCharCode(HEAPU8[payload + i])
                }
                str = a.join("")
            }
            _free(value);
            return str
        },
        "toWireType": function(destructors, value) {
            if (value instanceof ArrayBuffer) {
                value = new Uint8Array(value)
            }
            var length;
            var valueIsOfTypeString = typeof value == "string";
            if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
                throwBindingError("Cannot pass non-string to std::string")
            }
            if (stdStringIsUTF8 && valueIsOfTypeString) {
                length = lengthBytesUTF8(value)
            } else {
                length = value.length
            }
            var base = _malloc(4 + length + 1);
            var ptr = base + 4;
            HEAPU32[base >> 2] = length;
            if (stdStringIsUTF8 && valueIsOfTypeString) {
                stringToUTF8(value, ptr, length + 1)
            } else {
                if (valueIsOfTypeString) {
                    for (var i = 0; i < length; ++i) {
                        var charCode = value.charCodeAt(i);
                        if (charCode > 255) {
                            _free(ptr);
                            throwBindingError("String has UTF-16 code units that do not fit in 8 bits")
                        }
                        HEAPU8[ptr + i] = charCode
                    }
                } else {
                    for (var i = 0; i < length; ++i) {
                        HEAPU8[ptr + i] = value[i]
                    }
                }
            }
            if (destructors !== null) {
                destructors.push(_free, base)
            }
            return base
        },
        "argPackAdvance": 8,
        "readValueFromPointer": simpleReadValueFromPointer,
        destructorFunction: function(ptr) {
            _free(ptr)
        }
    })
}
var UTF16Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf-16le") : undefined;

function UTF16ToString(ptr, maxBytesToRead) {
    assert(ptr % 2 == 0, "Pointer passed to UTF16ToString must be aligned to two bytes!");
    var endPtr = ptr;
    var idx = endPtr >> 1;
    var maxIdx = idx + maxBytesToRead / 2;
    while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
    endPtr = idx << 1;
    if (endPtr - ptr > 32 && UTF16Decoder) {
        return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr))
    } else {
        var str = "";
        for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
            var codeUnit = HEAP16[ptr + i * 2 >> 1];
            if (codeUnit == 0) break;
            str += String.fromCharCode(codeUnit)
        }
        return str
    }
}

function stringToUTF16(str, outPtr, maxBytesToWrite) {
    assert(outPtr % 2 == 0, "Pointer passed to stringToUTF16 must be aligned to two bytes!");
    assert(typeof maxBytesToWrite == "number", "stringToUTF16(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
    if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 2147483647
    }
    if (maxBytesToWrite < 2) return 0;
    maxBytesToWrite -= 2;
    var startPtr = outPtr;
    var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
    for (var i = 0; i < numCharsToWrite; ++i) {
        var codeUnit = str.charCodeAt(i);
        HEAP16[outPtr >> 1] = codeUnit;
        outPtr += 2
    }
    HEAP16[outPtr >> 1] = 0;
    return outPtr - startPtr
}

function lengthBytesUTF16(str) {
    return str.length * 2
}

function UTF32ToString(ptr, maxBytesToRead) {
    assert(ptr % 4 == 0, "Pointer passed to UTF32ToString must be aligned to four bytes!");
    var i = 0;
    var str = "";
    while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[ptr + i * 4 >> 2];
        if (utf32 == 0) break;
        ++i;
        if (utf32 >= 65536) {
            var ch = utf32 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
        } else {
            str += String.fromCharCode(utf32)
        }
    }
    return str
}

function stringToUTF32(str, outPtr, maxBytesToWrite) {
    assert(outPtr % 4 == 0, "Pointer passed to stringToUTF32 must be aligned to four bytes!");
    assert(typeof maxBytesToWrite == "number", "stringToUTF32(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
    if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 2147483647
    }
    if (maxBytesToWrite < 4) return 0;
    var startPtr = outPtr;
    var endPtr = startPtr + maxBytesToWrite - 4;
    for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) {
            var trailSurrogate = str.charCodeAt(++i);
            codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023
        }
        HEAP32[outPtr >> 2] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break
    }
    HEAP32[outPtr >> 2] = 0;
    return outPtr - startPtr
}

function lengthBytesUTF32(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
        len += 4
    }
    return len
}

function __embind_register_std_wstring(rawType, charSize, name) {
    name = readLatin1String(name);
    var decodeString, encodeString, getHeap, lengthBytesUTF, shift;
    if (charSize === 2) {
        decodeString = UTF16ToString;
        encodeString = stringToUTF16;
        lengthBytesUTF = lengthBytesUTF16;
        getHeap = () => HEAPU16;
        shift = 1
    } else if (charSize === 4) {
        decodeString = UTF32ToString;
        encodeString = stringToUTF32;
        lengthBytesUTF = lengthBytesUTF32;
        getHeap = () => HEAPU32;
        shift = 2
    }
    registerType(rawType, {
        name: name,
        "fromWireType": function(value) {
            var length = HEAPU32[value >> 2];
            var HEAP = getHeap();
            var str;
            var decodeStartPtr = value + 4;
            for (var i = 0; i <= length; ++i) {
                var currentBytePtr = value + 4 + i * charSize;
                if (i == length || HEAP[currentBytePtr >> shift] == 0) {
                    var maxReadBytes = currentBytePtr - decodeStartPtr;
                    var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
                    if (str === undefined) {
                        str = stringSegment
                    } else {
                        str += String.fromCharCode(0);
                        str += stringSegment
                    }
                    decodeStartPtr = currentBytePtr + charSize
                }
            }
            _free(value);
            return str
        },
        "toWireType": function(destructors, value) {
            if (!(typeof value == "string")) {
                throwBindingError("Cannot pass non-string to C++ string type " + name)
            }
            var length = lengthBytesUTF(value);
            var ptr = _malloc(4 + length + charSize);
            HEAPU32[ptr >> 2] = length >> shift;
            encodeString(value, ptr + 4, length + charSize);
            if (destructors !== null) {
                destructors.push(_free, ptr)
            }
            return ptr
        },
        "argPackAdvance": 8,
        "readValueFromPointer": simpleReadValueFromPointer,
        destructorFunction: function(ptr) {
            _free(ptr)
        }
    })
}

function __embind_register_void(rawType, name) {
    name = readLatin1String(name);
    registerType(rawType, {
        isVoid: true,
        name: name,
        "argPackAdvance": 0,
        "fromWireType": function() {
            return undefined
        },
        "toWireType": function(destructors, o) {
            return undefined
        }
    })
}

function __emscripten_date_now() {
    return Date.now()
}
var nowIsMonotonic = true;

function __emscripten_get_now_is_monotonic() {
    return nowIsMonotonic
}

function _emscripten_set_main_loop_timing(mode, value) {
    Browser.mainLoop.timingMode = mode;
    Browser.mainLoop.timingValue = value;
    if (!Browser.mainLoop.func) {
        err("emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.");
        return 1
    }
    if (!Browser.mainLoop.running) {
        Browser.mainLoop.running = true
    }
    if (mode == 0) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
            var timeUntilNextTick = Math.max(0, Browser.mainLoop.tickStartTime + value - _emscripten_get_now()) | 0;
            setTimeout(Browser.mainLoop.runner, timeUntilNextTick)
        };
        Browser.mainLoop.method = "timeout"
    } else if (mode == 1) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
            Browser.requestAnimationFrame(Browser.mainLoop.runner)
        };
        Browser.mainLoop.method = "rAF"
    } else if (mode == 2) {
        if (typeof setImmediate == "undefined") {
            var setImmediates = [];
            var emscriptenMainLoopMessageId = "setimmediate";
            var Browser_setImmediate_messageHandler = event => {
                if (event.data === emscriptenMainLoopMessageId || event.data.target === emscriptenMainLoopMessageId) {
                    event.stopPropagation();
                    setImmediates.shift()()
                }
            };
            addEventListener("message", Browser_setImmediate_messageHandler, true);
            setImmediate = function Browser_emulated_setImmediate(func) {
                setImmediates.push(func);
                if (ENVIRONMENT_IS_WORKER) {
                    if (Module["setImmediates"] === undefined) Module["setImmediates"] = [];
                    Module["setImmediates"].push(func);
                    postMessage({
                        target: emscriptenMainLoopMessageId
                    })
                } else postMessage(emscriptenMainLoopMessageId, "*")
            }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
            setImmediate(Browser.mainLoop.runner)
        };
        Browser.mainLoop.method = "immediate"
    }
    return 0
}
var _emscripten_get_now;
if (ENVIRONMENT_IS_NODE) {
    _emscripten_get_now = () => {
        var t = process["hrtime"]();
        return t[0] * 1e3 + t[1] / 1e6
    }
} else _emscripten_get_now = () => performance.now();

function _proc_exit(code) {
    EXITSTATUS = code;
    if (!keepRuntimeAlive()) {
        if (Module["onExit"]) Module["onExit"](code);
        ABORT = true
    }
    quit_(code, new ExitStatus(code))
}

function exitJS(status, implicit) {
    EXITSTATUS = status;
    checkUnflushedContent();
    if (keepRuntimeAlive() && !implicit) {
        var msg = "program exited (with status: " + status + "), but EXIT_RUNTIME is not set, so halting execution but not exiting the runtime or preventing further async execution (build with EXIT_RUNTIME=1, if you want a true shutdown)";
        err(msg)
    }
    _proc_exit(status)
}
var _exit = exitJS;

function maybeExit() {}

function setMainLoop(browserIterationFunc, fps, simulateInfiniteLoop, arg, noSetTiming) {
    assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
    Browser.mainLoop.func = browserIterationFunc;
    Browser.mainLoop.arg = arg;
    var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;

    function checkIsRunning() {
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) {
            maybeExit();
            return false
        }
        return true
    }
    Browser.mainLoop.running = false;
    Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
            var start = Date.now();
            var blocker = Browser.mainLoop.queue.shift();
            blocker.func(blocker.arg);
            if (Browser.mainLoop.remainingBlockers) {
                var remaining = Browser.mainLoop.remainingBlockers;
                var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
                if (blocker.counted) {
                    Browser.mainLoop.remainingBlockers = next
                } else {
                    next = next + .5;
                    Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9
                }
            }
            out('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
            Browser.mainLoop.updateStatus();
            if (!checkIsRunning()) return;
            setTimeout(Browser.mainLoop.runner, 0);
            return
        }
        if (!checkIsRunning()) return;
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
            Browser.mainLoop.scheduler();
            return
        } else if (Browser.mainLoop.timingMode == 0) {
            Browser.mainLoop.tickStartTime = _emscripten_get_now()
        }
        if (Browser.mainLoop.method === "timeout" && Module.ctx) {
            warnOnce("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");
            Browser.mainLoop.method = ""
        }
        Browser.mainLoop.runIter(browserIterationFunc);
        checkStackCookie();
        if (!checkIsRunning()) return;
        if (typeof SDL == "object" && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
        Browser.mainLoop.scheduler()
    };
    if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps);
        else _emscripten_set_main_loop_timing(1, 1);
        Browser.mainLoop.scheduler()
    }
    if (simulateInfiniteLoop) {
        throw "unwind"
    }
}

function callUserCallback(func) {
    if (ABORT) {
        err("user callback triggered after runtime exited or application aborted.  Ignoring.");
        return
    }
    try {
        func()
    } catch (e) {
        handleException(e)
    }
}

function safeSetTimeout(func, timeout) {
    return setTimeout(function() {
        callUserCallback(func)
    }, timeout)
}
var Browser = {
    mainLoop: {
        running: false,
        scheduler: null,
        method: "",
        currentlyRunningMainloop: 0,
        func: null,
        arg: 0,
        timingMode: 0,
        timingValue: 0,
        currentFrameNumber: 0,
        queue: [],
        pause: function() {
            Browser.mainLoop.scheduler = null;
            Browser.mainLoop.currentlyRunningMainloop++
        },
        resume: function() {
            Browser.mainLoop.currentlyRunningMainloop++;
            var timingMode = Browser.mainLoop.timingMode;
            var timingValue = Browser.mainLoop.timingValue;
            var func = Browser.mainLoop.func;
            Browser.mainLoop.func = null;
            setMainLoop(func, 0, false, Browser.mainLoop.arg, true);
            _emscripten_set_main_loop_timing(timingMode, timingValue);
            Browser.mainLoop.scheduler()
        },
        updateStatus: function() {
            if (Module["setStatus"]) {
                var message = Module["statusMessage"] || "Please wait...";
                var remaining = Browser.mainLoop.remainingBlockers;
                var expected = Browser.mainLoop.expectedBlockers;
                if (remaining) {
                    if (remaining < expected) {
                        Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")")
                    } else {
                        Module["setStatus"](message)
                    }
                } else {
                    Module["setStatus"]("")
                }
            }
        },
        runIter: function(func) {
            if (ABORT) return;
            if (Module["preMainLoop"]) {
                var preRet = Module["preMainLoop"]();
                if (preRet === false) {
                    return
                }
            }
            callUserCallback(func);
            if (Module["postMainLoop"]) Module["postMainLoop"]()
        }
    },
    isFullscreen: false,
    pointerLock: false,
    moduleContextCreatedCallbacks: [],
    workers: [],
    init: function() {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
        if (Browser.initted) return;
        Browser.initted = true;
        try {
            new Blob;
            Browser.hasBlobConstructor = true
        } catch (e) {
            Browser.hasBlobConstructor = false;
            err("warning: no blob constructor, cannot create blobs with mimetypes")
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? err("warning: no BlobBuilder") : null;
        Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject == "undefined") {
            err("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
            Module.noImageDecoding = true
        }
        var imagePlugin = {};
        imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
            return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name)
        };
        imagePlugin["handle"] = function imagePlugin_handle(byteArray, name, onload, onerror) {
            var b = null;
            if (Browser.hasBlobConstructor) {
                try {
                    b = new Blob([byteArray], {
                        type: Browser.getMimetype(name)
                    });
                    if (b.size !== byteArray.length) {
                        b = new Blob([new Uint8Array(byteArray).buffer], {
                            type: Browser.getMimetype(name)
                        })
                    }
                } catch (e) {
                    warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder")
                }
            }
            if (!b) {
                var bb = new Browser.BlobBuilder;
                bb.append(new Uint8Array(byteArray).buffer);
                b = bb.getBlob()
            }
            var url = Browser.URLObject.createObjectURL(b);
            assert(typeof url == "string", "createObjectURL must return a url as a string");
            var img = new Image;
            img.onload = () => {
                assert(img.complete, "Image " + name + " could not be decoded");
                var canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                preloadedImages[name] = canvas;
                Browser.URLObject.revokeObjectURL(url);
                if (onload) onload(byteArray)
            };
            img.onerror = event => {
                out("Image " + url + " could not be decoded");
                if (onerror) onerror()
            };
            img.src = url
        };
        Module["preloadPlugins"].push(imagePlugin);
        var audioPlugin = {};
        audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
            return !Module.noAudioDecoding && name.substr(-4) in {
                ".ogg": 1,
                ".wav": 1,
                ".mp3": 1
            }
        };
        audioPlugin["handle"] = function audioPlugin_handle(byteArray, name, onload, onerror) {
            var done = false;

            function finish(audio) {
                if (done) return;
                done = true;
                preloadedAudios[name] = audio;
                if (onload) onload(byteArray)
            }

            function fail() {
                if (done) return;
                done = true;
                preloadedAudios[name] = new Audio;
                if (onerror) onerror()
            }
            if (Browser.hasBlobConstructor) {
                try {
                    var b = new Blob([byteArray], {
                        type: Browser.getMimetype(name)
                    })
                } catch (e) {
                    return fail()
                }
                var url = Browser.URLObject.createObjectURL(b);
                assert(typeof url == "string", "createObjectURL must return a url as a string");
                var audio = new Audio;
                audio.addEventListener("canplaythrough", () => finish(audio), false);
                audio.onerror = function audio_onerror(event) {
                    if (done) return;
                    err("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");

                    function encode64(data) {
                        var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                        var PAD = "=";
                        var ret = "";
                        var leftchar = 0;
                        var leftbits = 0;
                        for (var i = 0; i < data.length; i++) {
                            leftchar = leftchar << 8 | data[i];
                            leftbits += 8;
                            while (leftbits >= 6) {
                                var curr = leftchar >> leftbits - 6 & 63;
                                leftbits -= 6;
                                ret += BASE[curr]
                            }
                        }
                        if (leftbits == 2) {
                            ret += BASE[(leftchar & 3) << 4];
                            ret += PAD + PAD
                        } else if (leftbits == 4) {
                            ret += BASE[(leftchar & 15) << 2];
                            ret += PAD
                        }
                        return ret
                    }
                    audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
                    finish(audio)
                };
                audio.src = url;
                safeSetTimeout(function() {
                    finish(audio)
                }, 1e4)
            } else {
                return fail()
            }
        };
        Module["preloadPlugins"].push(audioPlugin);

        function pointerLockChange() {
            Browser.pointerLock = document["pointerLockElement"] === Module["canvas"] || document["mozPointerLockElement"] === Module["canvas"] || document["webkitPointerLockElement"] === Module["canvas"] || document["msPointerLockElement"] === Module["canvas"]
        }
        var canvas = Module["canvas"];
        if (canvas) {
            canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || (() => {});
            canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || (() => {});
            canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
            document.addEventListener("pointerlockchange", pointerLockChange, false);
            document.addEventListener("mozpointerlockchange", pointerLockChange, false);
            document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
            document.addEventListener("mspointerlockchange", pointerLockChange, false);
            if (Module["elementPointerLock"]) {
                canvas.addEventListener("click", ev => {
                    if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
                        Module["canvas"].requestPointerLock();
                        ev.preventDefault()
                    }
                }, false)
            }
        }
    },
    handledByPreloadPlugin: function(byteArray, fullname, finish, onerror) {
        Browser.init();
        var handled = false;
        Module["preloadPlugins"].forEach(function(plugin) {
            if (handled) return;
            if (plugin["canHandle"](fullname)) {
                plugin["handle"](byteArray, fullname, finish, onerror);
                handled = true
            }
        });
        return handled
    },
    createContext: function(canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
        var ctx;
        var contextHandle;
        if (useWebGL) {
            var contextAttributes = {
                antialias: false,
                alpha: false,
                majorVersion: 1
            };
            if (webGLContextAttributes) {
                for (var attribute in webGLContextAttributes) {
                    contextAttributes[attribute] = webGLContextAttributes[attribute]
                }
            }
            if (typeof GL != "undefined") {
                contextHandle = GL.createContext(canvas, contextAttributes);
                if (contextHandle) {
                    ctx = GL.getContext(contextHandle).GLctx
                }
            }
        } else {
            ctx = canvas.getContext("2d")
        }
        if (!ctx) return null;
        if (setInModule) {
            if (!useWebGL) assert(typeof GLctx == "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
            Module.ctx = ctx;
            if (useWebGL) GL.makeContextCurrent(contextHandle);
            Module.useWebGL = useWebGL;
            Browser.moduleContextCreatedCallbacks.forEach(function(callback) {
                callback()
            });
            Browser.init()
        }
        return ctx
    },
    destroyContext: function(canvas, useWebGL, setInModule) {},
    fullscreenHandlersInstalled: false,
    lockPointer: undefined,
    resizeCanvas: undefined,
    requestFullscreen: function(lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer == "undefined") Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas == "undefined") Browser.resizeCanvas = false;
        var canvas = Module["canvas"];

        function fullscreenChange() {
            Browser.isFullscreen = false;
            var canvasContainer = canvas.parentNode;
            if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
                canvas.exitFullscreen = Browser.exitFullscreen;
                if (Browser.lockPointer) canvas.requestPointerLock();
                Browser.isFullscreen = true;
                if (Browser.resizeCanvas) {
                    Browser.setFullscreenCanvasSize()
                } else {
                    Browser.updateCanvasDimensions(canvas)
                }
            } else {
                canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
                canvasContainer.parentNode.removeChild(canvasContainer);
                if (Browser.resizeCanvas) {
                    Browser.setWindowedCanvasSize()
                } else {
                    Browser.updateCanvasDimensions(canvas)
                }
            }
            if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullscreen);
            if (Module["onFullscreen"]) Module["onFullscreen"](Browser.isFullscreen)
        }
        if (!Browser.fullscreenHandlersInstalled) {
            Browser.fullscreenHandlersInstalled = true;
            document.addEventListener("fullscreenchange", fullscreenChange, false);
            document.addEventListener("mozfullscreenchange", fullscreenChange, false);
            document.addEventListener("webkitfullscreenchange", fullscreenChange, false);
            document.addEventListener("MSFullscreenChange", fullscreenChange, false)
        }
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        canvasContainer.requestFullscreen = canvasContainer["requestFullscreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullscreen"] ? () => canvasContainer["webkitRequestFullscreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null) || (canvasContainer["webkitRequestFullScreen"] ? () => canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]) : null);
        canvasContainer.requestFullscreen()
    },
    requestFullScreen: function() {
        abort("Module.requestFullScreen has been replaced by Module.requestFullscreen (without a capital S)")
    },
    exitFullscreen: function() {
        if (!Browser.isFullscreen) {
            return false
        }
        var CFS = document["exitFullscreen"] || document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["msExitFullscreen"] || document["webkitCancelFullScreen"] || function() {};
        CFS.apply(document, []);
        return true
    },
    nextRAF: 0,
    fakeRequestAnimationFrame: function(func) {
        var now = Date.now();
        if (Browser.nextRAF === 0) {
            Browser.nextRAF = now + 1e3 / 60
        } else {
            while (now + 2 >= Browser.nextRAF) {
                Browser.nextRAF += 1e3 / 60
            }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay)
    },
    requestAnimationFrame: function(func) {
        if (typeof requestAnimationFrame == "function") {
            requestAnimationFrame(func);
            return
        }
        var RAF = Browser.fakeRequestAnimationFrame;
        RAF(func)
    },
    safeSetTimeout: function(func) {
        return safeSetTimeout(func)
    },
    safeRequestAnimationFrame: function(func) {
        return Browser.requestAnimationFrame(function() {
            callUserCallback(func)
        })
    },
    getMimetype: function(name) {
        return {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "bmp": "image/bmp",
            "ogg": "audio/ogg",
            "wav": "audio/wav",
            "mp3": "audio/mpeg"
        } [name.substr(name.lastIndexOf(".") + 1)]
    },
    getUserMedia: function(func) {
        if (!window.getUserMedia) {
            window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"]
        }
        window.getUserMedia(func)
    },
    getMovementX: function(event) {
        return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0
    },
    getMovementY: function(event) {
        return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0
    },
    getMouseWheelDelta: function(event) {
        var delta = 0;
        switch (event.type) {
            case "DOMMouseScroll":
                delta = event.detail / 3;
                break;
            case "mousewheel":
                delta = event.wheelDelta / 120;
                break;
            case "wheel":
                delta = event.deltaY;
                switch (event.deltaMode) {
                    case 0:
                        delta /= 100;
                        break;
                    case 1:
                        delta /= 3;
                        break;
                    case 2:
                        delta *= 80;
                        break;
                    default:
                        throw "unrecognized mouse wheel delta mode: " + event.deltaMode
                }
                break;
            default:
                throw "unrecognized mouse wheel event: " + event.type
        }
        return delta
    },
    mouseX: 0,
    mouseY: 0,
    mouseMovementX: 0,
    mouseMovementY: 0,
    touches: {},
    lastTouches: {},
    calculateMouseEvent: function(event) {
        if (Browser.pointerLock) {
            if (event.type != "mousemove" && "mozMovementX" in event) {
                Browser.mouseMovementX = Browser.mouseMovementY = 0
            } else {
                Browser.mouseMovementX = Browser.getMovementX(event);
                Browser.mouseMovementY = Browser.getMovementY(event)
            }
            if (typeof SDL != "undefined") {
                Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
                Browser.mouseY = SDL.mouseY + Browser.mouseMovementY
            } else {
                Browser.mouseX += Browser.mouseMovementX;
                Browser.mouseY += Browser.mouseMovementY
            }
        } else {
            var rect = Module["canvas"].getBoundingClientRect();
            var cw = Module["canvas"].width;
            var ch = Module["canvas"].height;
            var scrollX = typeof window.scrollX != "undefined" ? window.scrollX : window.pageXOffset;
            var scrollY = typeof window.scrollY != "undefined" ? window.scrollY : window.pageYOffset;
            assert(typeof scrollX != "undefined" && typeof scrollY != "undefined", "Unable to retrieve scroll position, mouse positions likely broken.");
            if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
                var touch = event.touch;
                if (touch === undefined) {
                    return
                }
                var adjustedX = touch.pageX - (scrollX + rect.left);
                var adjustedY = touch.pageY - (scrollY + rect.top);
                adjustedX = adjustedX * (cw / rect.width);
                adjustedY = adjustedY * (ch / rect.height);
                var coords = {
                    x: adjustedX,
                    y: adjustedY
                };
                if (event.type === "touchstart") {
                    Browser.lastTouches[touch.identifier] = coords;
                    Browser.touches[touch.identifier] = coords
                } else if (event.type === "touchend" || event.type === "touchmove") {
                    var last = Browser.touches[touch.identifier];
                    if (!last) last = coords;
                    Browser.lastTouches[touch.identifier] = last;
                    Browser.touches[touch.identifier] = coords
                }
                return
            }
            var x = event.pageX - (scrollX + rect.left);
            var y = event.pageY - (scrollY + rect.top);
            x = x * (cw / rect.width);
            y = y * (ch / rect.height);
            Browser.mouseMovementX = x - Browser.mouseX;
            Browser.mouseMovementY = y - Browser.mouseY;
            Browser.mouseX = x;
            Browser.mouseY = y
        }
    },
    resizeListeners: [],
    updateResizeListeners: function() {
        var canvas = Module["canvas"];
        Browser.resizeListeners.forEach(function(listener) {
            listener(canvas.width, canvas.height)
        })
    },
    setCanvasSize: function(width, height, noUpdates) {
        var canvas = Module["canvas"];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners()
    },
    windowedWidth: 0,
    windowedHeight: 0,
    setFullscreenCanvasSize: function() {
        if (typeof SDL != "undefined") {
            var flags = HEAPU32[SDL.screen >> 2];
            flags = flags | 8388608;
            HEAP32[SDL.screen >> 2] = flags
        }
        Browser.updateCanvasDimensions(Module["canvas"]);
        Browser.updateResizeListeners()
    },
    setWindowedCanvasSize: function() {
        if (typeof SDL != "undefined") {
            var flags = HEAPU32[SDL.screen >> 2];
            flags = flags & ~8388608;
            HEAP32[SDL.screen >> 2] = flags
        }
        Browser.updateCanvasDimensions(Module["canvas"]);
        Browser.updateResizeListeners()
    },
    updateCanvasDimensions: function(canvas, wNative, hNative) {
        if (wNative && hNative) {
            canvas.widthNative = wNative;
            canvas.heightNative = hNative
        } else {
            wNative = canvas.widthNative;
            hNative = canvas.heightNative
        }
        var w = wNative;
        var h = hNative;
        if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
            if (w / h < Module["forcedAspectRatio"]) {
                w = Math.round(h * Module["forcedAspectRatio"])
            } else {
                h = Math.round(w / Module["forcedAspectRatio"])
            }
        }
        if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode && typeof screen != "undefined") {
            var factor = Math.min(screen.width / w, screen.height / h);
            w = Math.round(w * factor);
            h = Math.round(h * factor)
        }
        if (Browser.resizeCanvas) {
            if (canvas.width != w) canvas.width = w;
            if (canvas.height != h) canvas.height = h;
            if (typeof canvas.style != "undefined") {
                canvas.style.removeProperty("width");
                canvas.style.removeProperty("height")
            }
        } else {
            if (canvas.width != wNative) canvas.width = wNative;
            if (canvas.height != hNative) canvas.height = hNative;
            if (typeof canvas.style != "undefined") {
                if (w != wNative || h != hNative) {
                    canvas.style.setProperty("width", w + "px", "important");
                    canvas.style.setProperty("height", h + "px", "important")
                } else {
                    canvas.style.removeProperty("width");
                    canvas.style.removeProperty("height")
                }
            }
        }
    }
};

function __emscripten_push_uncounted_main_loop_blocker(func, arg, name) {
    Browser.mainLoop.queue.push({
        func: function() {
            (function(a1) {
                dynCall_vi.apply(null, [func, a1])
            })(arg)
        },
        name: UTF8ToString(name),
        counted: false
    });
    Browser.mainLoop.updateStatus()
}

function __emscripten_throw_longjmp() {
    throw Infinity
}

function getTypeName(type) {
    var ptr = ___getTypeName(type);
    var rv = readLatin1String(ptr);
    _free(ptr);
    return rv
}

function requireRegisteredType(rawType, humanName) {
    var impl = registeredTypes[rawType];
    if (undefined === impl) {
        throwBindingError(humanName + " has unknown type " + getTypeName(rawType))
    }
    return impl
}

function __emval_as(handle, returnType, destructorsRef) {
    handle = Emval.toValue(handle);
    returnType = requireRegisteredType(returnType, "emval::as");
    var destructors = [];
    var rd = Emval.toHandle(destructors);
    HEAPU32[destructorsRef >> 2] = rd;
    return returnType["toWireType"](destructors, handle)
}

function emval_lookupTypes(argCount, argTypes) {
    var a = new Array(argCount);
    for (var i = 0; i < argCount; ++i) {
        a[i] = requireRegisteredType(HEAPU32[argTypes + i * POINTER_SIZE >> 2], "parameter " + i)
    }
    return a
}

function __emval_call(handle, argCount, argTypes, argv) {
    handle = Emval.toValue(handle);
    var types = emval_lookupTypes(argCount, argTypes);
    var args = new Array(argCount);
    for (var i = 0; i < argCount; ++i) {
        var type = types[i];
        args[i] = type["readValueFromPointer"](argv);
        argv += type["argPackAdvance"]
    }
    var rv = handle.apply(undefined, args);
    return Emval.toHandle(rv)
}

function emval_allocateDestructors(destructorsRef) {
    var destructors = [];
    HEAPU32[destructorsRef >> 2] = Emval.toHandle(destructors);
    return destructors
}
var emval_symbols = {};

function getStringOrSymbol(address) {
    var symbol = emval_symbols[address];
    if (symbol === undefined) {
        return readLatin1String(address)
    }
    return symbol
}
var emval_methodCallers = [];

function __emval_call_method(caller, handle, methodName, destructorsRef, args) {
    caller = emval_methodCallers[caller];
    handle = Emval.toValue(handle);
    methodName = getStringOrSymbol(methodName);
    return caller(handle, methodName, emval_allocateDestructors(destructorsRef), args)
}

function __emval_call_void_method(caller, handle, methodName, args) {
    caller = emval_methodCallers[caller];
    handle = Emval.toValue(handle);
    methodName = getStringOrSymbol(methodName);
    caller(handle, methodName, null, args)
}

function __emval_equals(first, second) {
    first = Emval.toValue(first);
    second = Emval.toValue(second);
    return first == second
}

function emval_get_global() {
    if (typeof globalThis == "object") {
        return globalThis
    }
    return function() {
        return Function
    }()("return this")()
}

function __emval_get_global(name) {
    if (name === 0) {
        return Emval.toHandle(emval_get_global())
    } else {
        name = getStringOrSymbol(name);
        return Emval.toHandle(emval_get_global()[name])
    }
}

function emval_addMethodCaller(caller) {
    var id = emval_methodCallers.length;
    emval_methodCallers.push(caller);
    return id
}

function new_(constructor, argumentList) {
    if (!(constructor instanceof Function)) {
        throw new TypeError("new_ called with constructor type " + typeof constructor + " which is not a function")
    }
    var dummy = createNamedFunction(constructor.name || "unknownFunctionName", function() {});
    dummy.prototype = constructor.prototype;
    var obj = new dummy;
    var r = constructor.apply(obj, argumentList);
    return r instanceof Object ? r : obj
}
var emval_registeredMethods = [];

function __emval_get_method_caller(argCount, argTypes) {
    var types = emval_lookupTypes(argCount, argTypes);
    var retType = types[0];
    var signatureName = retType.name + "_$" + types.slice(1).map(function(t) {
        return t.name
    }).join("_") + "$";
    var returnId = emval_registeredMethods[signatureName];
    if (returnId !== undefined) {
        return returnId
    }
    var params = ["retType"];
    var args = [retType];
    var argsList = "";
    for (var i = 0; i < argCount - 1; ++i) {
        argsList += (i !== 0 ? ", " : "") + "arg" + i;
        params.push("argType" + i);
        args.push(types[1 + i])
    }
    var functionName = makeLegalFunctionName("methodCaller_" + signatureName);
    var functionBody = "return function " + functionName + "(handle, name, destructors, args) {\n";
    var offset = 0;
    for (var i = 0; i < argCount - 1; ++i) {
        functionBody += "    var arg" + i + " = argType" + i + ".readValueFromPointer(args" + (offset ? "+" + offset : "") + ");\n";
        offset += types[i + 1]["argPackAdvance"]
    }
    functionBody += "    var rv = handle[name](" + argsList + ");\n";
    for (var i = 0; i < argCount - 1; ++i) {
        if (types[i + 1]["deleteObject"]) {
            functionBody += "    argType" + i + ".deleteObject(arg" + i + ");\n"
        }
    }
    if (!retType.isVoid) {
        functionBody += "    return retType.toWireType(destructors, rv);\n"
    }
    functionBody += "};\n";
    params.push(functionBody);
    var invokerFunction = new_(Function, params).apply(null, args);
    returnId = emval_addMethodCaller(invokerFunction);
    emval_registeredMethods[signatureName] = returnId;
    return returnId
}

function __emval_get_property(handle, key) {
    handle = Emval.toValue(handle);
    key = Emval.toValue(key);
    return Emval.toHandle(handle[key])
}

function __emval_incref(handle) {
    if (handle > 4) {
        emval_handle_array[handle].refcount += 1
    }
}

function __emval_new_cstring(v) {
    return Emval.toHandle(getStringOrSymbol(v))
}

function runDestructors(destructors) {
    while (destructors.length) {
        var ptr = destructors.pop();
        var del = destructors.pop();
        del(ptr)
    }
}

function __emval_run_destructors(handle) {
    var destructors = Emval.toValue(handle);
    runDestructors(destructors);
    __emval_decref(handle)
}

function __emval_set_property(handle, key, value) {
    handle = Emval.toValue(handle);
    key = Emval.toValue(key);
    value = Emval.toValue(value);
    handle[key] = value
}

function __emval_take_value(type, arg) {
    type = requireRegisteredType(type, "_emval_take_value");
    var v = type["readValueFromPointer"](arg);
    return Emval.toHandle(v)
}

function _abort() {
    abort("native code called abort()")
}
var readAsmConstArgsArray = [];

function readAsmConstArgs(sigPtr, buf) {
    assert(Array.isArray(readAsmConstArgsArray));
    assert(buf % 16 == 0);
    readAsmConstArgsArray.length = 0;
    var ch;
    buf >>= 2;
    while (ch = HEAPU8[sigPtr++]) {
        var chr = String.fromCharCode(ch);
        var validChars = ["d", "f", "i"];
        assert(validChars.includes(chr), "Invalid character " + ch + '("' + chr + '") in readAsmConstArgs! Use only [' + validChars + '], and do not specify "v" for void return argument.');
        buf += ch != 105 & buf;
        readAsmConstArgsArray.push(ch == 105 ? HEAP32[buf] : HEAPF64[buf++ >> 1]);
        ++buf
    }
    return readAsmConstArgsArray
}

function _emscripten_asm_const_int(code, sigPtr, argbuf) {
    var args = readAsmConstArgs(sigPtr, argbuf);
    if (!ASM_CONSTS.hasOwnProperty(code)) abort("No EM_ASM constant found at address " + code);
    return ASM_CONSTS[code].apply(null, args)
}

function _emscripten_async_call(func, arg, millis) {
    function wrapper() {
        (function(a1) {
            dynCall_vi.apply(null, [func, a1])
        })(arg)
    }
    if (millis >= 0 || ENVIRONMENT_IS_NODE) {
        safeSetTimeout(wrapper, millis)
    } else {
        Browser.safeRequestAnimationFrame(wrapper)
    }
}
var JSEvents = {
    inEventHandler: 0,
    removeAllEventListeners: function() {
        for (var i = JSEvents.eventHandlers.length - 1; i >= 0; --i) {
            JSEvents._removeHandler(i)
        }
        JSEvents.eventHandlers = [];
        JSEvents.deferredCalls = []
    },
    registerRemoveEventListeners: function() {
        if (!JSEvents.removeEventListenersRegistered) {
            __ATEXIT__.push(JSEvents.removeAllEventListeners);
            JSEvents.removeEventListenersRegistered = true
        }
    },
    deferredCalls: [],
    deferCall: function(targetFunction, precedence, argsList) {
        function arraysHaveEqualContent(arrA, arrB) {
            if (arrA.length != arrB.length) return false;
            for (var i in arrA) {
                if (arrA[i] != arrB[i]) return false
            }
            return true
        }
        for (var i in JSEvents.deferredCalls) {
            var call = JSEvents.deferredCalls[i];
            if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
                return
            }
        }
        JSEvents.deferredCalls.push({
            targetFunction: targetFunction,
            precedence: precedence,
            argsList: argsList
        });
        JSEvents.deferredCalls.sort(function(x, y) {
            return x.precedence < y.precedence
        })
    },
    removeDeferredCalls: function(targetFunction) {
        for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
            if (JSEvents.deferredCalls[i].targetFunction == targetFunction) {
                JSEvents.deferredCalls.splice(i, 1);
                --i
            }
        }
    },
    canPerformEventHandlerRequests: function() {
        return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls
    },
    runDeferredCalls: function() {
        if (!JSEvents.canPerformEventHandlerRequests()) {
            return
        }
        for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
            var call = JSEvents.deferredCalls[i];
            JSEvents.deferredCalls.splice(i, 1);
            --i;
            call.targetFunction.apply(null, call.argsList)
        }
    },
    eventHandlers: [],
    removeAllHandlersOnTarget: function(target, eventTypeString) {
        for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
            if (JSEvents.eventHandlers[i].target == target && (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
                JSEvents._removeHandler(i--)
            }
        }
    },
    _removeHandler: function(i) {
        var h = JSEvents.eventHandlers[i];
        h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
        JSEvents.eventHandlers.splice(i, 1)
    },
    registerOrRemoveHandler: function(eventHandler) {
        var jsEventHandler = function jsEventHandler(event) {
            ++JSEvents.inEventHandler;
            JSEvents.currentEventHandler = eventHandler;
            JSEvents.runDeferredCalls();
            eventHandler.handlerFunc(event);
            JSEvents.runDeferredCalls();
            --JSEvents.inEventHandler
        };
        if (eventHandler.callbackfunc) {
            eventHandler.eventListenerFunc = jsEventHandler;
            eventHandler.target.addEventListener(eventHandler.eventTypeString, jsEventHandler, eventHandler.useCapture);
            JSEvents.eventHandlers.push(eventHandler);
            JSEvents.registerRemoveEventListeners()
        } else {
            for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
                if (JSEvents.eventHandlers[i].target == eventHandler.target && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
                    JSEvents._removeHandler(i--)
                }
            }
        }
    },
    getNodeNameForTarget: function(target) {
        if (!target) return "";
        if (target == window) return "#window";
        if (target == screen) return "#screen";
        return target && target.nodeName ? target.nodeName : ""
    },
    fullscreenEnabled: function() {
        return document.fullscreenEnabled || document.webkitFullscreenEnabled
    }
};
var currentFullscreenStrategy = {};

function maybeCStringToJsString(cString) {
    return cString > 2 ? UTF8ToString(cString) : cString
}
var specialHTMLTargets = [0, typeof document != "undefined" ? document : 0, typeof window != "undefined" ? window : 0];

function findEventTarget(target) {
    target = maybeCStringToJsString(target);
    var domElement = specialHTMLTargets[target] || (typeof document != "undefined" ? document.querySelector(target) : undefined);
    return domElement
}

function findCanvasEventTarget(target) {
    return findEventTarget(target)
}

function _emscripten_get_canvas_element_size(target, width, height) {
    var canvas = findCanvasEventTarget(target);
    if (!canvas) return -4;
    HEAP32[width >> 2] = canvas.width;
    HEAP32[height >> 2] = canvas.height
}

function getCanvasElementSize(target) {
    return withStackSave(function() {
        var w = stackAlloc(8);
        var h = w + 4;
        var targetInt = stackAlloc(target.id.length + 1);
        stringToUTF8(target.id, targetInt, target.id.length + 1);
        var ret = _emscripten_get_canvas_element_size(targetInt, w, h);
        var size = [HEAP32[w >> 2], HEAP32[h >> 2]];
        return size
    })
}

function _emscripten_set_canvas_element_size(target, width, height) {
    var canvas = findCanvasEventTarget(target);
    if (!canvas) return -4;
    canvas.width = width;
    canvas.height = height;
    return 0
}

function setCanvasElementSize(target, width, height) {
    if (!target.controlTransferredOffscreen) {
        target.width = width;
        target.height = height
    } else {
        withStackSave(function() {
            var targetInt = stackAlloc(target.id.length + 1);
            stringToUTF8(target.id, targetInt, target.id.length + 1);
            _emscripten_set_canvas_element_size(targetInt, width, height)
        })
    }
}

function registerRestoreOldStyle(canvas) {
    var canvasSize = getCanvasElementSize(canvas);
    var oldWidth = canvasSize[0];
    var oldHeight = canvasSize[1];
    var oldCssWidth = canvas.style.width;
    var oldCssHeight = canvas.style.height;
    var oldBackgroundColor = canvas.style.backgroundColor;
    var oldDocumentBackgroundColor = document.body.style.backgroundColor;
    var oldPaddingLeft = canvas.style.paddingLeft;
    var oldPaddingRight = canvas.style.paddingRight;
    var oldPaddingTop = canvas.style.paddingTop;
    var oldPaddingBottom = canvas.style.paddingBottom;
    var oldMarginLeft = canvas.style.marginLeft;
    var oldMarginRight = canvas.style.marginRight;
    var oldMarginTop = canvas.style.marginTop;
    var oldMarginBottom = canvas.style.marginBottom;
    var oldDocumentBodyMargin = document.body.style.margin;
    var oldDocumentOverflow = document.documentElement.style.overflow;
    var oldDocumentScroll = document.body.scroll;
    var oldImageRendering = canvas.style.imageRendering;

    function restoreOldStyle() {
        var fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
        if (!fullscreenElement) {
            document.removeEventListener("fullscreenchange", restoreOldStyle);
            document.removeEventListener("webkitfullscreenchange", restoreOldStyle);
            setCanvasElementSize(canvas, oldWidth, oldHeight);
            canvas.style.width = oldCssWidth;
            canvas.style.height = oldCssHeight;
            canvas.style.backgroundColor = oldBackgroundColor;
            if (!oldDocumentBackgroundColor) document.body.style.backgroundColor = "white";
            document.body.style.backgroundColor = oldDocumentBackgroundColor;
            canvas.style.paddingLeft = oldPaddingLeft;
            canvas.style.paddingRight = oldPaddingRight;
            canvas.style.paddingTop = oldPaddingTop;
            canvas.style.paddingBottom = oldPaddingBottom;
            canvas.style.marginLeft = oldMarginLeft;
            canvas.style.marginRight = oldMarginRight;
            canvas.style.marginTop = oldMarginTop;
            canvas.style.marginBottom = oldMarginBottom;
            document.body.style.margin = oldDocumentBodyMargin;
            document.documentElement.style.overflow = oldDocumentOverflow;
            document.body.scroll = oldDocumentScroll;
            canvas.style.imageRendering = oldImageRendering;
            if (canvas.GLctxObject) canvas.GLctxObject.GLctx.viewport(0, 0, oldWidth, oldHeight);
            if (currentFullscreenStrategy.canvasResizedCallback) {
                (function(a1, a2, a3) {
                    return dynCall_iiii.apply(null, [currentFullscreenStrategy.canvasResizedCallback, a1, a2, a3])
                })(37, 0, currentFullscreenStrategy.canvasResizedCallbackUserData)
            }
        }
    }
    document.addEventListener("fullscreenchange", restoreOldStyle);
    document.addEventListener("webkitfullscreenchange", restoreOldStyle);
    return restoreOldStyle
}

function setLetterbox(element, topBottom, leftRight) {
    element.style.paddingLeft = element.style.paddingRight = leftRight + "px";
    element.style.paddingTop = element.style.paddingBottom = topBottom + "px"
}

function getBoundingClientRect(e) {
    return specialHTMLTargets.indexOf(e) < 0 ? e.getBoundingClientRect() : {
        "left": 0,
        "top": 0
    }
}

function JSEvents_resizeCanvasForFullscreen(target, strategy) {
    var restoreOldStyle = registerRestoreOldStyle(target);
    var cssWidth = strategy.softFullscreen ? innerWidth : screen.width;
    var cssHeight = strategy.softFullscreen ? innerHeight : screen.height;
    var rect = getBoundingClientRect(target);
    var windowedCssWidth = rect.width;
    var windowedCssHeight = rect.height;
    var canvasSize = getCanvasElementSize(target);
    var windowedRttWidth = canvasSize[0];
    var windowedRttHeight = canvasSize[1];
    if (strategy.scaleMode == 3) {
        setLetterbox(target, (cssHeight - windowedCssHeight) / 2, (cssWidth - windowedCssWidth) / 2);
        cssWidth = windowedCssWidth;
        cssHeight = windowedCssHeight
    } else if (strategy.scaleMode == 2) {
        if (cssWidth * windowedRttHeight < windowedRttWidth * cssHeight) {
            var desiredCssHeight = windowedRttHeight * cssWidth / windowedRttWidth;
            setLetterbox(target, (cssHeight - desiredCssHeight) / 2, 0);
            cssHeight = desiredCssHeight
        } else {
            var desiredCssWidth = windowedRttWidth * cssHeight / windowedRttHeight;
            setLetterbox(target, 0, (cssWidth - desiredCssWidth) / 2);
            cssWidth = desiredCssWidth
        }
    }
    if (!target.style.backgroundColor) target.style.backgroundColor = "black";
    if (!document.body.style.backgroundColor) document.body.style.backgroundColor = "black";
    target.style.width = cssWidth + "px";
    target.style.height = cssHeight + "px";
    if (strategy.filteringMode == 1) {
        target.style.imageRendering = "optimizeSpeed";
        target.style.imageRendering = "-moz-crisp-edges";
        target.style.imageRendering = "-o-crisp-edges";
        target.style.imageRendering = "-webkit-optimize-contrast";
        target.style.imageRendering = "optimize-contrast";
        target.style.imageRendering = "crisp-edges";
        target.style.imageRendering = "pixelated"
    }
    var dpiScale = strategy.canvasResolutionScaleMode == 2 ? devicePixelRatio : 1;
    if (strategy.canvasResolutionScaleMode != 0) {
        var newWidth = cssWidth * dpiScale | 0;
        var newHeight = cssHeight * dpiScale | 0;
        setCanvasElementSize(target, newWidth, newHeight);
        if (target.GLctxObject) target.GLctxObject.GLctx.viewport(0, 0, newWidth, newHeight)
    }
    return restoreOldStyle
}

function JSEvents_requestFullscreen(target, strategy) {
    if (strategy.scaleMode != 0 || strategy.canvasResolutionScaleMode != 0) {
        JSEvents_resizeCanvasForFullscreen(target, strategy)
    }
    if (target.requestFullscreen) {
        target.requestFullscreen()
    } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
    } else {
        return JSEvents.fullscreenEnabled() ? -3 : -1
    }
    currentFullscreenStrategy = strategy;
    if (strategy.canvasResizedCallback) {
        (function(a1, a2, a3) {
            return dynCall_iiii.apply(null, [strategy.canvasResizedCallback, a1, a2, a3])
        })(37, 0, strategy.canvasResizedCallbackUserData)
    }
    return 0
}

function _emscripten_exit_fullscreen() {
    if (!JSEvents.fullscreenEnabled()) return -1;
    JSEvents.removeDeferredCalls(JSEvents_requestFullscreen);
    var d = specialHTMLTargets[1];
    if (d.exitFullscreen) {
        d.fullscreenElement && d.exitFullscreen()
    } else if (d.webkitExitFullscreen) {
        d.webkitFullscreenElement && d.webkitExitFullscreen()
    } else {
        return -1
    }
    return 0
}

function _emscripten_get_device_pixel_ratio() {
    return typeof devicePixelRatio == "number" && devicePixelRatio || 1
}

function _emscripten_get_element_css_size(target, width, height) {
    target = findEventTarget(target);
    if (!target) return -4;
    var rect = getBoundingClientRect(target);
    HEAPF64[width >> 3] = rect.width;
    HEAPF64[height >> 3] = rect.height;
    return 0
}

function fillFullscreenChangeEventData(eventStruct) {
    var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    var isFullscreen = !!fullscreenElement;
    HEAP32[eventStruct >> 2] = isFullscreen;
    HEAP32[eventStruct + 4 >> 2] = JSEvents.fullscreenEnabled();
    var reportedElement = isFullscreen ? fullscreenElement : JSEvents.previousFullscreenElement;
    var nodeName = JSEvents.getNodeNameForTarget(reportedElement);
    var id = reportedElement && reportedElement.id ? reportedElement.id : "";
    stringToUTF8(nodeName, eventStruct + 8, 128);
    stringToUTF8(id, eventStruct + 136, 128);
    HEAP32[eventStruct + 264 >> 2] = reportedElement ? reportedElement.clientWidth : 0;
    HEAP32[eventStruct + 268 >> 2] = reportedElement ? reportedElement.clientHeight : 0;
    HEAP32[eventStruct + 272 >> 2] = screen.width;
    HEAP32[eventStruct + 276 >> 2] = screen.height;
    if (isFullscreen) {
        JSEvents.previousFullscreenElement = fullscreenElement
    }
}

function _emscripten_get_fullscreen_status(fullscreenStatus) {
    if (!JSEvents.fullscreenEnabled()) return -1;
    fillFullscreenChangeEventData(fullscreenStatus);
    return 0
}

function _emscripten_get_mouse_status(mouseState) {
    if (!JSEvents.mouseEvent) return -7;
    HEAP8.set(HEAP8.subarray(JSEvents.mouseEvent, JSEvents.mouseEvent + 72), mouseState);
    return 0
}

function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.copyWithin(dest, src, src + num)
}

function doRequestFullscreen(target, strategy) {
    if (!JSEvents.fullscreenEnabled()) return -1;
    target = findEventTarget(target);
    if (!target) return -4;
    if (!target.requestFullscreen && !target.webkitRequestFullscreen) {
        return -3
    }
    var canPerformRequests = JSEvents.canPerformEventHandlerRequests();
    if (!canPerformRequests) {
        if (strategy.deferUntilInEventHandler) {
            JSEvents.deferCall(JSEvents_requestFullscreen, 1, [target, strategy]);
            return 1
        }
        return -2
    }
    return JSEvents_requestFullscreen(target, strategy)
}

function _emscripten_request_fullscreen_strategy(target, deferUntilInEventHandler, fullscreenStrategy) {
    var strategy = {
        scaleMode: HEAP32[fullscreenStrategy >> 2],
        canvasResolutionScaleMode: HEAP32[fullscreenStrategy + 4 >> 2],
        filteringMode: HEAP32[fullscreenStrategy + 8 >> 2],
        deferUntilInEventHandler: deferUntilInEventHandler,
        canvasResizedCallback: HEAP32[fullscreenStrategy + 12 >> 2],
        canvasResizedCallbackUserData: HEAP32[fullscreenStrategy + 16 >> 2]
    };
    return doRequestFullscreen(target, strategy)
}

function getHeapMax() {
    return 2147483648
}

function emscripten_realloc_buffer(size) {
    try {
        wasmMemory.grow(size - buffer.byteLength + 65535 >>> 16);
        updateGlobalBufferAndViews(wasmMemory.buffer);
        return 1
    } catch (e) {
        err("emscripten_realloc_buffer: Attempted to grow heap from " + buffer.byteLength + " bytes to " + size + " bytes, but got error: " + e)
    }
}

function _emscripten_resize_heap(requestedSize) {
    var oldSize = HEAPU8.length;
    requestedSize = requestedSize >>> 0;
    assert(requestedSize > oldSize);
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) {
        err("Cannot enlarge memory, asked to go up to " + requestedSize + " bytes, but the limit is " + maxHeapSize + " bytes!");
        return false
    }
    let alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + .2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
            return true
        }
    }
    err("Failed to grow the heap from " + oldSize + " bytes to " + newSize + " bytes, not enough memory!");
    return false
}

function fillMouseEventData(eventStruct, e, target) {
    assert(eventStruct % 4 == 0);
    HEAPF64[eventStruct >> 3] = e.timeStamp;
    var idx = eventStruct >> 2;
    HEAP32[idx + 2] = e.screenX;
    HEAP32[idx + 3] = e.screenY;
    HEAP32[idx + 4] = e.clientX;
    HEAP32[idx + 5] = e.clientY;
    HEAP32[idx + 6] = e.ctrlKey;
    HEAP32[idx + 7] = e.shiftKey;
    HEAP32[idx + 8] = e.altKey;
    HEAP32[idx + 9] = e.metaKey;
    HEAP16[idx * 2 + 20] = e.button;
    HEAP16[idx * 2 + 21] = e.buttons;
    HEAP32[idx + 11] = e["movementX"];
    HEAP32[idx + 12] = e["movementY"];
    var rect = getBoundingClientRect(target);
    HEAP32[idx + 13] = e.clientX - rect.left;
    HEAP32[idx + 14] = e.clientY - rect.top
}

function registerMouseEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
    if (!JSEvents.mouseEvent) JSEvents.mouseEvent = _malloc(72);
    target = findEventTarget(target);
    var mouseEventHandlerFunc = function(ev) {
        var e = ev || event;
        fillMouseEventData(JSEvents.mouseEvent, e, target);
        if (function(a1, a2, a3) {
                return dynCall_iiii.apply(null, [callbackfunc, a1, a2, a3])
            }(eventTypeId, JSEvents.mouseEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: target,
        allowsDeferredCalls: eventTypeString != "mousemove" && eventTypeString != "mouseenter" && eventTypeString != "mouseleave",
        eventTypeString: eventTypeString,
        callbackfunc: callbackfunc,
        handlerFunc: mouseEventHandlerFunc,
        useCapture: useCapture
    };
    JSEvents.registerOrRemoveHandler(eventHandler)
}

function _emscripten_set_click_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerMouseEventCallback(target, userData, useCapture, callbackfunc, 4, "click", targetThread);
    return 0
}

function _emscripten_set_dblclick_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerMouseEventCallback(target, userData, useCapture, callbackfunc, 7, "dblclick", targetThread);
    return 0
}

function registerKeyEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
    if (!JSEvents.keyEvent) JSEvents.keyEvent = _malloc(176);
    var keyEventHandlerFunc = function(e) {
        assert(e);
        var keyEventData = JSEvents.keyEvent;
        HEAPF64[keyEventData >> 3] = e.timeStamp;
        var idx = keyEventData >> 2;
        HEAP32[idx + 2] = e.location;
        HEAP32[idx + 3] = e.ctrlKey;
        HEAP32[idx + 4] = e.shiftKey;
        HEAP32[idx + 5] = e.altKey;
        HEAP32[idx + 6] = e.metaKey;
        HEAP32[idx + 7] = e.repeat;
        HEAP32[idx + 8] = e.charCode;
        HEAP32[idx + 9] = e.keyCode;
        HEAP32[idx + 10] = e.which;
        stringToUTF8(e.key || "", keyEventData + 44, 32);
        stringToUTF8(e.code || "", keyEventData + 76, 32);
        stringToUTF8(e.char || "", keyEventData + 108, 32);
        stringToUTF8(e.locale || "", keyEventData + 140, 32);
        if (function(a1, a2, a3) {
                return dynCall_iiii.apply(null, [callbackfunc, a1, a2, a3])
            }(eventTypeId, keyEventData, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: findEventTarget(target),
        allowsDeferredCalls: true,
        eventTypeString: eventTypeString,
        callbackfunc: callbackfunc,
        handlerFunc: keyEventHandlerFunc,
        useCapture: useCapture
    };
    JSEvents.registerOrRemoveHandler(eventHandler)
}

function _emscripten_set_keydown_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerKeyEventCallback(target, userData, useCapture, callbackfunc, 2, "keydown", targetThread);
    return 0
}

function _emscripten_set_keyup_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerKeyEventCallback(target, userData, useCapture, callbackfunc, 3, "keyup", targetThread);
    return 0
}

function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop) {
    var browserIterationFunc = function() {
        dynCall_v.call(null, func)
    };
    setMainLoop(browserIterationFunc, fps, simulateInfiniteLoop)
}

function _emscripten_set_mousedown_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerMouseEventCallback(target, userData, useCapture, callbackfunc, 5, "mousedown", targetThread);
    return 0
}

function _emscripten_set_mouseleave_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerMouseEventCallback(target, userData, useCapture, callbackfunc, 34, "mouseleave", targetThread);
    return 0
}

function _emscripten_set_mousemove_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerMouseEventCallback(target, userData, useCapture, callbackfunc, 8, "mousemove", targetThread);
    return 0
}

function _emscripten_set_mouseup_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerMouseEventCallback(target, userData, useCapture, callbackfunc, 6, "mouseup", targetThread);
    return 0
}

function registerUiEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
    if (!JSEvents.uiEvent) JSEvents.uiEvent = _malloc(36);
    target = findEventTarget(target);
    var uiEventHandlerFunc = function(ev) {
        var e = ev || event;
        if (e.target != target) {
            return
        }
        var b = document.body;
        if (!b) {
            return
        }
        var uiEvent = JSEvents.uiEvent;
        HEAP32[uiEvent >> 2] = e.detail;
        HEAP32[uiEvent + 4 >> 2] = b.clientWidth;
        HEAP32[uiEvent + 8 >> 2] = b.clientHeight;
        HEAP32[uiEvent + 12 >> 2] = innerWidth;
        HEAP32[uiEvent + 16 >> 2] = innerHeight;
        HEAP32[uiEvent + 20 >> 2] = outerWidth;
        HEAP32[uiEvent + 24 >> 2] = outerHeight;
        HEAP32[uiEvent + 28 >> 2] = pageXOffset;
        HEAP32[uiEvent + 32 >> 2] = pageYOffset;
        if (function(a1, a2, a3) {
                return dynCall_iiii.apply(null, [callbackfunc, a1, a2, a3])
            }(eventTypeId, uiEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: target,
        eventTypeString: eventTypeString,
        callbackfunc: callbackfunc,
        handlerFunc: uiEventHandlerFunc,
        useCapture: useCapture
    };
    JSEvents.registerOrRemoveHandler(eventHandler)
}

function _emscripten_set_resize_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    registerUiEventCallback(target, userData, useCapture, callbackfunc, 10, "resize", targetThread);
    return 0
}

function __registerWebGlEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
    var webGlEventHandlerFunc = function(ev) {
        var e = ev || event;
        if (function(a1, a2, a3) {
                return dynCall_iiii.apply(null, [callbackfunc, a1, a2, a3])
            }(eventTypeId, 0, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: findEventTarget(target),
        eventTypeString: eventTypeString,
        callbackfunc: callbackfunc,
        handlerFunc: webGlEventHandlerFunc,
        useCapture: useCapture
    };
    JSEvents.registerOrRemoveHandler(eventHandler)
}

function _emscripten_set_webglcontextlost_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    __registerWebGlEventCallback(target, userData, useCapture, callbackfunc, 31, "webglcontextlost", targetThread);
    return 0
}

function _emscripten_set_webglcontextrestored_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    __registerWebGlEventCallback(target, userData, useCapture, callbackfunc, 32, "webglcontextrestored", targetThread);
    return 0
}

function registerWheelEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
    if (!JSEvents.wheelEvent) JSEvents.wheelEvent = _malloc(104);
    var wheelHandlerFunc = function(ev) {
        var e = ev || event;
        var wheelEvent = JSEvents.wheelEvent;
        fillMouseEventData(wheelEvent, e, target);
        HEAPF64[wheelEvent + 72 >> 3] = e["deltaX"];
        HEAPF64[wheelEvent + 80 >> 3] = e["deltaY"];
        HEAPF64[wheelEvent + 88 >> 3] = e["deltaZ"];
        HEAP32[wheelEvent + 96 >> 2] = e["deltaMode"];
        if (function(a1, a2, a3) {
                return dynCall_iiii.apply(null, [callbackfunc, a1, a2, a3])
            }(eventTypeId, wheelEvent, userData)) e.preventDefault()
    };
    var eventHandler = {
        target: target,
        allowsDeferredCalls: true,
        eventTypeString: eventTypeString,
        callbackfunc: callbackfunc,
        handlerFunc: wheelHandlerFunc,
        useCapture: useCapture
    };
    JSEvents.registerOrRemoveHandler(eventHandler)
}

function _emscripten_set_wheel_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
    target = findEventTarget(target);
    if (typeof target.onwheel != "undefined") {
        registerWheelEventCallback(target, userData, useCapture, callbackfunc, 9, "wheel", targetThread);
        return 0
    } else {
        return -1
    }
}

function __webgl_enable_ANGLE_instanced_arrays(ctx) {
    var ext = ctx.getExtension("ANGLE_instanced_arrays");
    if (ext) {
        ctx["vertexAttribDivisor"] = function(index, divisor) {
            ext["vertexAttribDivisorANGLE"](index, divisor)
        };
        ctx["drawArraysInstanced"] = function(mode, first, count, primcount) {
            ext["drawArraysInstancedANGLE"](mode, first, count, primcount)
        };
        ctx["drawElementsInstanced"] = function(mode, count, type, indices, primcount) {
            ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount)
        };
        return 1
    }
}

function __webgl_enable_OES_vertex_array_object(ctx) {
    var ext = ctx.getExtension("OES_vertex_array_object");
    if (ext) {
        ctx["createVertexArray"] = function() {
            return ext["createVertexArrayOES"]()
        };
        ctx["deleteVertexArray"] = function(vao) {
            ext["deleteVertexArrayOES"](vao)
        };
        ctx["bindVertexArray"] = function(vao) {
            ext["bindVertexArrayOES"](vao)
        };
        ctx["isVertexArray"] = function(vao) {
            return ext["isVertexArrayOES"](vao)
        };
        return 1
    }
}

function __webgl_enable_WEBGL_draw_buffers(ctx) {
    var ext = ctx.getExtension("WEBGL_draw_buffers");
    if (ext) {
        ctx["drawBuffers"] = function(n, bufs) {
            ext["drawBuffersWEBGL"](n, bufs)
        };
        return 1
    }
}

function __webgl_enable_WEBGL_multi_draw(ctx) {
    return !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"))
}
var GL = {
    counter: 1,
    buffers: [],
    programs: [],
    framebuffers: [],
    renderbuffers: [],
    textures: [],
    shaders: [],
    vaos: [],
    contexts: [],
    offscreenCanvases: {},
    queries: [],
    stringCache: {},
    unpackAlignment: 4,
    recordError: function recordError(errorCode) {
        if (!GL.lastError) {
            GL.lastError = errorCode
        }
    },
    getNewId: function(table) {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
            table[i] = null
        }
        return ret
    },
    getSource: function(shader, count, string, length) {
        var source = "";
        for (var i = 0; i < count; ++i) {
            var len = length ? HEAP32[length + i * 4 >> 2] : -1;
            source += UTF8ToString(HEAP32[string + i * 4 >> 2], len < 0 ? undefined : len)
        }
        return source
    },
    createContext: function(canvas, webGLContextAttributes) {
        if (!canvas.getContextSafariWebGL2Fixed) {
            canvas.getContextSafariWebGL2Fixed = canvas.getContext;

            function fixedGetContext(ver, attrs) {
                var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
                return ver == "webgl" == gl instanceof WebGLRenderingContext ? gl : null
            }
            canvas.getContext = fixedGetContext
        }
        var ctx = canvas.getContext("webgl", webGLContextAttributes);
        if (!ctx) return 0;
        var handle = GL.registerContext(ctx, webGLContextAttributes);
        return handle
    },
    registerContext: function(ctx, webGLContextAttributes) {
        var handle = GL.getNewId(GL.contexts);
        var context = {
            handle: handle,
            attributes: webGLContextAttributes,
            version: webGLContextAttributes.majorVersion,
            GLctx: ctx
        };
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes.enableExtensionsByDefault == "undefined" || webGLContextAttributes.enableExtensionsByDefault) {
            GL.initExtensions(context)
        }
        return handle
    },
    makeContextCurrent: function(contextHandle) {
        GL.currentContext = GL.contexts[contextHandle];
        Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx;
        return !(contextHandle && !GLctx)
    },
    getContext: function(contextHandle) {
        return GL.contexts[contextHandle]
    },
    deleteContext: function(contextHandle) {
        if (GL.currentContext === GL.contexts[contextHandle]) GL.currentContext = null;
        if (typeof JSEvents == "object") JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
        if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
        GL.contexts[contextHandle] = null
    },
    initExtensions: function(context) {
        if (!context) context = GL.currentContext;
        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;
        var GLctx = context.GLctx;
        __webgl_enable_ANGLE_instanced_arrays(GLctx);
        __webgl_enable_OES_vertex_array_object(GLctx);
        __webgl_enable_WEBGL_draw_buffers(GLctx); {
            GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query")
        }
        __webgl_enable_WEBGL_multi_draw(GLctx);
        var exts = GLctx.getSupportedExtensions() || [];
        exts.forEach(function(ext) {
            if (!ext.includes("lose_context") && !ext.includes("debug")) {
                GLctx.getExtension(ext)
            }
        })
    }
};
var __emscripten_webgl_power_preferences = ["default", "low-power", "high-performance"];

function _emscripten_webgl_do_create_context(target, attributes) {
    assert(attributes);
    var a = attributes >> 2;
    var powerPreference = HEAP32[a + (24 >> 2)];
    var contextAttributes = {
        "alpha": !!HEAP32[a + (0 >> 2)],
        "depth": !!HEAP32[a + (4 >> 2)],
        "stencil": !!HEAP32[a + (8 >> 2)],
        "antialias": !!HEAP32[a + (12 >> 2)],
        "premultipliedAlpha": !!HEAP32[a + (16 >> 2)],
        "preserveDrawingBuffer": !!HEAP32[a + (20 >> 2)],
        "powerPreference": __emscripten_webgl_power_preferences[powerPreference],
        "failIfMajorPerformanceCaveat": !!HEAP32[a + (28 >> 2)],
        majorVersion: HEAP32[a + (32 >> 2)],
        minorVersion: HEAP32[a + (36 >> 2)],
        enableExtensionsByDefault: HEAP32[a + (40 >> 2)],
        explicitSwapControl: HEAP32[a + (44 >> 2)],
        proxyContextToMainThread: HEAP32[a + (48 >> 2)],
        renderViaOffscreenBackBuffer: HEAP32[a + (52 >> 2)]
    };
    var canvas = findCanvasEventTarget(target);
    if (!canvas) {
        return 0
    }
    if (contextAttributes.explicitSwapControl) {
        return 0
    }
    var contextHandle = GL.createContext(canvas, contextAttributes);
    return contextHandle
}
var _emscripten_webgl_create_context = _emscripten_webgl_do_create_context;

function _emscripten_webgl_destroy_context(contextHandle) {
    if (GL.currentContext == contextHandle) GL.currentContext = 0;
    GL.deleteContext(contextHandle)
}

function _emscripten_webgl_init_context_attributes(attributes) {
    assert(attributes);
    var a = attributes >> 2;
    for (var i = 0; i < 56 >> 2; ++i) {
        HEAP32[a + i] = 0
    }
    HEAP32[a + (0 >> 2)] = HEAP32[a + (4 >> 2)] = HEAP32[a + (12 >> 2)] = HEAP32[a + (16 >> 2)] = HEAP32[a + (32 >> 2)] = HEAP32[a + (40 >> 2)] = 1
}

function _emscripten_webgl_make_context_current(contextHandle) {
    var success = GL.makeContextCurrent(contextHandle);
    return success ? 0 : -5
}
var ENV = {};

function getExecutableName() {
    return thisProgram || "./this.program"
}

function getEnvStrings() {
    if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
        var env = {
            "USER": "web_user",
            "LOGNAME": "web_user",
            "PATH": "/",
            "PWD": "/",
            "HOME": "/home/web_user",
            "LANG": lang,
            "_": getExecutableName()
        };
        for (var x in ENV) {
            if (ENV[x] === undefined) delete env[x];
            else env[x] = ENV[x]
        }
        var strings = [];
        for (var x in env) {
            strings.push(x + "=" + env[x])
        }
        getEnvStrings.strings = strings
    }
    return getEnvStrings.strings
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
    for (var i = 0; i < str.length; ++i) {
        assert(str.charCodeAt(i) === (str.charCodeAt(i) & 255));
        HEAP8[buffer++ >> 0] = str.charCodeAt(i)
    }
    if (!dontAddNull) HEAP8[buffer >> 0] = 0
}

function _environ_get(__environ, environ_buf) {
    var bufSize = 0;
    getEnvStrings().forEach(function(string, i) {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + i * 4 >> 2] = ptr;
        writeAsciiToMemory(string, ptr);
        bufSize += string.length + 1
    });
    return 0
}

function _environ_sizes_get(penviron_count, penviron_buf_size) {
    var strings = getEnvStrings();
    HEAPU32[penviron_count >> 2] = strings.length;
    var bufSize = 0;
    strings.forEach(function(string) {
        bufSize += string.length + 1
    });
    HEAPU32[penviron_buf_size >> 2] = bufSize;
    return 0
}

function _fd_close(fd) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0
    } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno
    }
}

function doReadv(stream, iov, iovcnt, offset) {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break
    }
    return ret
}

function _fd_read(fd, iov, iovcnt, pnum) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt);
        HEAP32[pnum >> 2] = num;
        return 0
    } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno
    }
}

function convertI32PairToI53Checked(lo, hi) {
    assert(lo == lo >>> 0 || lo == (lo | 0));
    assert(hi === (hi | 0));
    return hi + 2097152 >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN
}

function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
    try {
        var offset = convertI32PairToI53Checked(offset_low, offset_high);
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.llseek(stream, offset, whence);
        tempI64 = [stream.position >>> 0, (tempDouble = stream.position, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[newOffset >> 2] = tempI64[0], HEAP32[newOffset + 4 >> 2] = tempI64[1];
        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
        return 0
    } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno
    }
}

function doWritev(stream, iov, iovcnt, offset) {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr
    }
    return ret
}

function _fd_write(fd, iov, iovcnt, pnum) {
    try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0
    } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno
    }
}

function _getTempRet0() {
    return getTempRet0()
}

function _glActiveTexture(x0) {
    GLctx["activeTexture"](x0)
}

function _glAttachShader(program, shader) {
    GLctx.attachShader(GL.programs[program], GL.shaders[shader])
}

function _glBindAttribLocation(program, index, name) {
    GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name))
}

function _glBindBuffer(target, buffer) {
    GLctx.bindBuffer(target, GL.buffers[buffer])
}

function _glBindTexture(target, texture) {
    GLctx.bindTexture(target, GL.textures[texture])
}

function _glBlendFunc(x0, x1) {
    GLctx["blendFunc"](x0, x1)
}

function _glBufferData(target, size, data, usage) {
    GLctx.bufferData(target, data ? HEAPU8.subarray(data, data + size) : size, usage)
}

function _glClear(x0) {
    GLctx["clear"](x0)
}

function _glClearColor(x0, x1, x2, x3) {
    GLctx["clearColor"](x0, x1, x2, x3)
}

function _glClearDepthf(x0) {
    GLctx["clearDepth"](x0)
}

function _glColorMask(red, green, blue, alpha) {
    GLctx.colorMask(!!red, !!green, !!blue, !!alpha)
}

function _glCompileShader(shader) {
    GLctx.compileShader(GL.shaders[shader])
}

function _glCreateProgram() {
    var id = GL.getNewId(GL.programs);
    var program = GLctx.createProgram();
    program.name = id;
    program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
    program.uniformIdCounter = 1;
    GL.programs[id] = program;
    return id
}

function _glCreateShader(shaderType) {
    var id = GL.getNewId(GL.shaders);
    GL.shaders[id] = GLctx.createShader(shaderType);
    return id
}

function _glCullFace(x0) {
    GLctx["cullFace"](x0)
}

function _glDeleteBuffers(n, buffers) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[buffers + i * 4 >> 2];
        var buffer = GL.buffers[id];
        if (!buffer) continue;
        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null
    }
}

function _glDeleteTextures(n, textures) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[textures + i * 4 >> 2];
        var texture = GL.textures[id];
        if (!texture) continue;
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null
    }
}

function _glDepthFunc(x0) {
    GLctx["depthFunc"](x0)
}

function _glDepthMask(flag) {
    GLctx.depthMask(!!flag)
}

function _glDepthRangef(x0, x1) {
    GLctx["depthRange"](x0, x1)
}

function _glDisable(x0) {
    GLctx["disable"](x0)
}

function _glDisableVertexAttribArray(index) {
    GLctx.disableVertexAttribArray(index)
}

function _glDrawArrays(mode, first, count) {
    GLctx.drawArrays(mode, first, count)
}

function _glDrawElements(mode, count, type, indices) {
    GLctx.drawElements(mode, count, type, indices)
}

function _glEnable(x0) {
    GLctx["enable"](x0)
}

function _glEnableVertexAttribArray(index) {
    GLctx.enableVertexAttribArray(index)
}

function _glFinish() {
    GLctx["finish"]()
}

function _glFlush() {
    GLctx["flush"]()
}

function _glFrontFace(x0) {
    GLctx["frontFace"](x0)
}

function __glGenObject(n, buffers, createFunction, objectTable) {
    for (var i = 0; i < n; i++) {
        var buffer = GLctx[createFunction]();
        var id = buffer && GL.getNewId(objectTable);
        if (buffer) {
            buffer.name = id;
            objectTable[id] = buffer
        } else {
            GL.recordError(1282)
        }
        HEAP32[buffers + i * 4 >> 2] = id
    }
}

function _glGenBuffers(n, buffers) {
    __glGenObject(n, buffers, "createBuffer", GL.buffers)
}

function _glGenTextures(n, textures) {
    __glGenObject(n, textures, "createTexture", GL.textures)
}

function _glGetError() {
    var error = GLctx.getError() || GL.lastError;
    GL.lastError = 0;
    return error
}

function readI53FromI64(ptr) {
    return HEAPU32[ptr >> 2] + HEAP32[ptr + 4 >> 2] * 4294967296
}

function readI53FromU64(ptr) {
    return HEAPU32[ptr >> 2] + HEAPU32[ptr + 4 >> 2] * 4294967296
}

function writeI53ToI64(ptr, num) {
    HEAPU32[ptr >> 2] = num;
    HEAPU32[ptr + 4 >> 2] = (num - HEAPU32[ptr >> 2]) / 4294967296;
    var deserialized = num >= 0 ? readI53FromU64(ptr) : readI53FromI64(ptr);
    if (deserialized != num) warnOnce("writeI53ToI64() out of range: serialized JS Number " + num + " to Wasm heap as bytes lo=0x" + HEAPU32[ptr >> 2].toString(16) + ", hi=0x" + HEAPU32[ptr + 4 >> 2].toString(16) + ", which deserializes back to " + deserialized + " instead!")
}

function emscriptenWebGLGet(name_, p, type) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    var ret = undefined;
    switch (name_) {
        case 36346:
            ret = 1;
            break;
        case 36344:
            if (type != 0 && type != 1) {
                GL.recordError(1280)
            }
            return;
        case 36345:
            ret = 0;
            break;
        case 34466:
            var formats = GLctx.getParameter(34467);
            ret = formats ? formats.length : 0;
            break
    }
    if (ret === undefined) {
        var result = GLctx.getParameter(name_);
        switch (typeof result) {
            case "number":
                ret = result;
                break;
            case "boolean":
                ret = result ? 1 : 0;
                break;
            case "string":
                GL.recordError(1280);
                return;
            case "object":
                if (result === null) {
                    switch (name_) {
                        case 34964:
                        case 35725:
                        case 34965:
                        case 36006:
                        case 36007:
                        case 32873:
                        case 34229:
                        case 34068: {
                            ret = 0;
                            break
                        }
                        default: {
                            GL.recordError(1280);
                            return
                        }
                    }
                } else if (result instanceof Float32Array || result instanceof Uint32Array || result instanceof Int32Array || result instanceof Array) {
                    for (var i = 0; i < result.length; ++i) {
                        switch (type) {
                            case 0:
                                HEAP32[p + i * 4 >> 2] = result[i];
                                break;
                            case 2:
                                HEAPF32[p + i * 4 >> 2] = result[i];
                                break;
                            case 4:
                                HEAP8[p + i >> 0] = result[i] ? 1 : 0;
                                break
                        }
                    }
                    return
                } else {
                    try {
                        ret = result.name | 0
                    } catch (e) {
                        GL.recordError(1280);
                        err("GL_INVALID_ENUM in glGet" + type + "v: Unknown object returned from WebGL getParameter(" + name_ + ")! (error: " + e + ")");
                        return
                    }
                }
                break;
            default:
                GL.recordError(1280);
                err("GL_INVALID_ENUM in glGet" + type + "v: Native code calling glGet" + type + "v(" + name_ + ") and it returns " + result + " of type " + typeof result + "!");
                return
        }
    }
    switch (type) {
        case 1:
            writeI53ToI64(p, ret);
            break;
        case 0:
            HEAP32[p >> 2] = ret;
            break;
        case 2:
            HEAPF32[p >> 2] = ret;
            break;
        case 4:
            HEAP8[p >> 0] = ret ? 1 : 0;
            break
    }
}

function _glGetIntegerv(name_, p) {
    emscriptenWebGLGet(name_, p, 0)
}

function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
    var log = GLctx.getProgramInfoLog(GL.programs[program]);
    if (log === null) log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}

function _glGetProgramiv(program, pname, p) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    if (program >= GL.counter) {
        GL.recordError(1281);
        return
    }
    program = GL.programs[program];
    if (pname == 35716) {
        var log = GLctx.getProgramInfoLog(program);
        if (log === null) log = "(unknown error)";
        HEAP32[p >> 2] = log.length + 1
    } else if (pname == 35719) {
        if (!program.maxUniformLength) {
            for (var i = 0; i < GLctx.getProgramParameter(program, 35718); ++i) {
                program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length + 1)
            }
        }
        HEAP32[p >> 2] = program.maxUniformLength
    } else if (pname == 35722) {
        if (!program.maxAttributeLength) {
            for (var i = 0; i < GLctx.getProgramParameter(program, 35721); ++i) {
                program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length + 1)
            }
        }
        HEAP32[p >> 2] = program.maxAttributeLength
    } else if (pname == 35381) {
        if (!program.maxUniformBlockNameLength) {
            for (var i = 0; i < GLctx.getProgramParameter(program, 35382); ++i) {
                program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length + 1)
            }
        }
        HEAP32[p >> 2] = program.maxUniformBlockNameLength
    } else {
        HEAP32[p >> 2] = GLctx.getProgramParameter(program, pname)
    }
}

function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = "(unknown error)";
    var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[length >> 2] = numBytesWrittenExclNull
}

function _glGetShaderiv(shader, pname, p) {
    if (!p) {
        GL.recordError(1281);
        return
    }
    if (pname == 35716) {
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = "(unknown error)";
        var logLength = log ? log.length + 1 : 0;
        HEAP32[p >> 2] = logLength
    } else if (pname == 35720) {
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        var sourceLength = source ? source.length + 1 : 0;
        HEAP32[p >> 2] = sourceLength
    } else {
        HEAP32[p >> 2] = GLctx.getShaderParameter(GL.shaders[shader], pname)
    }
}

function stringToNewUTF8(jsString) {
    var length = lengthBytesUTF8(jsString) + 1;
    var cString = _malloc(length);
    stringToUTF8(jsString, cString, length);
    return cString
}

function _glGetString(name_) {
    var ret = GL.stringCache[name_];
    if (!ret) {
        switch (name_) {
            case 7939:
                var exts = GLctx.getSupportedExtensions() || [];
                exts = exts.concat(exts.map(function(e) {
                    return "GL_" + e
                }));
                ret = stringToNewUTF8(exts.join(" "));
                break;
            case 7936:
            case 7937:
            case 37445:
            case 37446:
                var s = GLctx.getParameter(name_);
                if (!s) {
                    GL.recordError(1280)
                }
                ret = s && stringToNewUTF8(s);
                break;
            case 7938:
                var glVersion = GLctx.getParameter(7938); {
                    glVersion = "OpenGL ES 2.0 (" + glVersion + ")"
                }
                ret = stringToNewUTF8(glVersion);
                break;
            case 35724:
                var glslVersion = GLctx.getParameter(35724);
                var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
                var ver_num = glslVersion.match(ver_re);
                if (ver_num !== null) {
                    if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
                    glslVersion = "OpenGL ES GLSL ES " + ver_num[1] + " (" + glslVersion + ")"
                }
                ret = stringToNewUTF8(glslVersion);
                break;
            default:
                GL.recordError(1280)
        }
        GL.stringCache[name_] = ret
    }
    return ret
}

function jstoi_q(str) {
    return parseInt(str)
}

function webglGetLeftBracePos(name) {
    return name.slice(-1) == "]" && name.lastIndexOf("[")
}

function webglPrepareUniformLocationsBeforeFirstUse(program) {
    var uniformLocsById = program.uniformLocsById,
        uniformSizeAndIdsByName = program.uniformSizeAndIdsByName,
        i, j;
    if (!uniformLocsById) {
        program.uniformLocsById = uniformLocsById = {};
        program.uniformArrayNamesById = {};
        for (i = 0; i < GLctx.getProgramParameter(program, 35718); ++i) {
            var u = GLctx.getActiveUniform(program, i);
            var nm = u.name;
            var sz = u.size;
            var lb = webglGetLeftBracePos(nm);
            var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
            var id = program.uniformIdCounter;
            program.uniformIdCounter += sz;
            uniformSizeAndIdsByName[arrayName] = [sz, id];
            for (j = 0; j < sz; ++j) {
                uniformLocsById[id] = j;
                program.uniformArrayNamesById[id++] = arrayName
            }
        }
    }
}

function _glGetUniformLocation(program, name) {
    name = UTF8ToString(name);
    if (program = GL.programs[program]) {
        webglPrepareUniformLocationsBeforeFirstUse(program);
        var uniformLocsById = program.uniformLocsById;
        var arrayIndex = 0;
        var uniformBaseName = name;
        var leftBrace = webglGetLeftBracePos(name);
        if (leftBrace > 0) {
            arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0;
            uniformBaseName = name.slice(0, leftBrace)
        }
        var sizeAndId = program.uniformSizeAndIdsByName[uniformBaseName];
        if (sizeAndId && arrayIndex < sizeAndId[0]) {
            arrayIndex += sizeAndId[1];
            if (uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name)) {
                return arrayIndex
            }
        }
    } else {
        GL.recordError(1281)
    }
    return -1
}

function _glLinkProgram(program) {
    program = GL.programs[program];
    GLctx.linkProgram(program);
    program.uniformLocsById = 0;
    program.uniformSizeAndIdsByName = {}
}

function computeUnpackAlignedImageSize(width, height, sizePerPixel, alignment) {
    function roundedToNextMultipleOf(x, y) {
        return x + y - 1 & -y
    }
    var plainRowSize = width * sizePerPixel;
    var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
    return height * alignedRowSize
}

function __colorChannelsInGlTextureFormat(format) {
    var colorChannels = {
        5: 3,
        6: 4,
        8: 2,
        29502: 3,
        29504: 4
    };
    return colorChannels[format - 6402] || 1
}

function heapObjectForWebGLType(type) {
    type -= 5120;
    if (type == 1) return HEAPU8;
    if (type == 4) return HEAP32;
    if (type == 6) return HEAPF32;
    if (type == 5 || type == 28922) return HEAPU32;
    return HEAPU16
}

function heapAccessShiftForWebGLHeap(heap) {
    return 31 - Math.clz32(heap.BYTES_PER_ELEMENT)
}

function emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) {
    var heap = heapObjectForWebGLType(type);
    var shift = heapAccessShiftForWebGLHeap(heap);
    var byteSize = 1 << shift;
    var sizePerPixel = __colorChannelsInGlTextureFormat(format) * byteSize;
    var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel, GL.unpackAlignment);
    return heap.subarray(pixels >> shift, pixels + bytes >> shift)
}

function _glReadPixels(x, y, width, height, format, type, pixels) {
    var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
    if (!pixelData) {
        GL.recordError(1280);
        return
    }
    GLctx.readPixels(x, y, width, height, format, type, pixelData)
}

function _glShaderSource(shader, count, string, length) {
    var source = GL.getSource(shader, count, string, length);
    GLctx.shaderSource(GL.shaders[shader], source)
}

function _glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
    GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null)
}

function _glTexParameteri(x0, x1, x2) {
    GLctx["texParameteri"](x0, x1, x2)
}

function webglGetUniformLocation(location) {
    var p = GLctx.currentProgram;
    if (p) {
        var webglLoc = p.uniformLocsById[location];
        if (typeof webglLoc == "number") {
            p.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(p, p.uniformArrayNamesById[location] + (webglLoc > 0 ? "[" + webglLoc + "]" : ""))
        }
        return webglLoc
    } else {
        GL.recordError(1282)
    }
}

function _glUniform1f(location, v0) {
    GLctx.uniform1f(webglGetUniformLocation(location), v0)
}

function _glUniform1i(location, v0) {
    GLctx.uniform1i(webglGetUniformLocation(location), v0)
}

function _glUniform3f(location, v0, v1, v2) {
    GLctx.uniform3f(webglGetUniformLocation(location), v0, v1, v2)
}

function _glUniform4f(location, v0, v1, v2, v3) {
    GLctx.uniform4f(webglGetUniformLocation(location), v0, v1, v2, v3)
}
var miniTempWebGLFloatBuffers = [];

function _glUniformMatrix4fv(location, count, transpose, value) {
    if (count <= 18) {
        var view = miniTempWebGLFloatBuffers[16 * count - 1];
        var heap = HEAPF32;
        value >>= 2;
        for (var i = 0; i < 16 * count; i += 16) {
            var dst = value + i;
            view[i] = heap[dst];
            view[i + 1] = heap[dst + 1];
            view[i + 2] = heap[dst + 2];
            view[i + 3] = heap[dst + 3];
            view[i + 4] = heap[dst + 4];
            view[i + 5] = heap[dst + 5];
            view[i + 6] = heap[dst + 6];
            view[i + 7] = heap[dst + 7];
            view[i + 8] = heap[dst + 8];
            view[i + 9] = heap[dst + 9];
            view[i + 10] = heap[dst + 10];
            view[i + 11] = heap[dst + 11];
            view[i + 12] = heap[dst + 12];
            view[i + 13] = heap[dst + 13];
            view[i + 14] = heap[dst + 14];
            view[i + 15] = heap[dst + 15]
        }
    } else {
        var view = HEAPF32.subarray(value >> 2, value + count * 64 >> 2)
    }
    GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, view)
}

function _glUseProgram(program) {
    program = GL.programs[program];
    GLctx.useProgram(program);
    GLctx.currentProgram = program
}

function _glVertexAttrib4f(x0, x1, x2, x3, x4) {
    GLctx["vertexAttrib4f"](x0, x1, x2, x3, x4)
}

function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
    GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr)
}

function _glViewport(x0, x1, x2, x3) {
    GLctx["viewport"](x0, x1, x2, x3)
}

function _setTempRet0(val) {
    setTempRet0(val)
}

function __isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function __arraySum(array, index) {
    var sum = 0;
    for (var i = 0; i <= index; sum += array[i++]) {}
    return sum
}
var __MONTH_DAYS_LEAP = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var __MONTH_DAYS_REGULAR = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function __addDays(date, days) {
    var newDate = new Date(date.getTime());
    while (days > 0) {
        var leap = __isLeapYear(newDate.getFullYear());
        var currentMonth = newDate.getMonth();
        var daysInCurrentMonth = (leap ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR)[currentMonth];
        if (days > daysInCurrentMonth - newDate.getDate()) {
            days -= daysInCurrentMonth - newDate.getDate() + 1;
            newDate.setDate(1);
            if (currentMonth < 11) {
                newDate.setMonth(currentMonth + 1)
            } else {
                newDate.setMonth(0);
                newDate.setFullYear(newDate.getFullYear() + 1)
            }
        } else {
            newDate.setDate(newDate.getDate() + days);
            return newDate
        }
    }
    return newDate
}

function _strftime(s, maxsize, format, tm) {
    var tm_zone = HEAP32[tm + 40 >> 2];
    var date = {
        tm_sec: HEAP32[tm >> 2],
        tm_min: HEAP32[tm + 4 >> 2],
        tm_hour: HEAP32[tm + 8 >> 2],
        tm_mday: HEAP32[tm + 12 >> 2],
        tm_mon: HEAP32[tm + 16 >> 2],
        tm_year: HEAP32[tm + 20 >> 2],
        tm_wday: HEAP32[tm + 24 >> 2],
        tm_yday: HEAP32[tm + 28 >> 2],
        tm_isdst: HEAP32[tm + 32 >> 2],
        tm_gmtoff: HEAP32[tm + 36 >> 2],
        tm_zone: tm_zone ? UTF8ToString(tm_zone) : ""
    };
    var pattern = UTF8ToString(format);
    var EXPANSION_RULES_1 = {
        "%c": "%a %b %d %H:%M:%S %Y",
        "%D": "%m/%d/%y",
        "%F": "%Y-%m-%d",
        "%h": "%b",
        "%r": "%I:%M:%S %p",
        "%R": "%H:%M",
        "%T": "%H:%M:%S",
        "%x": "%m/%d/%y",
        "%X": "%H:%M:%S",
        "%Ec": "%c",
        "%EC": "%C",
        "%Ex": "%m/%d/%y",
        "%EX": "%H:%M:%S",
        "%Ey": "%y",
        "%EY": "%Y",
        "%Od": "%d",
        "%Oe": "%e",
        "%OH": "%H",
        "%OI": "%I",
        "%Om": "%m",
        "%OM": "%M",
        "%OS": "%S",
        "%Ou": "%u",
        "%OU": "%U",
        "%OV": "%V",
        "%Ow": "%w",
        "%OW": "%W",
        "%Oy": "%y"
    };
    for (var rule in EXPANSION_RULES_1) {
        pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_1[rule])
    }
    var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    function leadingSomething(value, digits, character) {
        var str = typeof value == "number" ? value.toString() : value || "";
        while (str.length < digits) {
            str = character[0] + str
        }
        return str
    }

    function leadingNulls(value, digits) {
        return leadingSomething(value, digits, "0")
    }

    function compareByDay(date1, date2) {
        function sgn(value) {
            return value < 0 ? -1 : value > 0 ? 1 : 0
        }
        var compare;
        if ((compare = sgn(date1.getFullYear() - date2.getFullYear())) === 0) {
            if ((compare = sgn(date1.getMonth() - date2.getMonth())) === 0) {
                compare = sgn(date1.getDate() - date2.getDate())
            }
        }
        return compare
    }

    function getFirstWeekStartDate(janFourth) {
        switch (janFourth.getDay()) {
            case 0:
                return new Date(janFourth.getFullYear() - 1, 11, 29);
            case 1:
                return janFourth;
            case 2:
                return new Date(janFourth.getFullYear(), 0, 3);
            case 3:
                return new Date(janFourth.getFullYear(), 0, 2);
            case 4:
                return new Date(janFourth.getFullYear(), 0, 1);
            case 5:
                return new Date(janFourth.getFullYear() - 1, 11, 31);
            case 6:
                return new Date(janFourth.getFullYear() - 1, 11, 30)
        }
    }

    function getWeekBasedYear(date) {
        var thisDate = __addDays(new Date(date.tm_year + 1900, 0, 1), date.tm_yday);
        var janFourthThisYear = new Date(thisDate.getFullYear(), 0, 4);
        var janFourthNextYear = new Date(thisDate.getFullYear() + 1, 0, 4);
        var firstWeekStartThisYear = getFirstWeekStartDate(janFourthThisYear);
        var firstWeekStartNextYear = getFirstWeekStartDate(janFourthNextYear);
        if (compareByDay(firstWeekStartThisYear, thisDate) <= 0) {
            if (compareByDay(firstWeekStartNextYear, thisDate) <= 0) {
                return thisDate.getFullYear() + 1
            }
            return thisDate.getFullYear()
        }
        return thisDate.getFullYear() - 1
    }
    var EXPANSION_RULES_2 = {
        "%a": function(date) {
            return WEEKDAYS[date.tm_wday].substring(0, 3)
        },
        "%A": function(date) {
            return WEEKDAYS[date.tm_wday]
        },
        "%b": function(date) {
            return MONTHS[date.tm_mon].substring(0, 3)
        },
        "%B": function(date) {
            return MONTHS[date.tm_mon]
        },
        "%C": function(date) {
            var year = date.tm_year + 1900;
            return leadingNulls(year / 100 | 0, 2)
        },
        "%d": function(date) {
            return leadingNulls(date.tm_mday, 2)
        },
        "%e": function(date) {
            return leadingSomething(date.tm_mday, 2, " ")
        },
        "%g": function(date) {
            return getWeekBasedYear(date).toString().substring(2)
        },
        "%G": function(date) {
            return getWeekBasedYear(date)
        },
        "%H": function(date) {
            return leadingNulls(date.tm_hour, 2)
        },
        "%I": function(date) {
            var twelveHour = date.tm_hour;
            if (twelveHour == 0) twelveHour = 12;
            else if (twelveHour > 12) twelveHour -= 12;
            return leadingNulls(twelveHour, 2)
        },
        "%j": function(date) {
            return leadingNulls(date.tm_mday + __arraySum(__isLeapYear(date.tm_year + 1900) ? __MONTH_DAYS_LEAP : __MONTH_DAYS_REGULAR, date.tm_mon - 1), 3)
        },
        "%m": function(date) {
            return leadingNulls(date.tm_mon + 1, 2)
        },
        "%M": function(date) {
            return leadingNulls(date.tm_min, 2)
        },
        "%n": function() {
            return "\n"
        },
        "%p": function(date) {
            if (date.tm_hour >= 0 && date.tm_hour < 12) {
                return "AM"
            }
            return "PM"
        },
        "%S": function(date) {
            return leadingNulls(date.tm_sec, 2)
        },
        "%t": function() {
            return "\t"
        },
        "%u": function(date) {
            return date.tm_wday || 7
        },
        "%U": function(date) {
            var days = date.tm_yday + 7 - date.tm_wday;
            return leadingNulls(Math.floor(days / 7), 2)
        },
        "%V": function(date) {
            var val = Math.floor((date.tm_yday + 7 - (date.tm_wday + 6) % 7) / 7);
            if ((date.tm_wday + 371 - date.tm_yday - 2) % 7 <= 2) {
                val++
            }
            if (!val) {
                val = 52;
                var dec31 = (date.tm_wday + 7 - date.tm_yday - 1) % 7;
                if (dec31 == 4 || dec31 == 5 && __isLeapYear(date.tm_year % 400 - 1)) {
                    val++
                }
            } else if (val == 53) {
                var jan1 = (date.tm_wday + 371 - date.tm_yday) % 7;
                if (jan1 != 4 && (jan1 != 3 || !__isLeapYear(date.tm_year))) val = 1
            }
            return leadingNulls(val, 2)
        },
        "%w": function(date) {
            return date.tm_wday
        },
        "%W": function(date) {
            var days = date.tm_yday + 7 - (date.tm_wday + 6) % 7;
            return leadingNulls(Math.floor(days / 7), 2)
        },
        "%y": function(date) {
            return (date.tm_year + 1900).toString().substring(2)
        },
        "%Y": function(date) {
            return date.tm_year + 1900
        },
        "%z": function(date) {
            var off = date.tm_gmtoff;
            var ahead = off >= 0;
            off = Math.abs(off) / 60;
            off = off / 60 * 100 + off % 60;
            return (ahead ? "+" : "-") + String("0000" + off).slice(-4)
        },
        "%Z": function(date) {
            return date.tm_zone
        },
        "%%": function() {
            return "%"
        }
    };
    pattern = pattern.replace(/%%/g, "\0\0");
    for (var rule in EXPANSION_RULES_2) {
        if (pattern.includes(rule)) {
            pattern = pattern.replace(new RegExp(rule, "g"), EXPANSION_RULES_2[rule](date))
        }
    }
    pattern = pattern.replace(/\0\0/g, "%");
    var bytes = intArrayFromString(pattern, false);
    if (bytes.length > maxsize) {
        return 0
    }
    writeArrayToMemory(bytes, s);
    return bytes.length - 1
}

function _strftime_l(s, maxsize, format, tm) {
    return _strftime(s, maxsize, format, tm)
}

function allocateUTF8OnStack(str) {
    var size = lengthBytesUTF8(str) + 1;
    var ret = stackAlloc(size);
    stringToUTF8Array(str, HEAP8, ret, size);
    return ret
}

function uleb128Encode(n, target) {
    assert(n < 16384);
    if (n < 128) {
        target.push(n)
    } else {
        target.push(n % 128 | 128, n >> 7)
    }
}

function sigToWasmTypes(sig) {
    var typeNames = {
        "i": "i32",
        "j": "i64",
        "f": "f32",
        "d": "f64",
        "p": "i32"
    };
    var type = {
        parameters: [],
        results: sig[0] == "v" ? [] : [typeNames[sig[0]]]
    };
    for (var i = 1; i < sig.length; ++i) {
        assert(sig[i] in typeNames, "invalid signature char: " + sig[i]);
        type.parameters.push(typeNames[sig[i]])
    }
    return type
}

function convertJsFunctionToWasm(func, sig) {
    if (typeof WebAssembly.Function == "function") {
        return new WebAssembly.Function(sigToWasmTypes(sig), func)
    }
    var typeSectionBody = [1, 96];
    var sigRet = sig.slice(0, 1);
    var sigParam = sig.slice(1);
    var typeCodes = {
        "i": 127,
        "p": 127,
        "j": 126,
        "f": 125,
        "d": 124
    };
    uleb128Encode(sigParam.length, typeSectionBody);
    for (var i = 0; i < sigParam.length; ++i) {
        assert(sigParam[i] in typeCodes, "invalid signature char: " + sigParam[i]);
        typeSectionBody.push(typeCodes[sigParam[i]])
    }
    if (sigRet == "v") {
        typeSectionBody.push(0)
    } else {
        typeSectionBody.push(1, typeCodes[sigRet])
    }
    var bytes = [0, 97, 115, 109, 1, 0, 0, 0, 1];
    uleb128Encode(typeSectionBody.length, bytes);
    bytes.push.apply(bytes, typeSectionBody);
    bytes.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
    var module = new WebAssembly.Module(new Uint8Array(bytes));
    var instance = new WebAssembly.Instance(module, {
        "e": {
            "f": func
        }
    });
    var wrappedFunc = instance.exports["f"];
    return wrappedFunc
}

function updateTableMap(offset, count) {
    if (functionsInTableMap) {
        for (var i = offset; i < offset + count; i++) {
            var item = getWasmTableEntry(i);
            if (item) {
                functionsInTableMap.set(item, i)
            }
        }
    }
}
var functionsInTableMap = undefined;
var freeTableIndexes = [];

function getEmptyTableSlot() {
    if (freeTableIndexes.length) {
        return freeTableIndexes.pop()
    }
    try {
        wasmTable.grow(1)
    } catch (err) {
        if (!(err instanceof RangeError)) {
            throw err
        }
        throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH."
    }
    return wasmTable.length - 1
}

function setWasmTableEntry(idx, func) {
    wasmTable.set(idx, func);
    wasmTableMirror[idx] = wasmTable.get(idx)
}
var ALLOC_NORMAL = 0;
var ALLOC_STACK = 1;

function allocate(slab, allocator) {
    var ret;
    assert(typeof allocator == "number", "allocate no longer takes a type argument");
    assert(typeof slab != "number", "allocate no longer takes a number as arg0");
    if (allocator == ALLOC_STACK) {
        ret = stackAlloc(slab.length)
    } else {
        ret = _malloc(slab.length)
    }
    if (!slab.subarray && !slab.slice) {
        slab = new Uint8Array(slab)
    }
    HEAPU8.set(slab, ret);
    return ret
}

function getCFunc(ident) {
    var func = Module["_" + ident];
    assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
    return func
}

function runtimeKeepalivePush() {}

function runtimeKeepalivePop() {}

function ccall(ident, returnType, argTypes, args, opts) {
    var toC = {
        "string": str => {
            var ret = 0;
            if (str !== null && str !== undefined && str !== 0) {
                var len = (str.length << 2) + 1;
                ret = stackAlloc(len);
                stringToUTF8(str, ret, len)
            }
            return ret
        },
        "array": arr => {
            var ret = stackAlloc(arr.length);
            writeArrayToMemory(arr, ret);
            return ret
        }
    };

    function convertReturnValue(ret) {
        if (returnType === "string") {
            return UTF8ToString(ret)
        }
        if (returnType === "boolean") return Boolean(ret);
        return ret
    }
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== "array", 'Return type should not be "array".');
    if (args) {
        for (var i = 0; i < args.length; i++) {
            var converter = toC[argTypes[i]];
            if (converter) {
                if (stack === 0) stack = stackSave();
                cArgs[i] = converter(args[i])
            } else {
                cArgs[i] = args[i]
            }
        }
    }
    var previousAsync = Asyncify.currData;
    var ret = func.apply(null, cArgs);

    function onDone(ret) {
        runtimeKeepalivePop();
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret)
    }
    runtimeKeepalivePush();
    var asyncMode = opts && opts.async;
    if (Asyncify.currData != previousAsync) {
        assert(!(previousAsync && Asyncify.currData), "We cannot start an async operation when one is already flight");
        assert(!(previousAsync && !Asyncify.currData), "We cannot stop an async operation in flight");
        assert(asyncMode, "The call to " + ident + " is running asynchronously. If this was intended, add the async option to the ccall/cwrap call.");
        return Asyncify.whenDone().then(onDone)
    }
    ret = onDone(ret);
    if (asyncMode) return Promise.resolve(ret);
    return ret
}

function runAndAbortIfError(func) {
    try {
        return func()
    } catch (e) {
        abort(e)
    }
}
var Asyncify = {
    State: {
        Normal: 0,
        Unwinding: 1,
        Rewinding: 2,
        Disabled: 3
    },
    state: 0,
    StackSize: 4096,
    currData: null,
    handleSleepReturnValue: 0,
    exportCallStack: [],
    callStackNameToId: {},
    callStackIdToName: {},
    callStackId: 0,
    asyncPromiseHandlers: null,
    sleepCallbacks: [],
    getCallStackId: function(funcName) {
        var id = Asyncify.callStackNameToId[funcName];
        if (id === undefined) {
            id = Asyncify.callStackId++;
            Asyncify.callStackNameToId[funcName] = id;
            Asyncify.callStackIdToName[id] = funcName
        }
        return id
    },
    instrumentWasmImports: function(imports) {
        var ASYNCIFY_IMPORTS = ["env.invoke_*", "env.emscripten_sleep", "env.emscripten_wget", "env.emscripten_wget_data", "env.emscripten_idb_load", "env.emscripten_idb_store", "env.emscripten_idb_delete", "env.emscripten_idb_exists", "env.emscripten_idb_load_blob", "env.emscripten_idb_store_blob", "env.SDL_Delay", "env.emscripten_scan_registers", "env.emscripten_lazy_load_code", "env.emscripten_fiber_swap", "wasi_snapshot_preview1.fd_sync", "env.__wasi_fd_sync", "env._emval_await", "env._dlopen_js", "env.__asyncjs__*"].map(x => x.split(".")[1]);
        for (var x in imports) {
            (function(x) {
                var original = imports[x];
                var sig = original.sig;
                if (typeof original == "function") {
                    var isAsyncifyImport = ASYNCIFY_IMPORTS.indexOf(x) >= 0 || x.startsWith("__asyncjs__");
                    imports[x] = function() {
                        var originalAsyncifyState = Asyncify.state;
                        try {
                            return original.apply(null, arguments)
                        } finally {
                            var changedToDisabled = originalAsyncifyState === Asyncify.State.Normal && Asyncify.state === Asyncify.State.Disabled;
                            var ignoredInvoke = x.startsWith("invoke_") && true;
                            if (Asyncify.state !== originalAsyncifyState && !isAsyncifyImport && !changedToDisabled && !ignoredInvoke) {
                                throw new Error("import " + x + " was not in ASYNCIFY_IMPORTS, but changed the state")
                            }
                        }
                    }
                }
            })(x)
        }
    },
    instrumentWasmExports: function(exports) {
        var ret = {};
        for (var x in exports) {
            (function(x) {
                var original = exports[x];
                if (typeof original == "function") {
                    ret[x] = function() {
                        Asyncify.exportCallStack.push(x);
                        try {
                            return original.apply(null, arguments)
                        } finally {
                            if (!ABORT) {
                                var y = Asyncify.exportCallStack.pop();
                                assert(y === x);
                                Asyncify.maybeStopUnwind()
                            }
                        }
                    }
                } else {
                    ret[x] = original
                }
            })(x)
        }
        return ret
    },
    maybeStopUnwind: function() {
        if (Asyncify.currData && Asyncify.state === Asyncify.State.Unwinding && Asyncify.exportCallStack.length === 0) {
            Asyncify.state = Asyncify.State.Normal;
            runAndAbortIfError(_asyncify_stop_unwind);
            if (typeof Fibers != "undefined") {
                Fibers.trampoline()
            }
        }
    },
    whenDone: function() {
        assert(Asyncify.currData, "Tried to wait for an async operation when none is in progress.");
        assert(!Asyncify.asyncPromiseHandlers, "Cannot have multiple async operations in flight at once");
        return new Promise((resolve, reject) => {
            Asyncify.asyncPromiseHandlers = {
                resolve: resolve,
                reject: reject
            }
        })
    },
    allocateData: function() {
        var ptr = _malloc(12 + Asyncify.StackSize);
        Asyncify.setDataHeader(ptr, ptr + 12, Asyncify.StackSize);
        Asyncify.setDataRewindFunc(ptr);
        return ptr
    },
    setDataHeader: function(ptr, stack, stackSize) {
        HEAP32[ptr >> 2] = stack;
        HEAP32[ptr + 4 >> 2] = stack + stackSize
    },
    setDataRewindFunc: function(ptr) {
        var bottomOfCallStack = Asyncify.exportCallStack[0];
        var rewindId = Asyncify.getCallStackId(bottomOfCallStack);
        HEAP32[ptr + 8 >> 2] = rewindId
    },
    getDataRewindFunc: function(ptr) {
        var id = HEAP32[ptr + 8 >> 2];
        var name = Asyncify.callStackIdToName[id];
        var func = Module["asm"][name];
        return func
    },
    doRewind: function(ptr) {
        var start = Asyncify.getDataRewindFunc(ptr);
        return start()
    },
    handleSleep: function(startAsync) {
        assert(Asyncify.state !== Asyncify.State.Disabled, "Asyncify cannot be done during or after the runtime exits");
        if (ABORT) return;
        if (Asyncify.state === Asyncify.State.Normal) {
            var reachedCallback = false;
            var reachedAfterCallback = false;
            startAsync(handleSleepReturnValue => {
                assert(!handleSleepReturnValue || typeof handleSleepReturnValue == "number" || typeof handleSleepReturnValue == "boolean");
                if (ABORT) return;
                Asyncify.handleSleepReturnValue = handleSleepReturnValue || 0;
                reachedCallback = true;
                if (!reachedAfterCallback) {
                    return
                }
                assert(!Asyncify.exportCallStack.length, "Waking up (starting to rewind) must be done from JS, without compiled code on the stack.");
                Asyncify.state = Asyncify.State.Rewinding;
                runAndAbortIfError(() => _asyncify_start_rewind(Asyncify.currData));
                if (typeof Browser != "undefined" && Browser.mainLoop.func) {
                    Browser.mainLoop.resume()
                }
                var asyncWasmReturnValue, isError = false;
                try {
                    asyncWasmReturnValue = Asyncify.doRewind(Asyncify.currData)
                } catch (err) {
                    asyncWasmReturnValue = err;
                    isError = true
                }
                var handled = false;
                if (!Asyncify.currData) {
                    var asyncPromiseHandlers = Asyncify.asyncPromiseHandlers;
                    if (asyncPromiseHandlers) {
                        Asyncify.asyncPromiseHandlers = null;
                        (isError ? asyncPromiseHandlers.reject : asyncPromiseHandlers.resolve)(asyncWasmReturnValue);
                        handled = true
                    }
                }
                if (isError && !handled) {
                    throw asyncWasmReturnValue
                }
            });
            reachedAfterCallback = true;
            if (!reachedCallback) {
                Asyncify.state = Asyncify.State.Unwinding;
                Asyncify.currData = Asyncify.allocateData();
                if (typeof Browser != "undefined" && Browser.mainLoop.func) {
                    Browser.mainLoop.pause()
                }
                runAndAbortIfError(() => _asyncify_start_unwind(Asyncify.currData))
            }
        } else if (Asyncify.state === Asyncify.State.Rewinding) {
            Asyncify.state = Asyncify.State.Normal;
            runAndAbortIfError(_asyncify_stop_rewind);
            _free(Asyncify.currData);
            Asyncify.currData = null;
            Asyncify.sleepCallbacks.forEach(func => callUserCallback(func))
        } else {
            abort("invalid state: " + Asyncify.state)
        }
        return Asyncify.handleSleepReturnValue
    },
    handleAsync: function(startAsync) {
        return Asyncify.handleSleep(wakeUp => {
            startAsync().then(wakeUp)
        })
    }
};
var FSNode = function(parent, name, mode, rdev) {
    if (!parent) {
        parent = this
    }
    this.parent = parent;
    this.mount = parent.mount;
    this.mounted = null;
    this.id = FS.nextInode++;
    this.name = name;
    this.mode = mode;
    this.node_ops = {};
    this.stream_ops = {};
    this.rdev = rdev
};
var readMode = 292 | 73;
var writeMode = 146;
Object.defineProperties(FSNode.prototype, {
    read: {
        get: function() {
            return (this.mode & readMode) === readMode
        },
        set: function(val) {
            val ? this.mode |= readMode : this.mode &= ~readMode
        }
    },
    write: {
        get: function() {
            return (this.mode & writeMode) === writeMode
        },
        set: function(val) {
            val ? this.mode |= writeMode : this.mode &= ~writeMode
        }
    },
    isFolder: {
        get: function() {
            return FS.isDir(this.mode)
        }
    },
    isDevice: {
        get: function() {
            return FS.isChrdev(this.mode)
        }
    }
});
FS.FSNode = FSNode;
FS.staticInit();
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_unlink"] = FS.unlink;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createDevice"] = FS.createDevice;
ERRNO_CODES = {
    "EPERM": 63,
    "ENOENT": 44,
    "ESRCH": 71,
    "EINTR": 27,
    "EIO": 29,
    "ENXIO": 60,
    "E2BIG": 1,
    "ENOEXEC": 45,
    "EBADF": 8,
    "ECHILD": 12,
    "EAGAIN": 6,
    "EWOULDBLOCK": 6,
    "ENOMEM": 48,
    "EACCES": 2,
    "EFAULT": 21,
    "ENOTBLK": 105,
    "EBUSY": 10,
    "EEXIST": 20,
    "EXDEV": 75,
    "ENODEV": 43,
    "ENOTDIR": 54,
    "EISDIR": 31,
    "EINVAL": 28,
    "ENFILE": 41,
    "EMFILE": 33,
    "ENOTTY": 59,
    "ETXTBSY": 74,
    "EFBIG": 22,
    "ENOSPC": 51,
    "ESPIPE": 70,
    "EROFS": 69,
    "EMLINK": 34,
    "EPIPE": 64,
    "EDOM": 18,
    "ERANGE": 68,
    "ENOMSG": 49,
    "EIDRM": 24,
    "ECHRNG": 106,
    "EL2NSYNC": 156,
    "EL3HLT": 107,
    "EL3RST": 108,
    "ELNRNG": 109,
    "EUNATCH": 110,
    "ENOCSI": 111,
    "EL2HLT": 112,
    "EDEADLK": 16,
    "ENOLCK": 46,
    "EBADE": 113,
    "EBADR": 114,
    "EXFULL": 115,
    "ENOANO": 104,
    "EBADRQC": 103,
    "EBADSLT": 102,
    "EDEADLOCK": 16,
    "EBFONT": 101,
    "ENOSTR": 100,
    "ENODATA": 116,
    "ETIME": 117,
    "ENOSR": 118,
    "ENONET": 119,
    "ENOPKG": 120,
    "EREMOTE": 121,
    "ENOLINK": 47,
    "EADV": 122,
    "ESRMNT": 123,
    "ECOMM": 124,
    "EPROTO": 65,
    "EMULTIHOP": 36,
    "EDOTDOT": 125,
    "EBADMSG": 9,
    "ENOTUNIQ": 126,
    "EBADFD": 127,
    "EREMCHG": 128,
    "ELIBACC": 129,
    "ELIBBAD": 130,
    "ELIBSCN": 131,
    "ELIBMAX": 132,
    "ELIBEXEC": 133,
    "ENOSYS": 52,
    "ENOTEMPTY": 55,
    "ENAMETOOLONG": 37,
    "ELOOP": 32,
    "EOPNOTSUPP": 138,
    "EPFNOSUPPORT": 139,
    "ECONNRESET": 15,
    "ENOBUFS": 42,
    "EAFNOSUPPORT": 5,
    "EPROTOTYPE": 67,
    "ENOTSOCK": 57,
    "ENOPROTOOPT": 50,
    "ESHUTDOWN": 140,
    "ECONNREFUSED": 14,
    "EADDRINUSE": 3,
    "ECONNABORTED": 13,
    "ENETUNREACH": 40,
    "ENETDOWN": 38,
    "ETIMEDOUT": 73,
    "EHOSTDOWN": 142,
    "EHOSTUNREACH": 23,
    "EINPROGRESS": 26,
    "EALREADY": 7,
    "EDESTADDRREQ": 17,
    "EMSGSIZE": 35,
    "EPROTONOSUPPORT": 66,
    "ESOCKTNOSUPPORT": 137,
    "EADDRNOTAVAIL": 4,
    "ENETRESET": 39,
    "EISCONN": 30,
    "ENOTCONN": 53,
    "ETOOMANYREFS": 141,
    "EUSERS": 136,
    "EDQUOT": 19,
    "ESTALE": 72,
    "ENOTSUP": 138,
    "ENOMEDIUM": 148,
    "EILSEQ": 25,
    "EOVERFLOW": 61,
    "ECANCELED": 11,
    "ENOTRECOVERABLE": 56,
    "EOWNERDEAD": 62,
    "ESTRPIPE": 135
};
embind_init_charCodes();
BindingError = Module["BindingError"] = extendError(Error, "BindingError");
InternalError = Module["InternalError"] = extendError(Error, "InternalError");
init_emval();
Module["requestFullscreen"] = function Module_requestFullscreen(lockPointer, resizeCanvas) {
    Browser.requestFullscreen(lockPointer, resizeCanvas)
};
Module["requestFullScreen"] = function Module_requestFullScreen() {
    Browser.requestFullScreen()
};
Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
    Browser.requestAnimationFrame(func)
};
Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) {
    Browser.setCanvasSize(width, height, noUpdates)
};
Module["pauseMainLoop"] = function Module_pauseMainLoop() {
    Browser.mainLoop.pause()
};
Module["resumeMainLoop"] = function Module_resumeMainLoop() {
    Browser.mainLoop.resume()
};
Module["getUserMedia"] = function Module_getUserMedia() {
    Browser.getUserMedia()
};
Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) {
    return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes)
};
var preloadedImages = {};
var preloadedAudios = {};
var GLctx;
var miniTempWebGLFloatBuffersStorage = new Float32Array(288);
for (var i = 0; i < 288; ++i) {
    miniTempWebGLFloatBuffers[i] = miniTempWebGLFloatBuffersStorage.subarray(0, i + 1)
}
var ASSERTIONS = true;
var decodeBase64 = typeof atob == "function" ? atob : function(input) {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    do {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));
        chr1 = enc1 << 2 | enc2 >> 4;
        chr2 = (enc2 & 15) << 4 | enc3 >> 2;
        chr3 = (enc3 & 3) << 6 | enc4;
        output = output + String.fromCharCode(chr1);
        if (enc3 !== 64) {
            output = output + String.fromCharCode(chr2)
        }
        if (enc4 !== 64) {
            output = output + String.fromCharCode(chr3)
        }
    } while (i < input.length);
    return output
};

function intArrayFromBase64(s) {
    if (typeof ENVIRONMENT_IS_NODE == "boolean" && ENVIRONMENT_IS_NODE) {
        var buf = Buffer.from(s, "base64");
        return new Uint8Array(buf["buffer"], buf["byteOffset"], buf["byteLength"])
    }
    try {
        var decoded = decodeBase64(s);
        var bytes = new Uint8Array(decoded.length);
        for (var i = 0; i < decoded.length; ++i) {
            bytes[i] = decoded.charCodeAt(i)
        }
        return bytes
    } catch (_) {
        throw new Error("Converting base64 string to bytes failed.")
    }
}

function checkIncomingModuleAPI() {
    ignoredModuleProp("fetchSettings")
}
var asmLibraryArg = {
    "__cxa_allocate_exception": ___cxa_allocate_exception,
    "__cxa_throw": ___cxa_throw,
    "__syscall_fcntl64": ___syscall_fcntl64,
    "__syscall_getcwd": ___syscall_getcwd,
    "__syscall_ioctl": ___syscall_ioctl,
    "__syscall_openat": ___syscall_openat,
    "__syscall_rmdir": ___syscall_rmdir,
    "__syscall_unlinkat": ___syscall_unlinkat,
    "_embind_register_bigint": __embind_register_bigint,
    "_embind_register_bool": __embind_register_bool,
    "_embind_register_emval": __embind_register_emval,
    "_embind_register_float": __embind_register_float,
    "_embind_register_integer": __embind_register_integer,
    "_embind_register_memory_view": __embind_register_memory_view,
    "_embind_register_std_string": __embind_register_std_string,
    "_embind_register_std_wstring": __embind_register_std_wstring,
    "_embind_register_void": __embind_register_void,
    "_emscripten_date_now": __emscripten_date_now,
    "_emscripten_get_now_is_monotonic": __emscripten_get_now_is_monotonic,
    "_emscripten_push_uncounted_main_loop_blocker": __emscripten_push_uncounted_main_loop_blocker,
    "_emscripten_throw_longjmp": __emscripten_throw_longjmp,
    "_emval_as": __emval_as,
    "_emval_call": __emval_call,
    "_emval_call_method": __emval_call_method,
    "_emval_call_void_method": __emval_call_void_method,
    "_emval_decref": __emval_decref,
    "_emval_equals": __emval_equals,
    "_emval_get_global": __emval_get_global,
    "_emval_get_method_caller": __emval_get_method_caller,
    "_emval_get_property": __emval_get_property,
    "_emval_incref": __emval_incref,
    "_emval_new_cstring": __emval_new_cstring,
    "_emval_run_destructors": __emval_run_destructors,
    "_emval_set_property": __emval_set_property,
    "_emval_take_value": __emval_take_value,
    "abort": _abort,
    "emscripten_asm_const_int": _emscripten_asm_const_int,
    "emscripten_async_call": _emscripten_async_call,
    "emscripten_exit_fullscreen": _emscripten_exit_fullscreen,
    "emscripten_get_canvas_element_size": _emscripten_get_canvas_element_size,
    "emscripten_get_device_pixel_ratio": _emscripten_get_device_pixel_ratio,
    "emscripten_get_element_css_size": _emscripten_get_element_css_size,
    "emscripten_get_fullscreen_status": _emscripten_get_fullscreen_status,
    "emscripten_get_mouse_status": _emscripten_get_mouse_status,
    "emscripten_get_now": _emscripten_get_now,
    "emscripten_memcpy_big": _emscripten_memcpy_big,
    "emscripten_request_fullscreen_strategy": _emscripten_request_fullscreen_strategy,
    "emscripten_resize_heap": _emscripten_resize_heap,
    "emscripten_set_canvas_element_size": _emscripten_set_canvas_element_size,
    "emscripten_set_click_callback_on_thread": _emscripten_set_click_callback_on_thread,
    "emscripten_set_dblclick_callback_on_thread": _emscripten_set_dblclick_callback_on_thread,
    "emscripten_set_keydown_callback_on_thread": _emscripten_set_keydown_callback_on_thread,
    "emscripten_set_keyup_callback_on_thread": _emscripten_set_keyup_callback_on_thread,
    "emscripten_set_main_loop": _emscripten_set_main_loop,
    "emscripten_set_mousedown_callback_on_thread": _emscripten_set_mousedown_callback_on_thread,
    "emscripten_set_mouseleave_callback_on_thread": _emscripten_set_mouseleave_callback_on_thread,
    "emscripten_set_mousemove_callback_on_thread": _emscripten_set_mousemove_callback_on_thread,
    "emscripten_set_mouseup_callback_on_thread": _emscripten_set_mouseup_callback_on_thread,
    "emscripten_set_resize_callback_on_thread": _emscripten_set_resize_callback_on_thread,
    "emscripten_set_webglcontextlost_callback_on_thread": _emscripten_set_webglcontextlost_callback_on_thread,
    "emscripten_set_webglcontextrestored_callback_on_thread": _emscripten_set_webglcontextrestored_callback_on_thread,
    "emscripten_set_wheel_callback_on_thread": _emscripten_set_wheel_callback_on_thread,
    "emscripten_webgl_create_context": _emscripten_webgl_create_context,
    "emscripten_webgl_destroy_context": _emscripten_webgl_destroy_context,
    "emscripten_webgl_init_context_attributes": _emscripten_webgl_init_context_attributes,
    "emscripten_webgl_make_context_current": _emscripten_webgl_make_context_current,
    "environ_get": _environ_get,
    "environ_sizes_get": _environ_sizes_get,
    "exit": _exit,
    "fd_close": _fd_close,
    "fd_read": _fd_read,
    "fd_seek": _fd_seek,
    "fd_write": _fd_write,
    "getTempRet0": _getTempRet0,
    "glActiveTexture": _glActiveTexture,
    "glAttachShader": _glAttachShader,
    "glBindAttribLocation": _glBindAttribLocation,
    "glBindBuffer": _glBindBuffer,
    "glBindTexture": _glBindTexture,
    "glBlendFunc": _glBlendFunc,
    "glBufferData": _glBufferData,
    "glClear": _glClear,
    "glClearColor": _glClearColor,
    "glClearDepthf": _glClearDepthf,
    "glColorMask": _glColorMask,
    "glCompileShader": _glCompileShader,
    "glCreateProgram": _glCreateProgram,
    "glCreateShader": _glCreateShader,
    "glCullFace": _glCullFace,
    "glDeleteBuffers": _glDeleteBuffers,
    "glDeleteTextures": _glDeleteTextures,
    "glDepthFunc": _glDepthFunc,
    "glDepthMask": _glDepthMask,
    "glDepthRangef": _glDepthRangef,
    "glDisable": _glDisable,
    "glDisableVertexAttribArray": _glDisableVertexAttribArray,
    "glDrawArrays": _glDrawArrays,
    "glDrawElements": _glDrawElements,
    "glEnable": _glEnable,
    "glEnableVertexAttribArray": _glEnableVertexAttribArray,
    "glFinish": _glFinish,
    "glFlush": _glFlush,
    "glFrontFace": _glFrontFace,
    "glGenBuffers": _glGenBuffers,
    "glGenTextures": _glGenTextures,
    "glGetError": _glGetError,
    "glGetIntegerv": _glGetIntegerv,
    "glGetProgramInfoLog": _glGetProgramInfoLog,
    "glGetProgramiv": _glGetProgramiv,
    "glGetShaderInfoLog": _glGetShaderInfoLog,
    "glGetShaderiv": _glGetShaderiv,
    "glGetString": _glGetString,
    "glGetUniformLocation": _glGetUniformLocation,
    "glLinkProgram": _glLinkProgram,
    "glReadPixels": _glReadPixels,
    "glShaderSource": _glShaderSource,
    "glTexImage2D": _glTexImage2D,
    "glTexParameteri": _glTexParameteri,
    "glUniform1f": _glUniform1f,
    "glUniform1i": _glUniform1i,
    "glUniform3f": _glUniform3f,
    "glUniform4f": _glUniform4f,
    "glUniformMatrix4fv": _glUniformMatrix4fv,
    "glUseProgram": _glUseProgram,
    "glVertexAttrib4f": _glVertexAttrib4f,
    "glVertexAttribPointer": _glVertexAttribPointer,
    "glViewport": _glViewport,
    "invoke_ii": invoke_ii,
    "invoke_iii": invoke_iii,
    "invoke_iiii": invoke_iiii,
    "invoke_iiiii": invoke_iiiii,
    "invoke_v": invoke_v,
    "invoke_vi": invoke_vi,
    "invoke_vii": invoke_vii,
    "invoke_viii": invoke_viii,
    "invoke_viiii": invoke_viiii,
    "invoke_viiiiiiiii": invoke_viiiiiiiii,
    "setTempRet0": _setTempRet0,
    "strftime_l": _strftime_l
};
Asyncify.instrumentWasmImports(asmLibraryArg);
var asm = createWasm();
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = createExportWrapper("__wasm_call_ctors");
var _free = Module["_free"] = createExportWrapper("free");
var _malloc = Module["_malloc"] = createExportWrapper("malloc");
var _main = Module["_main"] = createExportWrapper("__main_argc_argv");
var _saveSetjmp = Module["_saveSetjmp"] = createExportWrapper("saveSetjmp");
var ___errno_location = Module["___errno_location"] = createExportWrapper("__errno_location");
var _fflush = Module["_fflush"] = createExportWrapper("fflush");
var ___getTypeName = Module["___getTypeName"] = createExportWrapper("__getTypeName");
var __embind_initialize_bindings = Module["__embind_initialize_bindings"] = createExportWrapper("_embind_initialize_bindings");
var _setThrew = Module["_setThrew"] = createExportWrapper("setThrew");
var _emscripten_stack_init = Module["_emscripten_stack_init"] = function() {
    return (_emscripten_stack_init = Module["_emscripten_stack_init"] = Module["asm"]["emscripten_stack_init"]).apply(null, arguments)
};
var _emscripten_stack_set_limits = Module["_emscripten_stack_set_limits"] = function() {
    return (_emscripten_stack_set_limits = Module["_emscripten_stack_set_limits"] = Module["asm"]["emscripten_stack_set_limits"]).apply(null, arguments)
};
var _emscripten_stack_get_free = Module["_emscripten_stack_get_free"] = function() {
    return (_emscripten_stack_get_free = Module["_emscripten_stack_get_free"] = Module["asm"]["emscripten_stack_get_free"]).apply(null, arguments)
};
var _emscripten_stack_get_base = Module["_emscripten_stack_get_base"] = function() {
    return (_emscripten_stack_get_base = Module["_emscripten_stack_get_base"] = Module["asm"]["emscripten_stack_get_base"]).apply(null, arguments)
};
var _emscripten_stack_get_end = Module["_emscripten_stack_get_end"] = function() {
    return (_emscripten_stack_get_end = Module["_emscripten_stack_get_end"] = Module["asm"]["emscripten_stack_get_end"]).apply(null, arguments)
};
var stackSave = Module["stackSave"] = createExportWrapper("stackSave");
var stackRestore = Module["stackRestore"] = createExportWrapper("stackRestore");
var stackAlloc = Module["stackAlloc"] = createExportWrapper("stackAlloc");
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = createExportWrapper("__cxa_is_pointer_type");
var dynCall_ii = Module["dynCall_ii"] = createExportWrapper("dynCall_ii");
var dynCall_vi = Module["dynCall_vi"] = createExportWrapper("dynCall_vi");
var dynCall_vii = Module["dynCall_vii"] = createExportWrapper("dynCall_vii");
var dynCall_iii = Module["dynCall_iii"] = createExportWrapper("dynCall_iii");
var dynCall_viiii = Module["dynCall_viiii"] = createExportWrapper("dynCall_viiii");
var dynCall_viii = Module["dynCall_viii"] = createExportWrapper("dynCall_viii");
var dynCall_iiii = Module["dynCall_iiii"] = createExportWrapper("dynCall_iiii");
var dynCall_viidiiii = Module["dynCall_viidiiii"] = createExportWrapper("dynCall_viidiiii");
var dynCall_viiiiii = Module["dynCall_viiiiii"] = createExportWrapper("dynCall_viiiiii");
var dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = createExportWrapper("dynCall_viiiiiiii");
var dynCall_v = Module["dynCall_v"] = createExportWrapper("dynCall_v");
var dynCall_viid = Module["dynCall_viid"] = createExportWrapper("dynCall_viid");
var dynCall_diid = Module["dynCall_diid"] = createExportWrapper("dynCall_diid");
var dynCall_viiiii = Module["dynCall_viiiii"] = createExportWrapper("dynCall_viiiii");
var dynCall_di = Module["dynCall_di"] = createExportWrapper("dynCall_di");
var dynCall_vidd = Module["dynCall_vidd"] = createExportWrapper("dynCall_vidd");
var dynCall_viidddd = Module["dynCall_viidddd"] = createExportWrapper("dynCall_viidddd");
var dynCall_viddddii = Module["dynCall_viddddii"] = createExportWrapper("dynCall_viddddii");
var dynCall_viddd = Module["dynCall_viddd"] = createExportWrapper("dynCall_viddd");
var dynCall_vid = Module["dynCall_vid"] = createExportWrapper("dynCall_vid");
var dynCall_viidiii = Module["dynCall_viidiii"] = createExportWrapper("dynCall_viidiii");
var dynCall_iiiii = Module["dynCall_iiiii"] = createExportWrapper("dynCall_iiiii");
var dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = createExportWrapper("dynCall_viiiiiiiii");
var dynCall_vij = Module["dynCall_vij"] = createExportWrapper("dynCall_vij");
var dynCall_iiij = Module["dynCall_iiij"] = createExportWrapper("dynCall_iiij");
var dynCall_ji = Module["dynCall_ji"] = createExportWrapper("dynCall_ji");
var dynCall_iij = Module["dynCall_iij"] = createExportWrapper("dynCall_iij");
var dynCall_iiid = Module["dynCall_iiid"] = createExportWrapper("dynCall_iiid");
var dynCall_iiiiii = Module["dynCall_iiiiii"] = createExportWrapper("dynCall_iiiiii");
var dynCall_iiiiiiiiii = Module["dynCall_iiiiiiiiii"] = createExportWrapper("dynCall_iiiiiiiiii");
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = createExportWrapper("dynCall_iiiiiii");
var dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = createExportWrapper("dynCall_iiiiiiii");
var dynCall_jiji = Module["dynCall_jiji"] = createExportWrapper("dynCall_jiji");
var dynCall_iidiiii = Module["dynCall_iidiiii"] = createExportWrapper("dynCall_iidiiii");
var dynCall_viijii = Module["dynCall_viijii"] = createExportWrapper("dynCall_viijii");
var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = createExportWrapper("dynCall_iiiiiiiii");
var dynCall_iiiiij = Module["dynCall_iiiiij"] = createExportWrapper("dynCall_iiiiij");
var dynCall_iiiiid = Module["dynCall_iiiiid"] = createExportWrapper("dynCall_iiiiid");
var dynCall_iiiiijj = Module["dynCall_iiiiijj"] = createExportWrapper("dynCall_iiiiijj");
var dynCall_iiiiiijj = Module["dynCall_iiiiiijj"] = createExportWrapper("dynCall_iiiiiijj");
var _asyncify_start_unwind = Module["_asyncify_start_unwind"] = createExportWrapper("asyncify_start_unwind");
var _asyncify_stop_unwind = Module["_asyncify_stop_unwind"] = createExportWrapper("asyncify_stop_unwind");
var _asyncify_start_rewind = Module["_asyncify_start_rewind"] = createExportWrapper("asyncify_start_rewind");
var _asyncify_stop_rewind = Module["_asyncify_stop_rewind"] = createExportWrapper("asyncify_stop_rewind");

function invoke_iiiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        return dynCall_iiiii(index, a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_ii(index, a1) {
    var sp = stackSave();
    try {
        return dynCall_ii(index, a1)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iiii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        return dynCall_iiii(index, a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viii(index, a1, a2, a3) {
    var sp = stackSave();
    try {
        dynCall_viii(index, a1, a2, a3)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiii(index, a1, a2, a3, a4) {
    var sp = stackSave();
    try {
        dynCall_viiii(index, a1, a2, a3, a4)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vii(index, a1, a2) {
    var sp = stackSave();
    try {
        dynCall_vii(index, a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_vi(index, a1) {
    var sp = stackSave();
    try {
        dynCall_vi(index, a1)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_v(index) {
    var sp = stackSave();
    try {
        dynCall_v(index)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    var sp = stackSave();
    try {
        dynCall_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}

function invoke_iii(index, a1, a2) {
    var sp = stackSave();
    try {
        return dynCall_iii(index, a1, a2)
    } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0)
    }
}
Module["addRunDependency"] = addRunDependency;
Module["removeRunDependency"] = removeRunDependency;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;
var unexportedRuntimeSymbols = ["run", "UTF8ArrayToString", "UTF8ToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "addOnPreRun", "addOnInit", "addOnPreMain", "addOnExit", "addOnPostRun", "FS_createFolder", "FS_createLink", "getLEB", "getFunctionTables", "alignFunctionTables", "registerFunctions", "prettyPrint", "getCompilerSetting", "print", "printErr", "getTempRet0", "setTempRet0", "callMain", "abort", "keepRuntimeAlive", "wasmMemory", "stackSave", "stackRestore", "stackAlloc", "writeStackCookie", "checkStackCookie", "ptrToString", "zeroMemory", "stringToNewUTF8", "exitJS", "getHeapMax", "emscripten_realloc_buffer", "ENV", "ERRNO_CODES", "ERRNO_MESSAGES", "setErrNo", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "DNS", "getHostByName", "Protocols", "Sockets", "getRandomDevice", "warnOnce", "traverseStack", "UNWIND_CACHE", "convertPCtoSourceLocation", "readAsmConstArgsArray", "readAsmConstArgs", "mainThreadEM_ASM", "jstoi_q", "jstoi_s", "getExecutableName", "listenOnce", "autoResumeAudioContext", "dynCallLegacy", "getDynCaller", "dynCall", "handleException", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "safeSetTimeout", "asmjsMangle", "asyncLoad", "alignMemory", "mmapAlloc", "writeI53ToI64", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "readI53FromI64", "readI53FromU64", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "getCFunc", "ccall", "cwrap", "uleb128Encode", "sigToWasmTypes", "convertJsFunctionToWasm", "freeTableIndexes", "functionsInTableMap", "getEmptyTableSlot", "updateTableMap", "addFunction", "removeFunction", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "setValue", "getValue", "PATH", "PATH_FS", "intArrayFromString", "intArrayToString", "AsciiToString", "stringToAscii", "UTF16Decoder", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "allocateUTF8", "allocateUTF8OnStack", "writeStringToMemory", "writeArrayToMemory", "writeAsciiToMemory", "SYSCALLS", "getSocketFromFD", "getSocketAddress", "JSEvents", "registerKeyEventCallback", "specialHTMLTargets", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "currentFullscreenStrategy", "restoreOldWindowedStyle", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "demangle", "demangleAll", "jsStackTrace", "stackTrace", "ExitStatus", "getEnvStrings", "checkWasiClock", "doReadv", "doWritev", "dlopenMissingError", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "ExceptionInfo", "exception_addRef", "exception_decRef", "Browser", "setMainLoop", "wget", "FS", "MEMFS", "TTY", "PIPEFS", "SOCKFS", "_setNetworkCallback", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "heapObjectForWebGLType", "heapAccessShiftForWebGLHeap", "GL", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "writeGLArray", "AL", "SDL_unicode", "SDL_ttfContext", "SDL_audio", "SDL", "SDL_gfx", "GLUT", "EGL", "GLFW_Window", "GLFW", "GLEW", "IDBStore", "runAndAbortIfError", "Asyncify", "Fibers", "ALLOC_NORMAL", "ALLOC_STACK", "allocate", "InternalError", "BindingError", "UnboundTypeError", "PureVirtualError", "init_embind", "throwInternalError", "throwBindingError", "throwUnboundTypeError", "ensureOverloadTable", "exposePublicSymbol", "replacePublicSymbol", "extendError", "createNamedFunction", "embindRepr", "registeredInstances", "getBasestPointer", "registerInheritedInstance", "unregisterInheritedInstance", "getInheritedInstance", "getInheritedInstanceCount", "getLiveInheritedInstances", "registeredTypes", "awaitingDependencies", "typeDependencies", "registeredPointers", "registerType", "whenDependentTypesAreResolved", "embind_charCodes", "embind_init_charCodes", "readLatin1String", "getTypeName", "heap32VectorToArray", "requireRegisteredType", "getShiftFromSize", "integerReadValueFromPointer", "enumReadValueFromPointer", "floatReadValueFromPointer", "simpleReadValueFromPointer", "runDestructors", "new_", "craftInvokerFunction", "embind__requireFunction", "tupleRegistrations", "structRegistrations", "genericPointerToWireType", "constNoSmartPtrRawPointerToWireType", "nonConstNoSmartPtrRawPointerToWireType", "init_RegisteredPointer", "RegisteredPointer", "RegisteredPointer_getPointee", "RegisteredPointer_destructor", "RegisteredPointer_deleteObject", "RegisteredPointer_fromWireType", "runDestructor", "releaseClassHandle", "finalizationRegistry", "detachFinalizer_deps", "detachFinalizer", "attachFinalizer", "makeClassHandle", "init_ClassHandle", "ClassHandle", "ClassHandle_isAliasOf", "throwInstanceAlreadyDeleted", "ClassHandle_clone", "ClassHandle_delete", "deletionQueue", "ClassHandle_isDeleted", "ClassHandle_deleteLater", "flushPendingDeletes", "delayFunction", "setDelayFunction", "RegisteredClass", "shallowCopyInternalPointer", "downcastPointer", "upcastPointer", "validateThis", "char_0", "char_9", "makeLegalFunctionName", "emval_handle_array", "emval_free_list", "emval_symbols", "init_emval", "count_emval_handles", "get_first_emval", "getStringOrSymbol", "Emval", "emval_newers", "craftEmvalAllocator", "emval_get_global", "emval_lookupTypes", "emval_allocateDestructors", "emval_methodCallers", "emval_addMethodCaller", "emval_registeredMethods"];
unexportedRuntimeSymbols.forEach(unexportedRuntimeSymbol);
var missingLibrarySymbols = ["ptrToString", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "getHostByName", "traverseStack", "convertPCtoSourceLocation", "mainThreadEM_ASM", "jstoi_s", "listenOnce", "autoResumeAudioContext", "getDynCaller", "asmjsMangle", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "convertI32PairToI53", "convertU32PairToI53", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "getSocketFromFD", "getSocketAddress", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "registerFullscreenChangeEventCallback", "hideEverythingExceptGivenElement", "restoreHiddenElements", "softFullscreenResizeWebGLRenderTarget", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "checkWasiClock", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "exception_addRef", "exception_decRef", "_setNetworkCallback", "emscriptenWebGLGetUniform", "emscriptenWebGLGetVertexAttrib", "writeGLArray", "SDL_unicode", "SDL_ttfContext", "SDL_audio", "GLFW_Window", "init_embind", "throwUnboundTypeError", "ensureOverloadTable", "exposePublicSymbol", "replacePublicSymbol", "getBasestPointer", "registerInheritedInstance", "unregisterInheritedInstance", "getInheritedInstance", "getInheritedInstanceCount", "getLiveInheritedInstances", "heap32VectorToArray", "enumReadValueFromPointer", "craftInvokerFunction", "embind__requireFunction", "genericPointerToWireType", "constNoSmartPtrRawPointerToWireType", "nonConstNoSmartPtrRawPointerToWireType", "init_RegisteredPointer", "RegisteredPointer", "RegisteredPointer_getPointee", "RegisteredPointer_destructor", "RegisteredPointer_deleteObject", "RegisteredPointer_fromWireType", "runDestructor", "releaseClassHandle", "detachFinalizer", "attachFinalizer", "makeClassHandle", "init_ClassHandle", "ClassHandle", "ClassHandle_isAliasOf", "throwInstanceAlreadyDeleted", "ClassHandle_clone", "ClassHandle_delete", "ClassHandle_isDeleted", "ClassHandle_deleteLater", "flushPendingDeletes", "setDelayFunction", "RegisteredClass", "shallowCopyInternalPointer", "downcastPointer", "upcastPointer", "validateThis", "craftEmvalAllocator"];
missingLibrarySymbols.forEach(missingLibrarySymbol);
var calledRun;
dependenciesFulfilled = function runCaller() {
    if (!calledRun) run();
    if (!calledRun) dependenciesFulfilled = runCaller
};

function callMain(args) {
    assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
    assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
    var entryFunction = Module["_main"];
    args = args || [];
    args.unshift(thisProgram);
    var argc = args.length;
    var argv = stackAlloc((argc + 1) * 4);
    var argv_ptr = argv >> 2;
    args.forEach(arg => {
        HEAP32[argv_ptr++] = allocateUTF8OnStack(arg)
    });
    HEAP32[argv_ptr] = 0;
    try {
        var ret = entryFunction(argc, argv);
        exitJS(ret, true);
        return ret
    } catch (e) {
        return handleException(e)
    }
}

function stackCheckInit() {
    _emscripten_stack_init();
    writeStackCookie()
}

function run(args) {
    args = args || arguments_;
    if (runDependencies > 0) {
        return
    }
    stackCheckInit();
    preRun();
    if (runDependencies > 0) {
        return
    }

    function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        preMain();
        if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
        if (shouldRunNow) callMain(args);
        postRun()
    }
    if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(function() {
            setTimeout(function() {
                Module["setStatus"]("")
            }, 1);
            doRun()
        }, 1)
    } else {
        doRun()
    }
    checkStackCookie()
}

function checkUnflushedContent() {
    var oldOut = out;
    var oldErr = err;
    var has = false;
    out = err = x => {
        has = true
    };
    try {
        _fflush(0);
        ["stdout", "stderr"].forEach(function(name) {
            var info = FS.analyzePath("/dev/" + name);
            if (!info) return;
            var stream = info.object;
            var rdev = stream.rdev;
            var tty = TTY.ttys[rdev];
            if (tty && tty.output && tty.output.length) {
                has = true
            }
        })
    } catch (e) {}
    out = oldOut;
    err = oldErr;
    if (has) {
        warnOnce("stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the FAQ), or make sure to emit a newline when you printf etc.")
    }
}
if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
        Module["preInit"].pop()()
    }
}
var shouldRunNow = true;
if (Module["noInitialRun"]) shouldRunNow = false;
run();