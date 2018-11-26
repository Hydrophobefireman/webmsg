import * as commonsJs from "./commons.js";

import {
    Router
} from "./rtr.js";
import {
    loginComponent
} from "./routes/loginRoute.js";
import {
    userComponent
} from "./routes/userRoute.js";
import {
    chatComponent
} from "./routes/chatRoute.js";
import * as firebaseRegisterJs from "./firebaseRegister.js";
import * as idbJs from "./idb.js";
((async () => {
    idbJs.idbinit();
    try {
        firebaseRegisterJs.__firebase();
    } catch (e) {
        console.log(e) //Probably a network error
    }
    const $ = commonsJs.$;
    const getIntegrity = commonsJs.getIntegrity;
    const urlencode = commonsJs.urlencode;
    const trace = commonsJs.trace;
    const router = new Router($.id("app-root") || document.body);
    router.registerRoute(loginComponent);
    router.registerRoute(userComponent);
    router.registerRoute(chatComponent);
    router.registerRoute(Object.assign({}, {
        "route": "/_500/"
    }, router.statusHandler["500"]))
    router.startLoad();
}))();