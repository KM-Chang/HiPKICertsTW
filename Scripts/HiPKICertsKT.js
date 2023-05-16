/* HiPKILocalSignServer 跨平台網頁元件自然人憑證驗證 */
var HiPKUrlLocalServer = "http://localhost:61161";
var NoLocalServerMsg = "偵測不到您卡片!\n請檢查您是否有安裝並啟用【自然人憑證跨平台網頁元件】!\n並確保讀卡機正確連線!";

/* Card_Data() 成功讀取到使用者憑證後，記錄於此物件 */
var Card_Data = {
    label: "",      /*憑證名稱: cert1, cert2, ... */
    usage: "",      /*憑證使用類型: digitalSignature, keyEncipherment|dataEncipherment */
    subjectDN: "",  /*自然人憑證所有人 DN*/
    subjectID: "",  /*身份證末4碼*/
    certB64: "",    /*簽章用(usage=digitalSignature)憑證資料(Base64格式)*/
    signedData: "",  /*以簽章憑證 Signed 的資料*/
    SerialNum: ""    /*抓出SerialNum*/
};
var Card_RTimeout = 3500;
var Card_IEYN = false;
var Card_postTarget;
var post_timeoutId;
var C_reqFunc;
var C_reqPIN;

var _validationCallback;
var _getCertCallback;
var _makeSignCallback;

/*清除Card_Data */
function _resetCertData() {
    Card_Data.label = "";
    Card_Data.usage = "";
    Card_Data.subjectDN = "";
    Card_Data.subjectID = "";
    Card_Data.certB64 = "";
    Card_Data.signedData = "";
    Card_Data.SerialNum = "";
}

/* 建立IE ActiveX 物件*/
function _createHttpObject() {
    var elemDiv = document.getElementById("httpWrapper");
    if (!elemDiv) {
        elemDiv = document.createElement('div');
        document.body.appendChild(elemDiv);
    }
    elemDiv.innerHTML = '<OBJECT id="http" width=1 height=1 style="LEFT: 1px; TOP: 1px" type="application/x-httpcomponent" VIEWASTEXT></OBJECT>';
}

/*(for IE) send http POST via ActiveX http 傳送驗證資訊於ActiveX物件處理 */
function _sendHttpRequestIE(target, data) {

    var http = document.getElementById("http");
    if (!http || !http.sendRequest) {
        return null;
    }
    http.url = target;
    http.actionMethod = "POST";
    var code = http.sendRequest(data);
    if (code != 0) {
        //驗證失敗
        return null;
    }
    return http.responseText;
}

