import {QWebChannel} from './qwebchannel-es6.js'

const channelName = "pyqtChannel"
const threadMode = {
    child: "child",//使用ui线程处理，可以直接操作ui，但不要执行耗时操作，否则会导致ui卡顿
    ui: "ui" //使用子线程处理，不能直接操作ui，可以进行耗时操作，不会导致ui卡顿
}
const defaultOptions = {
    path: "",
    fullPath: "",
    params: {},
    callback: "",
    threadMode: threadMode.child,
    packageInfo: {},
    pyMethod: "qt_service"
}

//callback函数列表
const callbackArray = []

const initQWebChannel = () => {
    return new Promise((resolve, reject) => {
        if (window['qt']) {
            new QWebChannel(qt.webChannelTransport, function (channel) {
                resolve(channel)
            })
        } else {
            reject("非qt环境 无法获取qt对象")
        }
    })
}

const newCallbackFunctionName = (path) => {
    return "qtCallback_" + path + "_" + String(Math.random()).replace(".", "")
}

const getCallbackName = (path) => {
    let funcName = newCallbackFunctionName(path)
    callbackArray.push(funcName)
    if (callbackArray.length > 500) {
        let first = callbackArray[0]
        callbackArray.shift()
        delete window[first]
    }
    return funcName
}

const doReq = (options) => {
    let qtFunc = options.pyqtChannel[options.pyMethod]
    return new Promise((resolve, reject) => {

        window[options.callback] = (res) => {
            try {
                console.dir(options.path + "，qt-request返回结果：" + res)
                try {
                    let data = res ? JSON.parse(res) : {code: '-1'}
                    resolve(data)
                } catch (e) {
                    resolve(res)
                }
            } catch (e) {
                console.log(e)
                reject(e)
            }
        }
        try {
            let sOp = JSON.stringify(options);
            console.debug("qt-request请求：" + sOp)
            qtFunc(sOp)
        } catch (e) {
            console.log(e)
            reject(e)
        }
    })
}

const getFullPath = (packageInfo, path) => {
    if (packageInfo) {
        let groupId = packageInfo.groupId.replace(new RegExp("\\.", "gm"), "/");
        return "/" + groupId + "/" + packageInfo.artifactId + "/" + packageInfo.router.replace(".py", "") + path
    }
    return path
}

export const QtRequest = async (options) => {

    let op = Object.assign({}, defaultOptions, options)
    op.pyqtChannel = window[channelName]
    op.fullPath = getFullPath(options.packageInfo, options.path)
    let callback_path = op.fullPath.replace(new RegExp("/", "gm"), "_");
    op.callback = getCallbackName(callback_path)
    if (op.pyqtChannel === undefined) {
        let channel = await initQWebChannel()
        window[channelName] = channel.objects[channelName];
        op.pyqtChannel = window[channelName]
    }
    return doReq(op)
}