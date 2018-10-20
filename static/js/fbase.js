if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/jsmin/sw.js').then(registration => {
            // Registration was successful
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
            // registration failed :(
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
const config = {
    apiKey: "AIzaSyCrdjBktQNWizVmfjK50I7BGsIQcNFmKcI",
    authDomain: "webmsg-py.firebaseapp.com",
    databaseURL: "webmsg-py.firebaseio.com",
    projectId: "webmsg-py",
    storageBucket: "webmsg-py.appspot.com",
    messagingSenderId: "193257233140"
};
firebase.initializeApp(config);

const messaging = firebase.messaging();
messaging.usePublicVapidKey("BGhv7XYjPBkpVoOEPbq2E19Is1ti_MYfboTDazKE0jgxPENxDqe0-U2p1OKEEgG4JH4Ycl8Wbxdv-UrrP_LcLmw");
messaging.requestPermission().then(() => {
    console.log('Notification permission granted.');
    // TODO(developer): Retrieve an Instance ID token for use with FCM.
    // ...
}).catch(err => {
    console.log('Unable to get permission to notify.', err);
});
messaging.getToken().then(currentToken => {
    if (currentToken) {
        console.log("TOKEN:", currentToken)
        //  sendTokenToServer(currentToken);
        //updateUIForPushEnabled(currentToken);
    } else {
        // Show permission request.
        console.log('No Instance ID token available. Request permission to generate one.');
        // Show permission UI.
        //  updateUIForPushPermissionRequired();
        //setTokenSentToServer(false);
    }
}).catch(err => {
    console.log('An error occurred while retrieving token. ', err);
    console.log('Error retrieving Instance ID token. ', err);
    //  setTokenSentToServer(false);
});