var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
navigator.saveBlob = navigator.saveBlob || navigator.msSaveBlob || navigator.mozSaveBlob || navigator.webkitSaveBlob;
window.saveAs = window.saveAs || window.webkitSaveAs || window.mozSaveAs || window.msSaveAs;

// Because highlight.js is a bit awkward at times
var languageOverrides = {
    js: 'javascript',
    html: 'xml'
};

var livestyles;

emojify.setConfig({
    img_dir: 'emoji'
});

var md = markdownit({
        html: true,
        highlight: function(code, lang) {
            if (languageOverrides[lang]) lang = languageOverrides[lang];
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(lang, code).value;
                } catch (e) {}
            }
            return '';
        },
    })
    .use(markdownitFootnote);
md.normalizeLink = url => url;
md.validateLink = () => true;

var hashto;

function update(e) {
    setOutput(e.getValue());

    //If a title is added to the document it will be the new document.title, otherwise use default
    var headerElements = document.querySelectorAll('h1');
    if (headerElements.length > 0 && headerElements[0].textContent.length > 0) {
        title = headerElements[0].textContent;
    } else {
        title = 'Markdown Editor'
    }

    //To avoid to much title changing we check if is not the same as before
    oldTitle = document.title;
    if (oldTitle != title) {
        oldTitle = title;
        document.title = title;
    }
    //clearTimeout(hashto);
    //hashto = setTimeout(updateHash, 1000);
}

/*
This function is used to check for task list notation.
If regex matches the string to task-list markdown format,
then the task-list is rendered to its correct form.
User: @austinmm
*/
var render_tasklist = function(str){
    // Checked task-list box match
	if(str.match(/<li>\[x\]\s+\w+/gi)){
        str = str.replace(/(<li)(>\[x\]\s+)(\w+)/gi, 
          `$1 style="list-style-type: none;"><input type="checkbox" 
          checked style="list-style-type: none; 
          margin: 0 0.2em 0 -1.3em;" disabled> $3`);
    }
    // Unchecked task-list box match
    if (str.match(/<li>\[ \]\s+\w+/gi)){
        str = str.replace(/(<li)(>\[ \]\s+)(\w+)/gi, 
          `$1 style="list-style-type: none;"><input type="checkbox" 
            style="list-style-type: none; 
            margin: 0 0.2em 0 -1.3em;" disabled> $3`);
    }
    return str
}

let renderTimer = null;
let old = null;

function setOutput(val) {
    out.style.opacity = 0.7;
    if (renderTimer !== null) clearTimeout(renderTimer);
    renderTimer = setTimeout(function() {
        var out = document.getElementById('out');
        if (old === null) old = out.cloneNode(true);
        out.innerHTML = md.render(val);
        renderMath(out);
        emojify.run(out);
        //console.log(out.innerHTML);
        // Checks if there are any task-list present in out.innerHTML
        out.innerHTML = render_tasklist(out.innerHTML);

        for (let img of out.querySelectorAll("img")) {
            if (img.alt && img.alt[0] === '!') {
                img.setAttribute("style", img.alt.slice(1));
            }
        }
	
	out.style.opacity = 1;

        var allold = old.getElementsByTagName("*");
        if (allold === undefined) return;

        var allnew = out.getElementsByTagName("*");
        if (allnew === undefined) return;

        for (var i = 0, max = Math.min(allold.length, allnew.length); i < max; i++) {
            if (!allold[i].isEqualNode(allnew[i])) {
                out.scrollTop = allnew[i].offsetTop;
                return;
            }
        }
        old = out.cloneNode(true);
    }, 1500);
}

var editor = CodeMirror.fromTextArea(document.getElementById('code'), {
    mode: "gfm",
    lineNumbers: false,
    matchBrackets: true,
    lineWrapping: true,
    theme: 'base16-light',
    extraKeys: {
        "Enter": "newlineAndIndentContinueMarkdownList"
    },
    lineNumbers: true,
    lineWrapping: true,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
});

editor.on('change', update);

function selectionChanger(selection,operator,endoperator){
    if(selection == ""){
        return operator;
    }
    if(!endoperator){
        endoperator = operator
    }
    var isApplied = selection.slice(0, 2) === operator && selection.slice(-2) === endoperator;
    var finaltext = isApplied ? selection.slice(2, -2) : operator + selection + endoperator;
    return finaltext;
}

editor.addKeyMap({
    // bold
    'Ctrl-B': function(cm) {
        cm.replaceSelection(selectionChanger(cm.getSelection(),'**'));
    },
    // italic
    'Ctrl-I': function(cm) {
        cm.replaceSelection(selectionChanger(cm.getSelection(),'_'));
    },
    // code
    'Ctrl-K': function(cm) {
        cm.replaceSelection(selectionChanger(cm.getSelection(),'`'));
    },
    // keyboard shortcut
    'Ctrl-L': function(cm) {
        cm.replaceSelection(selectionChanger(cm.getSelection(),'<kbd>','</kbd>'));
    },
    // paste svg
    'Ctrl-E': function(cm) {
        pasteSvg(cm);
    },
    // remove svg
    'Ctrl-R': function(cm) {
        removeSvg(cm);
    }
});

document.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();

    var reader = new FileReader();
    reader.onload = function(e) {
        editor.setValue(e.target.result);
    };

    reader.readAsText(e.dataTransfer.files[0]);
}, false);

//Print the document named as the document title encoded to avoid strange chars and spaces
function saveAsMarkdown() {
    save(editor.getValue(), document.title.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/\s]/gi, '') + ".md");
}

//Print the document named as the document title encoded to avoid strange chars and spaces
function saveAsHtml() {
    save(document.getElementById('out').innerHTML, document.title.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/\s]/gi, '') + ".html");
}

