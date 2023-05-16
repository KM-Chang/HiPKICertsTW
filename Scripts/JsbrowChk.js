/*判斷客戶端資訊*/
function getBroswerBase() {
    var Sys = {};
    var ua = navigator;
    Sys.CookieYN = ua.cookieEnabled;                    //是否開啟Cookie
    Sys.javaYN = ua.javaEnabled();                    //是否支援javascript IE true為支援  Chrome、edge false為支援
    Sys.Boslanguage = ua.language;              //瀏覽器首要語言
    //Sys.MobileYN = document.hasOwnProperty("ontouchstart");     //是否為行動裝置 電腦為false，行動裝置為true
    ua = ua.userAgent;
    Sys.OSbase = ua.substring(ua.indexOf('(') + 1, ua.indexOf(')'));    //主機和位元
    ua = ua.toLowerCase();

    var s;
    (s = ua.match(/edge\/([\d.]+)/)) ? Sys.edge = s[1] :
    (s = ua.match(/rv:([\d.]+)\) like gecko/)) ? Sys.ie = s[1] :
    (s = ua.match(/msie ([\d.]+)/)) ? Sys.ie = s[1] :
    (s = ua.match(/firefox\/([\d.]+)/)) ? Sys.firefox = s[1] :
    (s = ua.match(/chrome\/([\d.]+)/)) ? Sys.chrome = s[1] :
    (s = ua.match(/opera.([\d.]+)/)) ? Sys.opera = s[1] :
    (s = ua.match(/version\/([\d.]+).*safari/)) ? Sys.safari = s[1] : 0;

    if (Sys.edge) return { broswer: "Edge", version: Sys.edge, OSbase: Sys.OSbase, CookieYN: Sys.CookieYN, javaYN: Sys.javaYN, Boslanguage: Sys.Boslanguage, MobileYN: Sys.MobileYN };
    if (Sys.ie) return { broswer: "IE", version: Sys.ie, OSbase: Sys.OSbase, CookieYN: Sys.CookieYN, javaYN: Sys.javaYN, Boslanguage: Sys.Boslanguage, MobileYN: Sys.MobileYN };
    if (Sys.firefox) return { broswer: "Firefox", version: Sys.firefox, OSbase: Sys.OSbase, CookieYN: Sys.CookieYN, javaYN: Sys.javaYN, Boslanguage: Sys.Boslanguage, MobileYN: Sys.MobileYN };
    if (Sys.chrome) return { broswer: "Chrome", version: Sys.chrome, OSbase: Sys.OSbase, CookieYN: Sys.CookieYN, javaYN: Sys.javaYN, Boslanguage: Sys.Boslanguage, MobileYN: Sys.MobileYN };
    if (Sys.opera) return { broswer: "Opera", version: Sys.opera, OSbase: Sys.OSbase, CookieYN: Sys.CookieYN, javaYN: Sys.javaYN, Boslanguage: Sys.Boslanguage, MobileYN: Sys.MobileYN };
    if (Sys.safari) return { broswer: "Safari", version: Sys.safari, OSbase: Sys.OSbase, CookieYN: Sys.CookieYN, javaYN: Sys.javaYN, Boslanguage: Sys.Boslanguage, MobileYN: Sys.MobileYN };

    return { broswer: "不知名", version: "0", OSbase: Sys.OSbase, CookieYN: Sys.CookieYN, javaYN: Sys.javaYN, Boslanguage: Sys.Boslanguage, MobileYN: Sys.MobileYN };
}
/*判斷是否支援*/
function getSysOKYN(Sysobj) {
    var msgHtml = "";
    if (Sysobj.broswer == "IE" && Sysobj.version != "11.0") msgHtml += "您的瀏覽器版本過低，請更新至IE11或下載最新的Microsoft Edge，Google Chrome瀏覽器!<br />";
    if (!Sysobj.CookieYN) msgHtml += "您的瀏覽器不支援Cookie功能，請開啟!<br />";
    if (msgHtml != "") {
        msgHtml = "<div id='SysErrMsg' class='divMaskKT'></div><div class='alert alert-warning' style='z-index:99999; position:absolute; left:2%;top:30px;'>" + msgHtml + "</div>";
        if ($("#SysErrMsg").length == 0) { $("body").append(msgHtml); }
    }
}
/*偵測跨平台網頁元件版本*/
function CheckHiPKIv(SpanobjId) {
    if ($("#hidd" + SpanobjId).val() == "") {
        //讀取憑證版本 (首次載入再跑)
        $("#" + SpanobjId).text("憑證元件版本偵測中...");
        var HiPKICimgV = document.createElement("img");
        HiPKICimgV.crossOrigin = "Anonymous";
        HiPKICimgV.src = 'http://localhost:61161/p11Image.bmp';
        var HiPKICctxV = document.createElement("canvas").getContext('2d');
        HiPKICimgV.onload = function () {
            HiPKICctxV.drawImage(HiPKICimgV, 0, 0);
            setOutputV(getHiPKIimgV(HiPKICctxV, this.width, this.height), getBroswerBase(), SpanobjId);
        };
        HiPKICimgV.onerror = function () {
            $("#hidd" + SpanobjId).val("未安裝憑證元件或未啟動服務");
            $("#" + SpanobjId).hide();
        };
    } else {
        $("#" + SpanobjId).text($("#hidd" + SpanobjId).val());
        if ($("#" + SpanobjId).text().substr(0, 2) == "憑證") {
            $("#" + SpanobjId).css("color", "#666666");
        } else if ($("#hidd" + SpanobjId).val() == "未安裝憑證元件或未啟動服務")
        {
            $("#AlertMoica").hide();
        }
    }
}
/*解析跨平台網頁版本JSON內容*/
function setOutputV(output, Sysobj, SpanobjId) {
    var retV = JSON.parse(output);
    if (retV.ret_code == "0") {
        if (Sysobj.OSbase.indexOf("Windows") > -1) {
            if (retV.serverVersion < "1.3.4.103327") $("#" + SpanobjId).text("！憑證元件" + retV.serverVersion + "低於1.3.4.103327版可能會造成資安風險，請儘速下載更新");
        } else if (Sysobj.OSbase.indexOf("Mac")>-1) {
            if (retV.serverVersion < "1.3.4.13") $("#" + SpanobjId).text("！憑證元件" + retV.serverVersion + "低於1.3.4.13版可能會造成資安風險，請儘速下載更新");
        }
        if ($("#" + SpanobjId).text() == "憑證元件版本偵測中...") {
            $("#" + SpanobjId).text("憑證元件版本：" + retV.serverVersion);
            $("#" + SpanobjId).css("color", "#666666");
        }
    } else {
        $("#" + SpanobjId).text(retV.message);
    }
    $("#hidd" + SpanobjId).val($("#" + SpanobjId).text());
}
/*透過載圖獲取跨平台網頁版本*/
function getHiPKIimgV(ctx, ctxW, ctxH) {
    var HiPKICoutV = "";
    var dataV = ctx.getImageData(0, 0, ctxW, ctxH).data;
    for (i = 0; i < ctxW; i++) {
        if (dataV[(4 * i) + 2] == 0) break;
        HiPKICoutV = HiPKICoutV + String.fromCharCode(dataV[(4 * i) + 2], dataV[(4 * i) + 1], dataV[(4 * i)]);
    }
    if (HiPKICoutV == "") HiPKICoutV = '{"ret_code": 1979711501,"message": "執行檔錯誤或逾時"}';
    return HiPKICoutV;
}