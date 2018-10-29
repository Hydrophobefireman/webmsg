(() => {
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
        },
        $ = {
            id: (_id) => {
                return document.getElementById(_id)
            },
            className: (klass, single_only = true) => {
                const _ = [].slice.call(document.getElementsByClassName(klass));
                if (single_only) {
                    return _[0]
                } else {
                    return _
                }
            }
        },
        errsAndNotices = $.id('errors-and-errsAndNotices');
    String.prototype.isValid = function () {
        if (this.length > 0) {
            return /^[0-9a-zA-Z_.-]+$/.test(this);
        }
    }
    const urlencode = json => {
        return `${Object.keys(json).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`).join('&')}`;
    }
    const integrity = document.querySelector('meta[name="integrity"]').content;
    const errs = $.id('errors');
    const loginbtn = $.id("login-btn"),
        registerbtn = $.id("register-btn");
    registerbtn.addEventListener("click", async () => {
        const pass = $.id('password-reg').value,
            pass_conf = $.id('password-reg-conf').value;
        if (pass !== pass_conf) {
            return errsAndNotices.innerHTML = 'Passwords Do Not Match!';
        } else {
            errsAndNotices.innerHTML = 'Loading'
            const data = await fetch("/register/check/", {
                credentials: 'include',
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                },
                method: "post",
                body: urlencode({
                    user: $.id('username-reg').value,
                    password: pass,
                    checkpw: pass_conf,
                    integrity
                })
            });
            try {
                const resp = await data.json();
                if (data.status === 403) {
                    const possibiliies = _responses.register,
                        text = possibiliies[resp.error];
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

        }
    })
    loginbtn.addEventListener('click', async () => {
        errsAndNotices.innerHTML = 'Loading'
        const data = await fetch("/login/check/", {
            credentials: 'include',
            method: 'post',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: urlencode({
                user: $.id('username-log').value,
                password: $.id('password-log').value,
                integrity
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
                window.location.replace(`/u/${resp.user}`)
            }
        } catch (e) {
            console.log(e);
            return errsAndNotices.innerHTML = 'An Error Occured..please reload the page and try again'
        }
    });
    $.id('password-log').addEventListener('keydown', (e) => {
        const inp = $.id('password-log'),
            user = $.id('username-log');
        if (inp.value.length !== 0 && user.value.length !== 0 && e.keyCode === 13) {
            loginbtn.click()
        }
    })
    const usrreg = $.id('username-reg'),
        passreg = $.id('password-reg'),
        passreg_conf = $.id("password-reg-conf");
    check_passwords = (target) => {
        const val = target.value;
        const mainval = passreg.value;
        if (val !== mainval) {
            errs.style.visibility = 'visible';
            errs.innerHTML = 'Passwords Do Not Match!';
            registerbtn.disabled = true;
        } else {
            errs.style.visibility = 'hidden';
            errs.innerHTML = '';
            registerbtn.disabled = false;
        }
    }
    passreg_conf.oninput = ({
        target
    }) => {
        check_passwords(target)
    };
    passreg_conf.onkeydown = (e) => {
        if (e.keyCode === 13 && !registerbtn.disabled) {
            registerbtn.click()
        }
    }
    passreg.oninput = () => {
        if (passreg_conf.value.length > 0) {
            check_passwords(passreg_conf)
        }
    }

    function checkDataValidity(target) {
        const val = target.value;
        if (!val.isValid()) {
            errs.style.visibility = 'visible';
            errs.innerHTML = 'Invalid Characters!';
            passreg.disabled = !0;
            passreg_conf.disabled = !0;
        } else if (val.length < 4) {
            errs.style.visibility = 'visible';
            errs.innerHTML = 'Username Too Short';
            passreg.disabled = !0;
            passreg_conf.disabled = !0;
        } else if (val.length > 30) {
            errs.style.visibility = 'visible';
            errs.innerHTML = 'Username Too Long';
            passreg.disabled = !0;
            passreg_conf.disabled = !0;
        } else {
            passreg.disabled = !1;
            passreg_conf.disabled = !1;
        }
    }
    usrreg.oninput = ({
        target
    }) => {
        errs.style.visibility = 'hidden';
        errs.innerHTML = ''
        checkDataValidity(target)
    }
    const loginb = $.id("login");
    const signupb = $.id("signup");
    loginb.onclick = () => {
        login.style.backgroundColor = "#6200ee";
        login.style.color = '#fff';
        signupb.style.backgroundColor = "#fff";
        signupb.style.color = "#6200ee";
        $.id("lfbox").style.display = 'block';
        $.id("rfbox").style.display = 'none';
    }
    signupb.onclick = () => {
        signupb.style.backgroundColor = "#6200ee";
        signupb.style.color = '#fff';
        loginb.style.backgroundColor = "#fff";
        loginb.style.color = "#6200ee";
        $.id("rfbox").style.display = 'block';
        $.id("lfbox").style.display = 'none';
    }
})()