function _checkFinish() {
    if (Card_postTarget) {
        Card_postTarget.close();
        if (_validationCallback && _validationCallback instanceof Function) {
            _validationCallback(null, -9999, NoLocalServerMsg);
        }
        else {
            //alert(NoLocalServerMsg);  //錯誤訊息改丟傳回物件裡
        }
    } else {
        _validationCallback(null, -9999, "瀏覽器發生非預期錯誤，請開啟快顯示窗或換個瀏覽器試試");
    }
}
/* 
憑證登入PIN碼檢核, 丟回 callback(certData, rtnCode, msg) 回應,
若成功: certData=憑證資訊, rtnCode=0
若失敗: rtnCode!=0, Msg=錯誤訊息
*/
function Card_Validation(userPIN, callback) {
    try {
        onLoadInit();   //判斷是否為IE並初始化相關物件
        _resetCertData();
        if (!callback || !(callback instanceof Function)) {
            //沒有callback
            return;
        }
        _validationCallback = callback;
        if (!userPIN) {
            callback(null, -2, "沒有輸入 PIN 碼!");
            return;
        }
        //if (Card_IEYN) { Card_postTarget = window.open("./../Imgda/WaitIC.html", "憑證驗證中", "height=150,width=150,left=150,top=75"); }      //IE用等待訊息框 HiPKUrlLocalServer + "/waiting.gif"
        /* 1. 憑證進行簽章API呼叫(檢驗PIN碼是否正確) */
        _makeSignature(userPIN, function (signedData, rtnCode, msg) {

            if (rtnCode == 0) {
                // PIN 碼驗證成功
                Card_Data.signedData = signedData;
                /* 2. 讀取憑證資料 API 呼叫 */
                _getUserCert(function (rtnCode, msg) {
                    if (rtnCode == 0) {
                        // 讀取憑證資料成功
                        Card_Data.SerialNum = Card_Data.subjectDN.split('=').pop();  //解析字串抓出SerialNum
                        if (Card_IEYN && Card_postTarget) { Card_postTarget.close(); Card_postTarget = null; }
                        callback(Card_Data, 0, null);
                    }
                    else {
                        //回應碼不正確，根據回應碼丟回訊息
                        if (Card_IEYN && Card_postTarget) { Card_postTarget.close(); Card_postTarget = null; }
                        callback(null, rtnCode, msg);
                    }
                });
            }
            else {
                // 簽章失敗(PIN 碼驗證失敗)
                if (Card_IEYN && Card_postTarget) { Card_postTarget.close(); Card_postTarget = null; }
                callback(null, rtnCode, msg);
            }
        });

    }
    catch (e) {
        if (Card_IEYN && Card_postTarget) { Card_postTarget.close(); Card_postTarget = null; }
        callback(null, -9999, "驗證過程發生非預期錯誤!");
    }
}
//判斷卡PIN碼是否正確
function _makeSignature(userPIN, callback) {
    C_reqFunc = "MakeSignature";
    C_reqPIN = userPIN;
    _SignedData = "";
    _makeSignCallback = callback;

    if (Card_IEYN) //is IE 用 ActiveX
    {
        var data = _sendHttpRequestIE(HiPKUrlLocalServer + "/sign", "tbsPackage=" + _getTbsPackage());

        if (!data) {
            if (callback && callback instanceof Function) {
                callback(null, -9999, NoLocalServerMsg);
            }
            else {
                //alert(NoLocalServerMsg);      //錯誤訊息改丟傳回物件裡
            }
        }
        else _setSignature(data);
    }
    else {
        //其他瀏覽器驗證
        Card_postTarget = window.open(HiPKUrlLocalServer + "/popupForm", "簽章中", "height=220,width=220,left=150,top=75");
        post_timeoutId = setTimeout(_checkFinish, Card_RTimeout);
    }
}
//PIN碼過了來讀卡片資料
function _getUserCert(callback) {
    C_reqFunc = "GetUserCert";
    //_resetCertData();
    _getCertCallback = callback;

    if (Card_IEYN) //is IE
    {
        var data = _sendHttpRequestIE(HiPKUrlLocalServer + "/pkcs11info?withcert=true", "");
        if (!data) {
            if (callback && callback instanceof Function) {
                callback(null, -9999, NoLocalServerMsg);
            }
            else {
                //alert(NoLocalServerMsg);  //錯誤訊息改丟傳回物件裡
            }
        }
        else _setUserCert(data);
    }
    else {
        //其他瀏覽器
        Card_postTarget = window.open(HiPKUrlLocalServer + "/popupForm", "憑證讀取中", "height=220,width=220,left=150,top=75");
        post_timeoutId = setTimeout(_checkFinish, Card_RTimeout);
    }
}
//_makeSignCallback 的Callback return用
function _triggerMakeSignCallback(signedData, rtnCode, msg) {
    if (_makeSignCallback) {
        _makeSignCallback(signedData, rtnCode, msg);
    }
    else {
        //_makeSignCallback沒宣告不Callback
    }
}
/*解析收到的簽章資料,丟回並設定: _CertReturnCode, _SignedData 驗證登入資料在這 */
function _setSignature(signature) {
    var ret = JSON.parse(signature);
    var _SignedData = ret.signature;

    if (ret.ret_code != 0) {
        var errMsg = MajorErrorReason(ret.ret_code);
        if (ret.last_error)
            errMsg += " " + MinorErrorReason(ret.last_error);

        _triggerMakeSignCallback(null, ret.ret_code, errMsg);
    }
    else {
        _triggerMakeSignCallback(_SignedData, 0, null);
    }
}
//_getCertCallback 的Callback return用
function _triggerGetCertCallback(certData, rtnCode, msg) {

    if (_getCertCallback) {
        _getCertCallback(certData, rtnCode, msg);
    }
    else {
        //_getCertCallback沒宣告不Callback
    }
}
/*解析收到的憑證資料, 丟回並設定: _CertReturnCode, Card_Data 讀取卡片資料在這 */
function _setUserCert(certData) {
    var ret = JSON.parse(certData);

    if (ret.ret_code != 0) {
        var errMsg = MajorErrorReason(ret.ret_code);
        if (ret.last_error)
            errMsg += " " + MinorErrorReason(ret.last_error);

        _triggerGetCertCallback(ret.ret_code, errMsg);
        return;
    }
    var usage = "digitalSignature";     //"keyEncipherment|dataEncipherment";
    var slots = ret.slots;
    for (var index in slots) {
        if (slots[index].token == null || slots[index].token === "unknown token") continue;
        var certs = slots[index].token.certs;
        for (var indexCert in certs) {
            if (certs[indexCert].usage == usage) {
                Card_Data.label = certs[indexCert].label;
                Card_Data.usage = certs[indexCert].usage;
                Card_Data.subjectDN = certs[indexCert].subjectDN;
                Card_Data.subjectID = certs[indexCert].subjectID;
                Card_Data.certB64 = certs[indexCert].certb64;

                _triggerGetCertCallback(0, null);
                return;
            }
        }
    }
    _triggerGetCertCallback(-1, "找不到憑證, 請確認憑證有正確插入讀卡機!");
}
/* 根據 C_reqFunc 產生呼叫 HiPKILocalServer 的 WebSocket Request Package，丟入驗證參數 */
function _getTbsPackage() {
    var tbsData = {};

    if (C_reqFunc == "GetUserCert") {
        tbsData = { "func": "GetUserCert" };
    }
    else if (C_reqFunc == "MakeSignature") {
        tbsData["func"] = "MakeSignature";
        tbsData["signatureType"] = "PKCS7";
        tbsData["tbs"] = "TBS";
        tbsData["tbsEncoding"] = "";
        tbsData["hashAlgorithm"] = "SHA256";
        tbsData["withCardSN"] = "";
        tbsData["pin"] = C_reqPIN;
        tbsData["nonce"] = "";
    }
    return JSON.stringify(tbsData);
}