document.getElementById('saveas-markdown').addEventListener('click', function() {
    saveAsMarkdown();
    hideMenu();
});

document.getElementById('saveas-html').addEventListener('click', function() {
    saveAsHtml();
    hideMenu();
});

function save(code, name) {
    var blob = new Blob([code], {
        type: 'text/plain'
    });
    if (window.saveAs) {
        window.saveAs(blob, name);
    } else if (navigator.saveBlob) {
        navigator.saveBlob(blob, name);
    } else {
        url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", name);
        var event = document.createEvent('MouseEvents');
        event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
        link.dispatchEvent(event);
    }
}

var menuVisible = false;
var menu = document.getElementById('menu');

function showMenu() {
    menuVisible = true;
    menu.style.display = 'block';
}

function hideMenu() {
    menuVisible = false;
    menu.style.display = 'none';
}

function openFile(evt) {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        var files = evt.target.files;
        console.log(files);
        var reader = new FileReader();
        reader.onload = function(file) {
            console.log(file.target.result);
            editor.setValue(file.target.result);
            return true;
        };
        reader.readAsText(files[0]);

    } else {
        alert('The File APIs are not fully supported in this browser.');
    }
}

document.getElementById('close-menu').addEventListener('click', function() {
    hideMenu();
});

document.addEventListener('keydown', function(e) {
    if (e.keyCode == 83 && (e.ctrlKey || e.metaKey)) {
        if ( localStorage.getItem('content') == editor.getValue() ) {
            e.preventDefault();
            return false;
        }
        e.shiftKey ? showMenu() : saveInBrowser();

        e.preventDefault();
        return false;
    }

    if (e.keyCode === 13 && e.ctrlKey) {
        renderMath(out);
    }

    if (e.keyCode === 27 && menuVisible) {
        hideMenu();

        e.preventDefault();
        return false;
    }
});

function clearEditor() {
    editor.setValue("");
}

function saveInBrowser() {
    let key = `content${window.location.search}`
    var text = editor.getValue();
    if (localStorage.getItem(key)) {
        swal({
                title: "Existing Data Detected",
                text: "You will overwrite the data previously saved!",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Yes, overwrite!",
                closeOnConfirm: false
            },
            function() {
                localStorage.setItem(key, text);
                swal("Saved", "Your Document has been saved.", "success");
            });
    } else {
        localStorage.setItem(key, text);
        swal("Saved", "Your Document has been saved.", "success");
    }
    console.log("Saved");
}

function toggleNightMode(button) {
    button.classList.toggle('selected');
    document.getElementById('toplevel').classList.toggle('nightmode');
}

function updateHash() {
    window.location.hash = btoa( // base64 so url-safe
        RawDeflate.deflate( // gzip
            unescape(encodeURIComponent( // convert to utf8
                editor.getValue()
            ))
        )
    );
}

function processQueryParams() {
    var params = window.location.search.split('?')[1];
    if (params) {
        var obj = {};
        params.split('&').forEach(function(elem) {
            obj[elem.split('=')[0]] = elem.split('=')[1];
        });
        if (obj.reading === 'false') {
            document.getElementById('readbutton').click(); // Hide reading view
        }
        if (obj.dark === 'true') {
            document.getElementById('nightbutton').click(); // Show night view
        }
    }
}

function start() {
    processQueryParams();
    if (window.location.hash) {
        var h = window.location.hash.replace(/^#/, '');
        if (h.slice(0, 5) == 'view:') {
            setOutput(decodeURIComponent(escape(RawDeflate.inflate(atob(h.slice(5))))));
            document.body.className = 'view';
        } else {
            editor.setValue(
                decodeURIComponent(escape(
                    RawDeflate.inflate(
                        atob(
                            h
                        )
                    )
                ))
            );
        }
    } else {
        let saved = localStorage.getItem(`content${window.location.search}`)
        if (saved) {
            editor.setValue(saved);
        }
    }
    update(editor);
    editor.focus();
    document.getElementById('fileInput').addEventListener('change', openFile, false);
}

window.addEventListener("beforeunload", function (e) {
    if (!editor.getValue() || editor.getValue() == localStorage.getItem('content')) {
        return;
    }
    var confirmationMessage = 'It looks like you have been editing something. '
                            + 'If you leave before saving, your changes will be lost.';
    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
});

function makeid(length) {
    var result           = [];
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result.push(characters.charAt(Math.floor(Math.random() * 
 charactersLength)));
   }
   return result.join('');
}

function b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}

async function pasteSvg(cm) {
    let content = await navigator.clipboard.readText();
    let doc = new DOMParser().parseFromString(content, "image/svg+xml");
    let elem = doc.children[0];
    document.body.appendChild(elem);
    let bbox = elem.getBBox();
    let viewBox = [bbox.x, bbox.y, bbox.width, bbox.height].join(" ");
    elem.setAttribute("viewBox", viewBox);
    let svg = new XMLSerializer().serializeToString(elem);
    document.body.removeChild(elem);
    let encoded = "data:image/svg+xml;base64," + b64EncodeUnicode(svg);
    let key = makeid(10);
    cm.replaceSelection(`![${cm.getSelection()}][${key}]`);
    editor.replaceRange(`\n[${key}]: ${encoded}`, {line: editor.lastLine()+1, ch:0});
}

function removeSvg(cm) {
    let sel = cm.getSelection();
    let match = sel.match(/^!\[.*\]\[(.*)\]$/);
    if (!match) return;
    let key = match[1];
    let found = null;
    editor.eachLine(line => {
        if (line.text.startsWith(`[${key}]:`)) {
            found = editor.getLineNumber(line);
        }
    });
    if (found) {
        editor.replaceRange('', {line: found, ch: 0}, {line: found+1, ch:0});
        cm.replaceSelection("");
    }
}

start();
