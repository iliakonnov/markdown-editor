'use strict';
document.getElementsByTagName("head")[0].insertAdjacentHTML(
    "beforeend",
    `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.13.11/dist/katex.min.css" />
<style>
    .leqno>.katex>.katex-html>.tag {
        left: -2em !important;
    }
</style>
`);

const macros = {
    "\\Σ": "\\sum",
    "∄": "\\nexists",
    "·": "\\cdot",
    "⊲": "\\lhd",
    "⊥": "\\perp",
    "∥": "\\parallel",
    "∖": "\\setminus",
    "ø": "\\varnothing",
    "𝓔": "\\mathcal{E}",
    "\\o": "\\varnothing",
    "\\RN": "\\mathrm{\\Romannumeral{#1}}",
    "\\Romannumeral": function(ctx) {
        const num = ctx.consumeArgs(1)[0][0].text;
        if (isNaN(num)) return num.toString();
            var digits = String(+num).split(""),
                key = ["","C","CC","CCC","CD","D","DC","DCC","DCCC","CM",
                       "","X","XX","XXX","XL","L","LX","LXX","LXXX","XC",
                       "","I","II","III","IV","V","VI","VII","VIII","IX"],
                roman = "",
                i = 3;
            while (i--)
                roman = (key[+digits.pop() + (i * 10)] || "") + roman;
            return Array(+digits.join("") + 1).join("M") + roman;
    }
};

function doKaTeX(text, display) {
    let latex = makeScripts(text);
    try {
        let html = katex.renderToString(latex, {
          macros: macros,
          fleqn: true,
          leqno: true,
          displayMode: display,
          strict: false,
        });
        return {
            'ok': true,
            'text': html
        };
    } catch (err) {
        return {
            'ok': false,
            'text': err
        };
    }
}

function makeScripts(text) {
    const superscript_map = {
            '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁻': '-', '⁺': '+', '⁼': '=',
            'ⁱ': 'i', 'ʲ': 'j', 'ⁿ': 'n', 'ʳ': 'r', 'ᵗ': 't'}
    const subscript_map = {
            '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₋': '-', '₊': '+', '₌': '=',
            'ᵢ': 'i', 'ⱼ': 'j', 'ₖ': 'k', 'ₙ': 'n', 'ₘ': 'm', 'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't',
            'ₐ': 'a'}
    let new_text = '';
    let last_group = null;
    for (let l of text) {
    let group = null;

    let conv = superscript_map[l];
    if (conv !== undefined) {
        group = "super";
    } else {
        conv = subscript_map[l];
        if (conv !== undefined) {
            group = "sub";
        }
    }
    if (conv !== undefined) {
        l = conv;
    }

    if (last_group !== group) {
        if (!!last_group) {
            new_text += '}';
        }
        if (group === "super") {
            new_text += '^{';
        }
        if (group === "sub") {
            new_text += '_{';
        }
        last_group = group;
    }
    new_text += l;
    }
    if (!!last_group) {
        new_text += '}';
    }
    return new_text;
}

function isScrolledIntoView(el) {
    let rect = el.getBoundingClientRect();
    let elemTop = rect.top;
    let elemBottom = rect.bottom;

    // Partially visible elements return true:
    let isVisible = elemTop < window.innerHeight && elemBottom >= 0;
    return isVisible;
}

function renderMath(root) {
    var t0 = performance.now()
    let elems = root.querySelectorAll("pre,code");
    for (let el of elems) {
        if (!el.parentNode) continue;
        let display = el.classList.contains("language-math") || el.classList.contains("lang-math");

        let prev = el.previousSibling;
        let next = el.nextSibling;
        let inline = (
            next &&
            next.nodeName === "#text" &&
            next.textContent.startsWith("$") &&
            prev &&
            prev.nodeName === "#text" &&
            prev.textContent.endsWith("$")
        );

        let is_math = display || inline;
        if (!is_math) continue;

        if (display && el.parentElement.tagName.toUpperCase() == "PRE") {
            el = el.parentElement;
        }

        let latex = el.textContent;
        let rendered = doKaTeX(el.textContent, display);

        if (!rendered.ok) {
            console.log(el);
            console.error(rendered.text);
            el.textContent = rendered.text;
            continue;
        }
        let katexElement = document.createElement(display ? "div" : "span");
        katexElement.setAttribute("class", (display ? "equation" : "inline-equation") + " mathMagic");
        katexElement.innerHTML = rendered.text;

        if (!el.parentNode) continue;
        el.parentNode.replaceChild(katexElement, el);
        if (inline) {
            next.textContent = next.textContent.substr(1);
            prev.textContent = prev.textContent.substr(0, prev.textContent.length - 1);
        }
    }
    var t1 = performance.now()
    //console.log("Rendering math took " + (t1 - t0) + " milliseconds.")
}