/* _receiveMessage 接收並處理來自 HiPKUrlLocalServer 的回應訊息 非IE瀏覽器用，接收新視窗回應資訊 */
function _receiveMessage(event) {

    //安全起見，這邊應填入網站位址檢查
    if (event.origin != HiPKUrlLocalServer) {
        //非本地端，不處理 防範跨網域要求
        return;
    }
    try {
        if (event.data && event.data.length > 0) {
            var ret = JSON.parse(event.data);
            if (ret.func) {

                if (ret.func == "getTbs") {
                    clearTimeout(post_timeoutId);

                    var json = _getTbsPackage();
                    Card_postTarget.postMessage(json, "*");
                }
                else if (ret.func == "sign") {
                    // MakeSignature 的 message event
                    _setSignature(event.data);
                }
                else if (ret.func == "pkcs11info") {
                    // GetUserCert 的 message event
                    _setUserCert(event.data);
                }
            } else {
                //驗證參數不全 不處理
            }
        }
        else {
            //驗證參數不全 不處理
        }

    } catch (e) {
        //驗證參數不全 不處理
    }
}
//IE初始化建立ActiveX物件
function onLoadInit() {
    var CardBros=navigator.userAgent
    if (CardBros.indexOf("MSIE") != -1 || CardBros.indexOf("Trident") != -1) {
        Card_IEYN = true;
        _createHttpObject();
    }
}

