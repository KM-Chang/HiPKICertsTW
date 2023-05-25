# 自然人憑證讀取介接函式庫

## 說明
自然人憑證為台灣政府發行的電子憑證(簽章)，由於公部門在登入或網路給予資料時，經常需要以此憑證對使用者進行驗證，因此受託開發系統經常要介接，故打包起來比較方便。

自然人証明書は台湾政府によって発行される電子証明書（デジタル署名）です。官公庁はログインやデータ提供際にこの証明書を使用してユーザーを認証する必要があります。そのため、委託開発システムではこの証明書との連携が頻繁に行われて、JSのモジュール化をしました。

The Natural Person Certificate is an electronic certificate (digital signature) issued by the Taiwanese government. It is frequently used by government agencies to authenticate users when accessing systems or providing data over the internet. Therefore, it is common for entrusted development systems to integrate with this certificate, making it more convenient when modularization.

## 如何使用
* 使用者必須安裝並開始內政部憑證中心的[【跨平台網頁元件】](https://moica.nat.gov.tw/rac_plugin.html) (此為LocalServer，將以WebSocket介接)

1.引用HiPKICertsKT.js
```javascript
<script type="text/javascript" src="Scripts/HiPKICertsKT.js"></script>
```

2.異步呼叫驗證函式
```javascript
            setTimeout(() => {
                Card_Validation($("#txtPIN").val(), Card_KTreBoj);
            }, 50);
```

3.取得certData物件資料
```javascript
    function Card_KTreBoj(certData, rtnCode, msg) {
        //action
    }
```

*JsbrowChk.js 是選用的，他用於檢驗跨平台網頁元件版本和使用者環境 **可能需要依賴jquery**

## 讀取內容
```javascript
        var Card_Data = {
        label: "",      /*憑證名稱: cert1, cert2, ... */
        usage: "",      /*使用類型: digitalSignature, keyEncipherment|dataEncipherment */
        subjectDN: "",  /*自然人憑證所有人 姓名*/
        subjectID: "",  /*身份證末4碼*/
        certB64: "",    /*簽章用(usage=digitalSignature)憑證資料(Base64格式)*/
        signedData: "",  /*以簽章憑證 Signed 的資料*/
        SerialNum: ""    /*簽證序號*/
    };
```
