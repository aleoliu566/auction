var config = {
    apiKey: "AIzaSyBnZAkRXrqB0V26Hs8fL0AJUpAJgFisrgw",
    authDomain: "myauction.firebaseapp.com",
    databaseURL: "https://myauction.firebaseio.com",
    storageBucket: "project-3656270594903993076.appspot.com",
};
firebase.initializeApp(config);
ImageDealer.REF = firebase;
var currentUser;

var items = firebase.database().ref("items");
var viewModal = new ViewModal($("#view-modal"));
var uploadModal = new UploadModal($("#upload-modal"));
var nowItem = "";


/*
    分為三種使用情形：
    1. 初次登入，改變成登入狀態
    2. 已為登入狀態，reload 網站照樣顯示登入狀態
    3. 未登入狀態

    登入/當初狀態顯示可使用下方 logginOption function
*/
// $("#upload").click(function() {
//     $("input:nth-of-type(1)").val("");
//     $("input:nth-of-type(2)").val("");
//     $("textarea").val("");
// });

firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        logginOption(true);
    } else {
        logginOption(false);
    }
});

$("#signin").click(function() {
    // 登入後的頁面行為
    var fbProvider = new firebase.auth.FacebookAuthProvider();
    firebase.auth().signInWithPopup(fbProvider).then(function(result) {
        console.log(result.user);
        var users = {};
        var userData = { name: result.user.displayName, photoURL: result.user.photoURL };
        users['users/"' + result.user.uid + '"'] = userData;
        console.log(users);
        firebase.database().ref().update(users);
        logginOption(true);
        location.reload();
    }).catch(function(error) {
        var errorCode = error.code;
        var errorMessa = error.message;
        console.log(errorCode, errorMessa);
    });

});

$("#signout").click(function() {
    // 登出後的頁面行為
    firebase.auth().signOut().then(function() {
        logginOption(false);
        location.reload();
    }, function(error) {
        console.log(error.code);
    });


});

$("#submitData").click(function(event) {
    var dataArr = $("#item-info").serializeArray();
    var picFile = $("#picData")[0].files[0];
    if (dataArr[0].value != "" && dataArr[1].value != "" && dataArr[2].value != "" && picFile != null) {

        items.push({ title: dataArr[0].value, price: parseInt(dataArr[1].value), descrip: dataArr[2].value, seller: firebase.auth().currentUser.uid, userTime: new Date($.now()).toLocaleString() });
        items.limitToLast(1).on("value", function(lastItemkey) {
            var key = lastItemkey.val();
            uploadModal.itemKey = Object.keys(key)[0];
        });
        uploadModal.submitPic(firebase.auth().currentUser.uid);
    } else {
        alert("請輸入全部的資訊");
    }
});

$("#editData").click(function() {
    // 編輯商品資訊
    var dataArr = $("#item-info").serializeArray();
    uploadModal.itemKey = nowItem;
    var picFile = $("#picData")[0].files[0];
    picFile= $(".picBox").css("background-image").split('"')[1].split('"')[0];
    $("#picData")[0].files[0]=$(".picBox").css("background-image").split('"')[1].split('"')[0];
    console.log($("#picData")[0].files[0]);
    console.log($(".picBox").css("background-image").split('"')[1].split('"')[0]);

    if (dataArr[0].value != "" && dataArr[1].value != "" && dataArr[2].value != ""&&picFile!=null) {

        item = firebase.database().ref("items/" + nowItem);
        item.update({ title: dataArr[0].value, price: parseInt(dataArr[1].value), descrip: dataArr[2].value, userTime: new Date($.now()).toLocaleString() });
        uploadModal.submitPic(firebase.auth().currentUser.uid);

    } else {
        alert("請輸入全部的資訊");
    }
})

$("#removeData").click(function() {
    //刪除商品
    item = firebase.database().ref("items/" + nowItem);
    item.remove();
    uploadModal.itemKey = nowItem;
    uploadModal.deletePic(firebase.auth().currentUser.uid);

})


/*
    商品按鈕在dropdown-menu中
    三種商品篩選方式：
    1. 顯示所有商品
    2. 顯示價格高於 NT$10000 的商品
    3. 顯示價格低於 NT$9999 的商品

*/


