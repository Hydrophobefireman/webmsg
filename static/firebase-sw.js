importScripts('https://www.gstatic.com/firebasejs/5.5.5/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/5.5.5/firebase-messaging.js');
firebase.initializeApp({
  "apiKey": "AIzaSyCrdjBktQNWizVmfjK50I7BGsIQcNFmKcI",
  "databaseURL": "https://webmsg-py.firebaseio.com",
  "storageBucket": "webmsg-py.appspot.com",
  "authDomain": "webmsg-py.firebaseapp.com",
  "messagingSenderId": "193257233140",
  "projectId": "webmsg-py"
});
const messaging = firebase.messaging();
messaging.setBackgroundMessageHandler(payload => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const data = payload.data;
  const notificationTitle = `Message from ${data.sender}`;
  let bod;
  if (data.hasImage) {
    bod = "Media Message"
  } else {
    bod = data.messageContent
  }
  const notificationOptions = {
    requireInteraction: true,
    body: bod
  };
  return self.registration.showNotification(notificationTitle,
    notificationOptions);
});
`
curl -X POST -H "Authorization: Bearer ya29.c.EmM8Bi6J9Yti5MQJTTxv1MtITVHOSOYPQa8f56Uh035_OsH1Qt00o9BZsuN_hvz8h1y0wJ68crloBAifaXCz_dNCGESNAvAYsOtXho0PpIPi9tvGP2Ymkk3Gx7VnhR1Y4NhCwdM" -H "Content-Type: application/json" -d '{
  "message": {
    "token" : "eGBUpXRct4g:APA91bEEdG2BP_9qCPKUgZbEFfBhIMkVYj6FPb2SvpkwmlBiwYD4_lKQZf8L3sCH5FvcCayNMmcU_IG1jvSH2uBQsXlvToT4-RGq0ZHEbcehmTzPVGaebEIrl9UaYhhLyDYow3lM7IKv",
    "webpush": {
      "headers": {
        "Urgency": "high"
      },
      "data": {
        "messageContent": "Hi Bhavesh",
        "sender": "rohan",
      }
    }
  }
}' https://fcm.googleapis.com/v1/projects/webmsg-py/messages:send

  `