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
self.addEventListener("notificationclick", e => {
  const notification = e.notification;
  console.log(notification)
  const data = notification.data;
  const chat_id = data.chat_id;
  e.notification.close();
  e.waitUntil(clients.openWindow(`/chat/${chat_id}`));
})
messaging.setBackgroundMessageHandler(payload => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const data = payload.data;
  const notificationTitle = `Message from ${data.sender}`;
  let bod;
  if (data.hasImage) {
    bod = "Media Message"
  } else {
    bod = data.message
  }
  const notificationOptions = {
    requireInteraction: true,
    body: bod,
    data,
    icon: "/favicon.ico"
  };
  if (data.hasImage) {
    notificationOptions['image'] = data.hasImage
  }
  return self.registration.showNotification(notificationTitle,
    notificationOptions);
});