/* WebSocket 標準: 
   先綁定監看回應方法
   綁定 window.message event 接收來自 HiPKUrlLocalServer 的回應訊息 
*/
if (window.addEventListener) {
    window.addEventListener("message", _receiveMessage, false);
} else {
    //IE8
    window.attachEvent("onmessage", _receiveMessage);
}
//改在驗證前呼叫函式，不在登入時綁定
//if (document.addEventListener) {
//    document.addEventListener("load", onLoadInit);
//}
//else {
//    //IE8
//    document.attachEvent("load", onLoadInit);
//}
// Card_Validation($("#txtPIN").val(), Card_KTreBoj);  驗證起始  系統直接引用此函式驗證
//↓下面函數擺到到登入頁 因應google運作順序
//function Card_KTreBoj(certData, rtnCode, msg) {
//    Card_KTreBojs.CktrCode = rtnCode; Card_KTreBojs.Cktrmsg = msg; Card_KTreBojs.CktRing = "Y";
//    if (rtnCode == 0)   //驗證通過再抓serial
//    {
//        Card_KTreBojs.Cktrserial = certData.subjectDN.split('=').pop();   //解字串只抓serial
//    }
//}

function MajorErrorReason(rcode) {
    if (rcode < 0) rcode = 0xFFFFFFFF + rcode + 1;
    switch (rcode) {
        case 0x76000001:
            return "未輸入金鑰";
        case 0x76000002:
            return "未輸入憑證";
        case 0x76000003:
            return "未輸入待簽訊息";
        case 0x76000004:
            return "未輸入密文";
        case 0x76000005:
            return "未輸入函式庫檔案路徑";
        case 0x76000006:
            return "未插入IC卡";
        case 0x76000007:
            return "未登入";
        case 0x76000008:
            return "型態錯誤";
        case 0x76000009:
            return "檔案錯誤";
        case 0x7600000A:
            return "檔案過大";
        case 0x7600000B:
            return "JSON格式錯誤";
        case 0x7600000C:
            return "參數錯誤";
        case 0x7600000D:
            return "執行檔錯誤或逾時";
        case 0x7600000E:
            return "不支援的方法";
        case 0x7600000F:
            return "禁止存取的網域";
        case 0x76000998:
            return "未輸入PIN碼";
        case 0x76000999:
            return "使用者已取消動作";
        case 0x76100001:
            return "無法載入IC卡函式庫檔案";
        case 0x76100002:
            return "結束IC卡函式庫失敗";
        case 0x76100003:
            return "無可用讀卡機";
        case 0x76100004:
            return "取得讀卡機資訊失敗";
        case 0x76100005:
            return "取得session失敗";
        case 0x76100006:
            return "IC卡登入失敗";
        case 0x76100007:
            return "IC卡登出失敗";
        case 0x76100008:
            return "IC卡取得金鑰失敗";
        case 0x76100009:
            return "IC卡取得憑證失敗";
        case 0x7610000A:
            return "取得函式庫資訊失敗";
        case 0x7610000B:
            return "IC卡卡片資訊失敗";
        case 0x7610000C:
            return "找不到指定憑證";
        case 0x7610000D:
            return "找不到指定金鑰";
        case 0x76200001:
            return "pfx初始失敗";
        case 0x76200006:
            return "pfx登入失敗";
        case 0x76200007:
            return "pfx登出失敗";
        case 0x76200008:
            return "不支援的CA";
        case 0x76300001:
            return "簽章初始錯誤";
        case 0x76300002:
            return "簽章型別錯誤";
        case 0x76300003:
            return "簽章內容錯誤";
        case 0x76300004:
            return "簽章執行錯誤";
        case 0x76300005:
            return "簽章憑證錯誤";
        case 0x76300006:
            return "簽章DER錯誤";
        case 0x76300007:
            return "簽章結束錯誤";
        case 0x76300008:
            return "簽章驗證錯誤";
        case 0x76300009:
            return "簽章BIO錯誤";
        case 0x76400001:
            return "解密DER錯誤";
        case 0x76400002:
            return "解密型態錯誤";
        case 0x76400003:
            return "解密錯誤";
        case 0x76500001:
            return "憑證尚未生效";
        case 0x76500002:
            return "憑證已逾期";
        case 0x76600001:
            return "Base64編碼錯誤";
        case 0x76600002:
            return "Base64解碼錯誤";
        case 0x76700001:
            return "伺服金鑰解密錯誤";
        case 0x76700002:
            return "未登錄伺服金鑰";
        case 0x76700003:
            return "伺服金鑰加密錯誤";
        case 0x76210001:
            return "身分證字號或外僑號碼比對錯誤";
        case 0x76210002:
            return "未支援的憑證型別";
        case 0x76210003:
            return "非元大寶來憑證";
        case 0x76210004:
            return "非中華電信通用憑證管理中心發行之憑證";

        case 0x77100001:
            return "圖形驗證碼不符";
        case 0x77200001:
            return "未輸入附卡授權SNO碼";
        case 0x77200002:
            return "讀附卡授權證發生錯誤:Buffer太小";
        case 0x77200003:
            return "讀附卡授權證發生錯誤:卡片空間不足";
        case 0x77200004:
            return "讀附卡授權證發生錯誤:資料太大";
        case 0x77200005:
            return "讀附卡授權證發生錯誤:DLL載入發生錯誤(E_NOT_LOAD_DLL)";
        case 0x77200006:
            return "讀附卡授權證發生錯誤:支援函數錯誤(E_NOT_SUPPORT_FUNCTION)";
        case 0x77200007:
            return "讀附卡授權證發生錯誤:讀卡slot錯誤(E_SLOT)";
        case 0x77200008:
            return "讀附卡授權證發生錯誤:Index格式錯誤";
        case 0x77200009:
            return "讀附卡授權證發生錯誤:讀卡機未選擇(READER_NOT_SELECT_ERROR)";
        case 0x77200010:
            return "讀附卡授權證發生錯誤:SNO碼錯誤(SNO_EXIST)";
        case 0x77200011:
            return "讀附卡授權證發生錯誤:SNO碼錯誤(SNO_NO_EXIST)";
        case 0x77200101:
            return "寫新憑證功能發生錯誤：寫新憑證前刪除舊憑證發生錯誤";
        case 0x77200102:
            return "寫新憑證功能發生錯誤：要寫入新憑證時發生錯誤";
        case 0x77200103:
            return "寫新憑證功能發生錯誤：輸入內容PIN和SOPIN不可同時有值";
        case 0x77301001:
            return "JSON PARSER無法處理CONSOLE程式輸入的參數";
        case 0x77301002:
            return "CONSOLE程式輸入的參數少於指定的參數值";
        case 0x77301003:
            return "CONSOLE輸入的JSON值中少了指定的func";
        case 0x77301004:
            return "執行BUILDUNBLOCKCARDREQ中少了readername";
        case 0x77301005:
            return "執行BUILDUNBLOCKCARDREQ中少了caname";
        case 0x77301006:
            return "執行BUILDUNBLOCKCARDREQ中少了sid";
        case 0x77301007:
            return "執行BUILDUNBLOCKCARDREQ中少了newpin";
        case 0x77301008:
            return "執行執行UNBLOCKCARD時缺少CMSRESPONSE的值";
        case 0x77301009:
            return "執行UNBLOCKCARD時缺少SID的值";
        case 0x77301010:
            return "執行BUILDREASETUSERPINREQ時缺少READERNAME的值";
        case 0x77301011:
            return "執行BUILDREASETUSERPINREQ時缺少CANAME的值";
        case 0x77301012:
            return "執行RESTUSERPIN時缺少CMSRESPONSE的值";
        case 0x77301013:
            return "執行RESTUSERPIN時缺少SID的值";
        case 0x77301014:
            return "執行BUILDOPENCARDGETUSERPINREQ缺少CAName的值";
        case 0x77301015:
            return "執行BUILDOPENCARDGETUSERPINREQ缺少ReaderName的值";
        case 0x77301016:
            return "執行BUILDOPENCARDGETUSERPINREQ缺少SID的值";
        case 0x77301017:
            return "執行BUILDOPENCARDGETUSERPINREQ缺少NEWPIN的值";
        case 0x77301018:
            return "執行BUILDOPENCARDVALIDATEUSERREQ缺少CMSRESONSE的值";
        case 0x77301019:
            return "執行BUILDOPENCARDVALIDATEUSERREQ缺少SID的值";
        case 0x77301020:
            return "執行OPENCARD缺少CMSRESONSE的值";
        case 0x77301021:
            return "執行OPENCARD缺少SID的值";
        case 0x77301022:
            return "執行OPENCARD缺少RADERNAME的值";
        case 0x77301023:
            return "執行OPENCARD缺少CURRENTPIN的值";
        case 0x77301024:
            return "執行OPENCARD缺少NEWPIN的值";
        case 0x77301025:
            return "無支援此功能名稱";
        case 0x77301026:
            return "執行BUILDREASETUSERPINREQ缺少SID的值";
        case 0x77301027:
            return "執行CHANGEUSERPIN缺少CARDID的值";
        case 0x77301028:
            return "執行BUILDUNBLOCKCARDREQ缺少CARDID的值";
        case 0x77301029:
            return "執行BUILDOPENCARDGETUSERPINREQ缺少CARDID的值";
        case 0x77301030:
            return "執行BUILDREASETUSERPINREQ缺少CARDID的值";
        case 0x77301031:
            return "解密失敗(umakesig)";
        case 0x77301032:
            return "無法開啟簽章程式(umakesig)";
        case 0x77301033:
            return "輸入簽章值內容為空(umakesig)";
        case 0x77301034:
            return "輸入Hash演算法內容為空(umakesig)";
        case 0x77301035:
            return "輸入TBS值為空(umakesig)";
        case 0x77301036:
            return "輸入PIN值為空(umakesig)";
        case 0x77301037:
            return "輸入PIN值解base64失敗(umakesig)";
        case 0x77301038:
            return "簽章結果錯誤(umakesig)";
        case 0x77301039:
            return "簽章結果為空(umakesig)";
        case 0x77301040:
            return "剖析簽章回傳JSON值錯誤(umakesig)";
        case 0x77301041:
            return "呼叫簽章函數錯誤(umakesig)";
        case 0x77301042:
            return "呼叫簽章函數錯誤2(umakesig)";

        case 0xE0000013: //0xE0000013
            return "金鑰不相符";
        case 0xE0000012: //0xE0000012
            return "使用者取消";
        case 0xE0000010: //0xE0000010
            return "建立金鑰容器失敗，可能是因為權限不足";
        case 0xE000000F: //0xE000000F
            return "找不到任一家CA發的該類別用戶憑證，但中華電信該憑證類別中有找到其他用戶";
        case 0xE000000E: //0xE000000E
            return "開啟物件(p7b)失敗";
        case 0xE000000D: //0xE000000D
            return "HEX字串格式錯誤";
        case 0xE000000C: //0xE000000C
            return "HEX字串長度錯誤";
        case 0xE000000B: //0xE000000B
            return "寬位元字串轉多位元字串轉換失敗";
        case 0xE000000A: //0xE000000A
            return "開啟CertStore失敗";
        case 0xE0000009: //0xE0000009
            return "匯出檔案失敗";
        case 0xE0000008: //0xE0000008
            return "匯入檔案失敗";
        case 0xE0000007: //0xE0000007
            return "必須輸入檔案路徑";
        case 0xE0000006: //0xE0000006
            return "找不到任一家CA發的該類別用戶憑證";
        case 0xE0000005: //0xE0000005
            return "找不到中華電信該類別用戶憑證，但找得到其他CA發的該類別用戶憑證";
        case 0xE0000004: //0xE0000004
            return "未支援的參加單位代碼";
        case 0xE0000003: //0xE0000003
            return "金鑰的雜湊值不一致";
        case 0xE0000002: //0xE0000002
            return "程式配置記憶體失敗";
        case 0xE0000001: //0xE0000001
            return "找不到由中華電信所核發且合乎搜尋條件的憑證";

            //開卡鎖卡解鎖錯誤碼
        case 0x81000001: return "沒有CONTENT_LENGTH";
        case 0x81000002: return "CONTENT_LENGTH_SIZE太大";
        case 0x81000003: return "讀取設定檔錯誤";
        case 0x81000004: return "解析加密JSON錯誤(不是JSON格式)";
        case 0x81000005: return "解析加密JSON參數錯誤";
        case 0x81000111: return "解析JSON錯誤(不是JSON格式)";
        case 0x81000112: return "解析JSON參數錯誤";
        case 0x81000113: return "解析JSON API版本錯誤";
        case 0x81000114: return "解析JSON METHOD錯誤";
        case 0x81000115: return "解析JSON 請求逾時";
        case 0x81000201: return "用戶代碼錯誤1次";
        case 0x81000202: return "用戶代碼錯誤2次";
        case 0x81000203: return "用戶代碼錯誤3次";
        case 0x81000221: return "DB連線錯誤";
        case 0x81000222: return "DB連線錯誤";
        case 0x81000223: return "DB連線錯誤";
        case 0x81000224: return "DB卡號不存在";
        case 0x81000225: return "DB卡號未開卡";
        case 0x81000226: return "DB卡號已開卡";
        case 0x81000227: return "用戶代碼已鎖定";
        case 0x81000228: return "DB UNBLOCK錯誤";
        case 0x81000229: return "DB USERPIN錯誤";
        case 0x81000230: return "DB 輸入參數錯誤";
        case 0x81000231: return "DB錯誤";
        case 0x81000232: return "DB UNBLOCK解析錯誤";
        case 0x81000233: return "DB USERPIN解析錯誤";
        case 0x81000301: return "連線到RA錯誤";
        case 0x81000302: return "RA回應格式錯誤";
        case 0x81011000: return "底層錯誤Buffer size";
        case 0x81011001: return "底層錯誤 RSA加密";
        case 0x81011002: return "底層錯誤 RSA解密";
        case 0x81011003: return "底層錯誤 RSA簽章";
        case 0x81011004: return "底層錯誤 RSA驗簽";
        case 0x81011005: return "底層錯誤 AES加密";
        case 0x81011006: return "底層錯誤 AES解密";

        case 0x82000003: return "解析加密JSON錯誤(不是JSON格式)";
        case 0x82000004: return "解析加密JSON參數錯誤";
        case 0x82000111: return "解析JSON錯誤(不是JSON格式)";
        case 0x82000112: return "解析JSON參數錯誤";
        case 0x82000113: return "解析JSON API版本錯誤";
        case 0x82000114: return "解析JSON METHOD錯誤";
        case 0x82000115: return "用戶代碼參數比對錯誤";
        case 0x82000116: return "卡號參數比對錯誤";
        case 0x82000117: return "CANAME參數比對錯誤";
        case 0x82000118: return "回應逾時";
        case 0x83000100: return "插入的卡片不符合要求(非GPKI卡片)";
        case 0x83000101: return "選錯服務，您使用MOICA卡";
        case 0x83000102: return "選錯服務，您使用MOEACA卡";
        case 0x83000103: return "選錯服務，您使用GCA卡";
        case 0x83000104: return "選錯服務，您使用XCA卡";
        case 0x83000105: return "輸入之PIN碼格式錯誤";
        case 0x83000106: return "輸入之用戶代碼格式錯誤";
        default:
            return rcode.toString(16);
    }
}
function MinorErrorReason(rcode) {
    switch (rcode) {
        case 0x06:
            return "函式失敗";
        case 0xA0:
            return "PIN碼錯誤";
        case 0xA2:
            return "PIN碼長度錯誤";
        case 0xA4:
            return "已鎖卡";
        case 0x150:
            return "記憶體緩衝不足";
        case 0xFFFFFFFF80000001:
        case -2147483647:
            return "PIN碼錯誤，剩餘一次機會";
        case 0xFFFFFFFF80000002:
        case -2147483646:
            return "PIN碼錯誤，剩餘兩次機會";
        default:
            return rcode.toString(16);
    }
}