function logginOption(isLoggin) {
    if (isLoggin) {
        $("#upload").css("display", "block");
        $("#signin").css("display", "none");
        $("#signout").css("display", "block");
    } else {
        $("#upload").css("display", "none");
        $("#signin").css("display", "block");
        $("#signout").css("display", "none");
    }
}


$(".dropdown-menu li:nth-child(2)").click(function(e) {
    items.orderByChild("price").startAt(10000).on("value", reProduceAll);
});

$(".dropdown-menu li:nth-child(3)").click(function(e) {
    items.orderByChild("price").startAt(0).endAt(9999).on("value", reProduceAll);
});

$(".dropdown-menu li:nth-child(1)").click(function(e) {
    items.on("value", reProduceAll);
});
items.on("value", reProduceAll);

function reProduceAll(allItems) {
    /*
    清空頁面上 (#item)內容上的東西。
    讀取爬回來的每一個商品
    */
    $("#items").empty();
    /*
      利用for in存取
    */
    allData = allItems.val();

    for (var sinItemData in allData) {
        produceSingleItem(allData[sinItemData], sinItemData);
    }
}

// 每點開一次就註冊一次
function produceSingleItem(sinItemData, itemKey) {
    /*
      抓取 sinItemData 節點上的資料。
      若你的sinItemData資料欄位中並沒有使用者名稱，請再到user節點存取使用者名稱
      資料齊全後塞進item中，創建 Item 物件，並顯示到頁面上。
    */
    firebase.database().ref('users/"' + sinItemData.seller + '"').once("value", function(nameData) {
        var username = nameData.val();
        currentUser = firebase.auth().currentUser;
        var product = new Item({
            title: sinItemData.title,
            price: sinItemData.price,
            itemKey: itemKey,
            seller: sinItemData.seller,
            sellerName: username.name
        }, currentUser);
        $("#items").append(product.dom);

        if (currentUser != null && currentUser.uid === sinItemData.seller) {
            product.editBtn.click(function(e) {
                nowItem = itemKey;
                uploadModal.editData(sinItemData);
                uploadModal.callImage(itemKey, sinItemData.seller);
            });
        }

        /*
          用 ViewModal 填入這筆 item 的資料
          呼叫 ViewModal callImage打開圖片
          創建一個 MessageBox 物件，將 Message 的結構顯示上 #message 裡。
        */

        product.viewBtn.click(function(e) {
            viewModal.writeData(sinItemData);
            viewModal.callImage(itemKey, sinItemData.seller);
            var messBox = new MessageBox(firebase.auth().currentUser, itemKey);
            $("#message").append(messBox.dom);
            /*
              判斷使用者是否有登入，如果有登入就讓 #message 容器顯示輸入框。
              在 MessageBox 上面註冊事件，當 submit 時將資料上傳。
            */
            if (currentUser != null) {
                $("#message").append(messBox.inputBox);
                messBox.inputBox.keypress(function(e) {
                    if (e.which == 13) {
                        e.preventDefault();
                        /*取得input的內容*/
                        var input = $(this).find("#dialog").val();
                        console.log(input);
                        firebase.database().ref("items/" + itemKey + "/messages").push({ message: input, time: new Date($.now()).toLocaleString(), userName: currentUser.displayName, photoURL: currentUser.photoURL });

                        //清空input的內容
                        $(this).find("#dialog").val("");

                    }
                });
            }
            /*
            從資料庫中抓出message資料，並將資料填入MessageBox
            */
            firebase.database().ref("items/" + itemKey + "/messages").orderByChild("time").on("value", function(data) {
                messBox.refresh();
                var messageObjs = data.val();
                for (var mess in messageObjs) {
                    generateDialog(messageObjs[mess], messBox);
                }
            });
        });
    });
    /*
    如果使用者有登入，替 editBtn 監聽事件，當使用者點選編輯按鈕時，將資料顯示上 uploadModal。
    */
}




function generateDialog(diaData, messageBox) {
    console.log(diaData.message);
    console.log(diaData.userName);
    messageBox.addDialog({ message: diaData.message, time: diaData.time, name: diaData.userName, picURL: diaData.photoURL });
}
