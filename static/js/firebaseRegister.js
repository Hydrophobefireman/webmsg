if (!!window.Notification) {
    if (typeof firebase === 'undefined') throw new Error(
        'hosting/init-error: Firebase SDK not detected. You must include it before /__/firebase/init.js'
    );
    firebase.initializeApp({
        "apiKey": "AIzaSyCrdjBktQNWizVmfjK50I7BGsIQcNFmKcI",
        "databaseURL": "https://webmsg-py.firebaseio.com",
        "storageBucket": "webmsg-py.appspot.com",
        "authDomain": "webmsg-py.firebaseapp.com",
        "messagingSenderId": "193257233140",
        "projectId": "webmsg-py"
    });
}