import {
    $,
    getIntegrity,
    urlencode,
    makeCSS,
    makeComponent as H,
} from "../commons.js";
const _responses = {
    login: {
        fields_empty_or_session_error: 'Check Your Username and Password or try to reload the page',
        no_such_user: 'No Such User Exists',
        incorrect_password: 'incorrect password'
    },
    register: {
        fields_empty_or_session_error: 'Check Your Username and Password or try to reload the page',
        bad_request: 'Bad Username or Password',
        username_taken: "Username Already Taken"
    }
};
const isValid = a => {
    if (0 < a.length) return /^[0-9a-zA-Z_.-]+$/.test(a)
};

function checkDataValidity(a) {
    const b = $.id("__errs__");
    $.empty(b);
    const c = a.value,
        d = $.id("password-reg"),
        e = $.id("password-reg-conf");
    isValid(c) ? 4 > c.length ? (
        b.style.visibility = "visible",
        b.innerHTML = "Username Too Short",
        d.disabled = !0, e.disabled = !0
    ) : 30 < c.length ? (
        b.style.visibility = "visible",
        b.innerHTML = "Username Too Long",
        d.disabled = !0, e.disabled = !0
    ) : (
        d.disabled = !1,
        e.disabled = !1
    ) : (
        b.style.visibility = "visible",
        b.innerHTML = "Invalid Characters!",
        d.disabled = !0,
        e.disabled = !0
    )
}
const check_passwords = a => {
    const b = a.value,
        c = $.id("password-reg").value,
        d = $.id("__errs__");
    b === c ? (d.style.visibility = "hidden",
        $.empty(d)
    ) : (
        d.style.visibility = "visible",
        d.innerHTML = "Passwords Do Not Match!"
    )
};

function enableLoginBox(a) {
    const b = a.target;
    b.style.backgroundColor = "#6200ee", b.style.color = "#fff";
    const c = $.id("signup");
    c.style.backgroundColor = "#fff";
    c.style.color = "#6200ee";
    $.id("lfbox").style.display = "block";
    $.id("rfbox").style.display = "none"
}
const startLoginComponent = H("button", {
    id: "login"
}, {
    click: enableLoginBox
}, "Login");

function enableSignupBox(a) {
    const b = a.target;
    b.style.backgroundColor = "#6200ee",
        b.style.color = "#fff";
    const c = $.id("login");
    c.style.backgroundColor = "#fff",
        c.style.color = "#6200ee",
        $.id("rfbox").style.display = "block",
        $.id("lfbox").style.display = "none"
}
const startSignupComponent = H("button", {
    id: "signup"
}, {
    click: enableSignupBox
}, "Signup");


const registerFormComponent = H("div", {
    id: "register-form"
}, null, null, null, null, [
    H("div", {
        id: "__errs__"
    }), H("input", {
        class: "input_x",
        id: "username-reg",
        placeholder: "username"
    }, {
        input({
            target: a
        }) {
            const b = $.id("errors-and-notices");
            $.empty(b), checkDataValidity(a)
        },
        keydown(a) {
            13 === a.keyCode && $.id("password-reg").focus()
        }
    }),
    H("input", {
        class: "input_x",
        id: "password-reg",
        placeholder: "Password",
        type: "password"
    }, {
        input() {
            const a = $.id("password-reg-conf");
            0 < a.value.length && check_passwords(a)
        },
        keydown(a) {
            13 === a.keyCode && $.id("password-reg-conf").focus()
        }
    }), H("input", {
        class: "input_x",
        id: "password-reg-conf",
        placeholder: "Password",
        type: "password"
    }, {
        keydown(a) {
            13 === a.keyCode && $.id("register-btn").click()
        },
        input({
            target
        }) {
            check_passwords(target);
        }
    })

])

