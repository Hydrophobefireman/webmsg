import {
    $,
    dumps,
    getUser,
    trace
} from "../commons.js"
const toggle_menu = () => {
        const b = $.id("Nzk3NzEzOD");
        "opened" === $.id("__menubox__").getAttribute("data-stat") && b.click()
    },
    menuBtnOnClick = () => {
        const b = document.getElementById("__menubox__");
        return "closed" == b.getAttribute("data-stat") ? (
                void($.set(b, "data-stat", "opened"), b.style.marginBottom = "0px")) :
            ($.set(b, "data-stat", "closed"), b.style.marginBottom = "-250px")
    };
export const _getUiComponent = (chatWith, fn, addAttachment, logoutFn) => {
    const g = {
        element: "div",
        attrs: {
            "class": "chat_box"
        },
        children: [{
            element: "div",
            attrs: {
                "class": "chat_head"
            },
            children: [{
                element: "span",
                textContent: "\u2630",
                events: {
                    click: menuBtnOnClick
                },
                attrs: {
                    "class": "menubox",
                    id: "Nzk3NzEzOD"
                }
            }, {
                element: "span",
                attrs: {
                    id: "__chat-with-prof",
                    "class": "chat_with"
                },
                textContent: chatWith
            }]
        }, {
            element: "div",
            attrs: {
                id: "__menubox__",
                "data-stat": "closed",
                "class": "menu-details"
            },
            children: [{
                element: "div",
                attrs: {
                    "class": "img-button-holder"
                },
                textContent: "Add An Attachment",
                events: {
                    click(e) {
                        e.stopPropagation()
                        addAttachment(e)
                    }
                }
            }, {
                element: "div",
                attrs: {
                    "class": "img-button-holder"
                },
                textContent: "Close Conversation",
                events: {
                    async click(e) {
                        e.stopPropagation()
                        const x = await getUser();
                        return x ? location.hash = `/u/${x}` : "/";
                    }
                }
            }, {
                element: "div",
                attrs: {
                    "class": "img-button-holder"
                },
                textContent: "Logout",
                events: {
                    click(e) {
                        e.stopPropagation()
                        logoutFn(e);

                    }
                }
            }]
        }, {
            element: "div",
            attrs: {
                "class": "chat_body",
                id: "_msg_body"
            },
            events: {
                click: toggle_menu
            }
        }, {
            element: "input",
            attrs: {
                type: "text",
                placeholder: "Type a Message",
                "class": "chat_inp",
            },
            events: {
                keydown: fn
            },
            children: []
        }]
    };
    return {
        element: "div",
        attrs: {
            "class": "chat_box_wrap"
        },
        children: [g]
    }
};
export const _closeConversation = async (a, b) => {
    const f = await getUser();
    try {
        b && "function" == typeof b.send && b.send(dumps({
            data: null,
            __close__: !0
        }))
    } catch (g) {
        trace(`Couldnt send closing message-->${g}`)
    };
    return "undefined" != typeof a && "undefined" != typeof b && (b.onclose = a.onclose = () => {
        trace("Destroying Conversation", "log")
    }, b.close(), a.close()), location.hash = f ? `/u/${f}` : "/"
};
export const createChatBox = (chatWith, app, fn, addAttachment, logoutFn) => {
    const resultsAll = $.id("results-all");
    $.empty(resultsAll);
    resultsAll.style.display = "block";
    app.render(_getUiComponent(chatWith, fn, addAttachment, logoutFn), resultsAll, !0);
};