async function registerCheck() {
    const regPassword = $.id("password-reg");
    const regUsername = $.id("username-reg");
    const conf_regPassword = $.id("password-reg-conf");
    const pass = regPassword.value,
        pass_conf = conf_regPassword.value;
    const errsAndNotices = $.id("errors-and-notices");
    if (pass !== pass_conf) {
        return errsAndNotices.textContent = "Passwords Do not Match!";
    } else {
        errsAndNotices.textContent = "Loading";
        const data = await fetch("/register/check/", {
            credentials: 'include',
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
            method: "post",
            body: urlencode({
                user: regUsername.value,
                password: pass,
                checkpw: pass_conf,
                integrity: await getIntegrity()
            })
        });
        try {
            const resp = await data.json();
            if (data.status === 403) {
                const possibiliies = _responses.register;
                const text = possibiliies[resp.error];
                errsAndNotices.innerHTML = text;
            } else if (data.status !== 200) /*expecting a 50x error*/ {
                errsAndNotices.innerHTML = 'An Error Occured..please reload the page and try again'
            } else {
                errsAndNotices.innerHTML = 'Account Created. Please Login';
            }
        } catch (e) {
            console.log(e);
            return errsAndNotices.innerHTML = 'An Error Occured..please reload the page and try again'
        }
    };
};
const registerButtonComponent = H("button", {
    class: "submit-button",
    id: "register-btn"
}, {
    click: registerCheck
}, "Signup");
const loginFormComponent = H("div", {
    id: "login-form"
}, null, null, null, null, [
    H("input", {
        class: "input_x",
        id: "username-log",
        placeholder: "username"
    }, {
        keydown(e) {
            if (e.keyCode === 13) {
                $.id("password-log").focus()
            }
        }
    }), H("input", {
        class: "input_x",
        id: "password-log",
        placeholder: "Password",
        type: "password"
    }, {
        keydown(e) {
            const inp = e.target,
                user = $.id("username-log");
            if (inp.value.length !== 0 && user.value.length !== 0 && e.keyCode === 13) {
                $.id("login-btn").click()
            }
        }
    })
]);

async function loginCheck() {
    const errsAndNotices = $.id("errors-and-notices");
    errsAndNotices.innerHTML = 'Loading'
    const data = await fetch("/login/check/", {
        credentials: 'include',
        method: 'post',
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        body: urlencode({
            user: $.id('username-log').value,
            password: $.id("password-log").value,
            integrity: await getIntegrity()

        })
    });
    try {
        const resp = await data.json();
        if (data.status === 403) {
            const possibiliies = _responses.login,
                text = possibiliies[resp.error];
            errsAndNotices.innerHTML = text;
        } else if (data.status !== 200) /*expecting a 50x error*/ {
            errsAndNotices.innerHTML = 'An Error Occured..please reload the page and try again'
        } else {
            errsAndNotices.textContent = "Authenticated";
            location.hash = `/u/${resp.user}`;
            return document.title = `${resp.user} - WebMsg`
        }
    } catch (e) {
        console.log(e);
        return errsAndNotices.innerHTML = 'An Error Occured..please reload the page and try again'
    }

};
const loginButtonComponent = H("button", {
    class: "submit-button",
    id: "login-btn"
}, {
    click: loginCheck
}, "Login");
const rfboxComponent = H("div", {
    id: "rfbox",
    style: makeCSS({
        display: "none"
    })
}, null, null, null, null, [
    registerFormComponent, registerButtonComponent
]);
const lfboxComponent = H("div", {
    id: "lfbox",
    style: makeCSS({
        display: "none"
    })
}, null, null, null, null, [
    loginFormComponent,
    loginButtonComponent
]);
export const loginComponent = H(
    "div", {
        class: "main"
    },
    null, null,
    async () => {
        const a = await fetch('/api/getuser', {
            credentials: 'include'
        });
        if (!a.ok) return null;
        const b = await a.text();
        console.log('[Routing]->/u/' + b), location.hash = '/u/' + b, document.title = b + ' - WebMsg'
    }, async () => {
            console.log("Rendered login page"), document.title = "Login - WebMsg"
        },
        [startLoginComponent, startSignupComponent,
            H("div", {
                id: "errors-and-notices",
                style: makeCSS({
                    color: "red"
                })
            }), lfboxComponent, rfboxComponent
        ], "/");