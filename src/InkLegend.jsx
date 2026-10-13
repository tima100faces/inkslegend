/*
 * InkLegend v1.1.0 — ink color legend generator for Adobe Illustrator. MIT License.
 * Dark strip with color cards — inside artboard, top-right corner
 */

(function () {

    var DEFAULTS = {
        technicalNames: ["film", "transparency", "foil", "substrate"],
        technicalExact: ["t"],
        sizeLayerNames: ["layout", "die", "dieline", "diecut", "cutter", "cut"],
        fallbackFonts: ["ArialMT", "Helvetica", "MyriadPro-Regular"],
        maxFileNameLength: 55
    };

    var MM = 2.834645669;
    var INSET = 10 * MM;

    var L = {
        stripH: 84,
        pad: 12,
        logoPad: 14,
        logoMaxW: 120,
        cardW: 42,
        cardH: 42,
        swatchH: 30,
        labelH: 12,
        cardGap: 12,
        sectionGap: 14,
        divW: 0.5,
        inkCntW: 72,
        metaGap: 1,
        cornerR: 4,
        cardTopPad: 18,
        sectionLabelGap: 8
    };

    var FS = {
        sectionLabel: 6,
        cardLabel: 7.5,
        inkNum: 34,
        inkLabel: 5.5,
        meta: 11
    };

    // ---- SETTINGS ----
    var _settingsFile = "InkLegend_settings.json";
    function settingsPath() {
        var dir = new Folder(Folder.userData + "/InkLegend");
        if (!dir.exists) dir.create();
        return new File(dir + "/" + _settingsFile);
    }

    function loadSettings() {
        var d = {
            companyName: "",
            logoPath: "",
            fontName: "",
            blackAsSpot: false,
            technicalNames: DEFAULTS.technicalNames.slice(0),
            technicalExact: DEFAULTS.technicalExact.slice(0)
        };
        try {
            var f = settingsPath();
            if (f.exists) {
                f.open("r"); var p = eval("(" + f.read() + ")"); f.close();
                if (p.companyName !== undefined) d.companyName = p.companyName;
                if (p.logoPath !== undefined) d.logoPath = p.logoPath;
                if (p.fontName !== undefined) d.fontName = p.fontName;
                if (p.blackAsSpot !== undefined) d.blackAsSpot = p.blackAsSpot;
                if (p.technicalNames) d.technicalNames = p.technicalNames;
                if (p.technicalExact) d.technicalExact = p.technicalExact;
            }
        } catch (e) { }
        return d;
    }

    function saveSettings(s) {
        try {
            var f = settingsPath(); f.open("w");
            var tn = [], te = [];
            for (var i = 0; i < s.technicalNames.length; i++) tn.push('"' + s.technicalNames[i] + '"');
            for (var i = 0; i < s.technicalExact.length; i++) te.push('"' + s.technicalExact[i] + '"');
            f.write('{\n');
            f.write('  "companyName": "' + (s.companyName || "").replace(/"/g, '\\"') + '",\n');
            f.write('  "logoPath": "' + (s.logoPath || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '",\n');
            f.write('  "fontName": "' + (s.fontName || "").replace(/"/g, '\\"') + '",\n');
            f.write('  "blackAsSpot": ' + (s.blackAsSpot ? 'true' : 'false') + ',\n');
            f.write('  "technicalNames": [' + tn.join(', ') + '],\n');
            f.write('  "technicalExact": [' + te.join(', ') + ']\n');
            f.write('}\n');
            f.close();
        } catch (e) { }
    }

    // ---- FONTS ----
    function findFont(name) {
        if (name) { try { return app.textFonts.getByName(name); } catch (e) { } }
        for (var i = 0; i < DEFAULTS.fallbackFonts.length; i++) {
            try { return app.textFonts.getByName(DEFAULTS.fallbackFonts[i]); } catch (e) { }
        }
        return app.textFonts[0];
    }

    function findBold(rf) {
        var n = rf.name;
        var t = [n.replace("Regular", "Bold"), n.replace("-Regular", "-Bold"),
                 n + "-Bold", n.replace(/Regular$/i, "Bold")];
        for (var i = 0; i < t.length; i++) {
            try { var f = app.textFonts.getByName(t[i]); if (f) return f; } catch (e) { }
        }
        return rf;
    }

    function fontList() {
        var f = [];
        for (var i = 0; i < app.textFonts.length; i++) f.push(app.textFonts[i].name);
        f.sort(); return f;
    }

    // ---- COLORS ----
    function isTechnical(name, settings) {
        var lo = name.toLowerCase().replace(/[\s_-]/g, "");
        for (var i = 0; i < settings.technicalExact.length; i++) {
            if (lo === settings.technicalExact[i].toLowerCase()) return true;
        }
        for (var i = 0; i < settings.technicalNames.length; i++) {
            var tn = settings.technicalNames[i].toLowerCase();
            if (lo === tn || lo.indexOf(tn) === 0) return true;
        }
        return false;
    }

    function isProcessSwatch(name) {
        var lo = name.toLowerCase().replace(/\s/g, "");
        if (/^c=\d+m=\d+y=\d+k=\d+$/.test(lo)) return true;
        if (lo === "cyan" || lo === "magenta" || lo === "yellow" || lo === "black") return true;
        if (lo === "[cyan]" || lo === "[magenta]" || lo === "[yellow]" || lo === "[black]") return true;
        return false;
    }

    function shortenName(name) {
        return name.replace(/^PANTONE\s+/i, "P");
    }

    function collectColors(doc, settings) {
        var usedSpots = {};
        var cmyk = { c: false, m: false, y: false, k: false };
        var hasProcess = false;

        function chk(color) {
            if (!color) return;
            if (color.typename === "CMYKColor") {
                hasProcess = true;
                if (color.cyan > 0) cmyk.c = true;
                if (color.magenta > 0) cmyk.m = true;
                if (color.yellow > 0) cmyk.y = true;
                if (color.black > 0) cmyk.k = true;
            } else if (color.typename === "GrayColor") {
                hasProcess = true;
                if (color.gray > 0) cmyk.k = true;
            } else if (color.typename === "SpotColor") {
                usedSpots[color.spot.name] = true;
            }
        }

        function scan(item) {
            try {
                if (item.hidden) return;
                if (item.typename === "PathItem") {
                    if (item.filled) chk(item.fillColor);
                    if (item.stroked) chk(item.strokeColor);
                } else if (item.typename === "CompoundPathItem") {
                    if (item.pathItems.length > 0) {
                        var p = item.pathItems[0];
                        if (p.filled) chk(p.fillColor);
                        if (p.stroked) chk(p.strokeColor);
                    }
                } else if (item.typename === "TextFrame") {
                    var len = Math.min(item.textRanges.length, 300);
                    for (var c = 0; c < len; c++) {
                        try { chk(item.textRanges[c].characterAttributes.fillColor); } catch (e) { }
                    }
                } else if (item.typename === "GroupItem") {
                    for (var g = 0; g < item.pageItems.length; g++) scan(item.pageItems[g]);
                }
            } catch (e) { }
        }

        function scanLayer(layer) {
            for (var pi = 0; pi < layer.pageItems.length; pi++) scan(layer.pageItems[pi]);
            for (var si = 0; si < layer.layers.length; si++) scanLayer(layer.layers[si]);
        }

        for (var li = 0; li < doc.layers.length; li++) scanLayer(doc.layers[li]);

        var res = { hasProcess: hasProcess, cmyk: cmyk, spots: [], technicals: [] };

        for (var s = 0; s < doc.spots.length; s++) {
            var sp = doc.spots[s];
            if (sp.name === "[Registration]" || !usedSpots[sp.name]) continue;
            if (isProcessSwatch(sp.name)) {
                hasProcess = true;
                res.hasProcess = true;
                var lo = sp.name.toLowerCase();
                if (lo.indexOf("c=") >= 0 || lo === "cyan") cmyk.c = true;
                if (lo.indexOf("m=") >= 0 || lo === "magenta") cmyk.m = true;
                if (lo.indexOf("y=") >= 0 || lo === "yellow") cmyk.y = true;
                if (lo.indexOf("k=") >= 0 || lo === "black") cmyk.k = true;
                continue;
            }
            var entry = { name: sp.name, spot: sp, color: sp.color };
            if (isTechnical(sp.name, settings)) res.technicals.push(entry);
            else res.spots.push(entry);
        }
        res.cmyk = cmyk;
        return res;
    }

    // ---- DIALOG ----
    function showDialog(colors, settings) {
        var dlg = new Window("dialog", "InkLegend");
        dlg.orientation = "column"; dlg.alignChildren = ["fill", "top"];

        var sp = dlg.add("panel", undefined, "Settings");
        sp.alignChildren = ["fill", "top"]; sp.margins = [10, 18, 10, 10];

        var r1 = sp.add("group");
        r1.add("statictext", undefined, "Company Name:");
        var cnI = r1.add("edittext", undefined, settings.companyName || ""); cnI.characters = 22;

        var r2 = sp.add("group");
        r2.add("statictext", undefined, "Logo file:");
        var logoI = r2.add("edittext", undefined, settings.logoPath || ""); logoI.characters = 28;
        var logoBrowseBtn = r2.add("button", undefined, "Browse...");
        logoBrowseBtn.onClick = function () {
            var filter = (File.fs === "Windows")
                ? "Logo files:*.ai;*.pdf;*.eps;*.png;*.jpg;*.jpeg"
                : function (f) { if (f instanceof Folder) return true; return /\.(ai|pdf|eps|png|jpe?g)$/i.test(f.name); };
            var picked = File.openDialog("Select logo file", filter);
            if (picked) logoI.text = picked.fsName;
        };

        var r3 = sp.add("group");
        r3.add("statictext", undefined, "Font:");
        var fD = r3.add("dropdownlist", undefined, []);
        fD.preferredSize = [200, 25];
        var fl = fontList();
        for (var i = 0; i < fl.length; i++) fD.add("item", fl[i]);
        var si = 0;
        for (var i = 0; i < fl.length; i++) { if (fl[i] === settings.fontName) { si = i; break; } }
        fD.selection = si;

        var tp = dlg.add("panel", undefined, "Technical color names");
        tp.alignChildren = ["fill", "top"]; tp.margins = [10, 18, 10, 10];
        var techStr = settings.technicalNames.join(", ");
        if (settings.technicalExact.length > 0) techStr += ", " + settings.technicalExact.join(", ");
        tp.add("statictext", undefined, "Comma-separated:");
        var techInput = tp.add("edittext", undefined, techStr);
        techInput.characters = 45;

        var cp = dlg.add("panel", undefined, "Colors to include");
        cp.alignChildren = ["fill", "top"]; cp.margins = [10, 18, 10, 10];

        var cbs = [];

        if (colors.hasProcess) {
            cp.add("statictext", undefined, "Process (CMYK):");
            var cg = cp.add("group");
            var ch = [
                { key: "c", label: "Cyan", on: colors.cmyk.c },
                { key: "m", label: "Magenta", on: colors.cmyk.m },
                { key: "y", label: "Yellow", on: colors.cmyk.y },
                { key: "k", label: "Black", on: colors.cmyk.k }
            ];
            for (var i = 0; i < ch.length; i++) {
                var cb = cg.add("checkbox", undefined, ch[i].label);
                cb.value = ch[i].on; cb.enabled = ch[i].on;
                cb._t = "cmyk"; cb._ch = ch[i].key; cbs.push(cb);
            }
        }

        if (colors.spots.length > 0) {
            var sep1 = cp.add("panel", undefined, undefined); sep1.preferredSize = [400, 0];
            cp.add("statictext", undefined, "Spot colors:");
            for (var i = 0; i < colors.spots.length; i++) {
                var cb = cp.add("checkbox", undefined, colors.spots[i].name);
                cb.value = true; cb._t = "spot"; cb._i = i; cbs.push(cb);
            }
        }

        if (colors.technicals.length > 0) {
            var sep2 = cp.add("panel", undefined, undefined); sep2.preferredSize = [400, 0];
            cp.add("statictext", undefined, "Technical:");
            for (var i = 0; i < colors.technicals.length; i++) {
                var cb = cp.add("checkbox", undefined, colors.technicals[i].name);
                cb.value = true; cb._t = "tech"; cb._i = i; cbs.push(cb);
            }
        }

        if (cbs.length === 0) cp.add("statictext", undefined, "No colors found.");

        // Black as a Pantone spot: moves K from PROCESS to a "PANTONE Black" card in SPOT.
        // Disabled when the file has no black, so the saved preference is kept for the next file.
        var blackSpotCb = dlg.add("checkbox", undefined, "Black as PANTONE Black (spot)");
        blackSpotCb.enabled = colors.cmyk.k;
        blackSpotCb.value = colors.cmyk.k && settings.blackAsSpot;

        var companyForLabel = cnI.text || "us";
        var spotRecCb = dlg.add("checkbox", undefined, "Spot Colors added by " + companyForLabel);
        spotRecCb.value = false;

        cnI.onChanging = function () {
            spotRecCb.text = "Spot Colors added by " + (cnI.text || "us");
        };

        var bg = dlg.add("group"); bg.alignment = ["right", "bottom"];
        bg.add("button", undefined, "Cancel", { name: "cancel" }).onClick = function () { dlg.close(0); };
        bg.add("button", undefined, "Generate Legend", { name: "ok" }).onClick = function () { dlg.close(1); };

        if (dlg.show() !== 1) return null;

        var techParts = techInput.text.split(",");
        var newTN = [], newTE = [];
        for (var i = 0; i < techParts.length; i++) {
            var t = techParts[i].replace(/^\s+|\s+$/g, "").toLowerCase();
            if (t.length === 0) continue;
            if (t.length <= 2) newTE.push(t); else newTN.push(t);
        }

        var sel = {
            cmyk: { c: false, m: false, y: false, k: false },
            spots: [], technicals: [],
            spotRecommendation: spotRecCb.value,
            settings: {
                companyName: cnI.text,
                logoPath: logoI.text,
                fontName: fD.selection ? fD.selection.text : "",
                blackAsSpot: blackSpotCb.enabled ? blackSpotCb.value : settings.blackAsSpot,
                technicalNames: newTN,
                technicalExact: newTE
            }
        };

        for (var i = 0; i < cbs.length; i++) {
            if (!cbs[i].value) continue;
            if (cbs[i]._t === "cmyk") sel.cmyk[cbs[i]._ch] = true;
            else if (cbs[i]._t === "spot") sel.spots.push(colors.spots[cbs[i]._i]);
            else if (cbs[i]._t === "tech") sel.technicals.push(colors.technicals[cbs[i]._i]);
        }

        // Skip if the file already has a real "PANTONE Black" spot in use (old manual workflow).
        var hasBlackSpot = false;
        for (var i = 0; i < sel.spots.length; i++) {
            if (/^pantone\s+black(\s+[cu])?$/i.test(sel.spots[i].name)) hasBlackSpot = true;
        }
        if (blackSpotCb.enabled && blackSpotCb.value && sel.cmyk.k) {
            sel.cmyk.k = false;
            // spot: null → addCard falls back to the CMYK fill, nothing is added to the document
            if (!hasBlackSpot) sel.spots.push({ name: "PANTONE Black", spot: null, color: makeCMYK(0, 0, 0, 100) });
        }
        return sel;
    }

    // ---- DRAW HELPERS ----
    function makeCMYK(c, m, y, k) {
        var col = new CMYKColor(); col.cyan = c; col.magenta = m; col.yellow = y; col.black = k; return col;
    }
    function bgColor()   { return makeCMYK(0, 0, 0, 90); }
    function white()     { return makeCMYK(0, 0, 0, 0); }
    function midGray()   { return makeCMYK(0, 0, 0, 40); }
    function metaColor() { return makeCMYK(0, 0, 0, 60); }
    function divColor()  { return makeCMYK(0, 0, 0, 60); }

    // ---- DRAW LEGEND ----
    function createLegend(doc, sel, settings) {
        var font = findFont(settings.fontName);
        var bold = findBold(font);
        var abRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;

        var cmykList = [];
        var cmykDef = { c: [100,0,0,0,"C"], m: [0,100,0,0,"M"], y: [0,0,100,0,"Y"], k: [0,0,0,100,"K"] };
        var keys = ["c", "m", "y", "k"];
        for (var i = 0; i < keys.length; i++) {
            if (sel.cmyk[keys[i]]) cmykList.push({ vals: cmykDef[keys[i]], label: cmykDef[keys[i]][4] });
        }

        var hasProc = cmykList.length > 0;
        var nSpot = sel.spots.length;
        var nTech = sel.technicals.length;
        var totalInks = cmykList.length + nSpot;

        var logoAreaW = L.logoMaxW + L.logoPad;
        var procCardsW = hasProc ? (cmykList.length * L.cardW + (cmykList.length - 1) * L.cardGap) : 0;
        var spotCardsW = nSpot > 0 ? (nSpot * L.cardW + (nSpot - 1) * L.cardGap) : 0;
        var techCardsW = nTech > 0 ? (nTech * L.cardW + (nTech - 1) * L.cardGap) : 0;
        var procSectionW = hasProc ? (L.pad + procCardsW + L.pad) : 0;
        var spotSectionW = nSpot > 0 ? (L.pad + spotCardsW + L.pad) : 0;
        var techSectionW = nTech > 0 ? (L.pad + techCardsW + L.pad) : 0;
        var numSections = (hasProc ? 1 : 0) + (nSpot > 0 ? 1 : 0) + (nTech > 0 ? 1 : 0);
        var sectionDividers = Math.max(numSections - 1, 0);
        var cardsAreaW = procSectionW + spotSectionW + techSectionW + sectionDividers * L.sectionGap;
        var totalW = L.logoPad + logoAreaW + L.sectionGap + cardsAreaW + L.sectionGap + L.inkCntW + L.pad;
        if (totalW < 360) totalW = 360;

        var x0 = abRect[2] - INSET - totalW;
        var y0 = abRect[1] - INSET;
        var items = [];

        function addR(x, y, w, h, fill, stroke, sw, rr) {
            var r;
            if (rr && rr > 0) { r = doc.pathItems.roundedRectangle(y, x, w, h, rr, rr); }
            else { r = doc.pathItems.rectangle(y, x, w, h); }
            if (fill !== null && fill !== undefined) { r.filled = true; r.fillColor = fill; }
            else { r.filled = false; }
            if (stroke) { r.stroked = true; r.strokeColor = stroke; r.strokeWidth = sw || 0.5; }
            else { r.stroked = false; }
            items.push(r); return r;
        }

        function addL(x1, y1, x2, y2, col, w) {
            var l = doc.pathItems.add();
            l.setEntirePath([[x1, y1], [x2, y2]]);
            l.filled = false; l.stroked = true;
            l.strokeColor = col || divColor(); l.strokeWidth = w || 0.5;
            items.push(l);
        }

        function addT(s, x, y, sz, col, f) {
            var t = doc.textFrames.add();
            t.contents = s; t.position = [x, y];
            t.textRange.characterAttributes.size = sz;
            t.textRange.characterAttributes.textFont = f || font;
            t.textRange.characterAttributes.fillColor = col || white();
            items.push(t); return t;
        }

        function addCenteredT(s, rectX, rectY, rectW, rectH, sz, col, f) {
            var helperRect = doc.pathItems.rectangle(rectY, rectX, rectW, rectH);
            helperRect.filled = false; helperRect.stroked = false;
            var t = doc.textFrames.areaText(helperRect);
            t.contents = s;
            t.textRange.characterAttributes.size = sz;
            t.textRange.characterAttributes.textFont = f || font;
            t.textRange.characterAttributes.fillColor = col || makeCMYK(0, 0, 0, 85);
            t.textRange.paragraphAttributes.justification = Justification.CENTER;
            items.push(t); return t;
        }

        function addCard(cx, cardTopY, label, fillColor, spotObj) {
            addR(cx, cardTopY, L.cardW, L.cardH, white(), null, 0, 0);
            var swR = doc.pathItems.rectangle(cardTopY, cx, L.cardW, L.swatchH);
            swR.filled = true;
            if (spotObj) {
                try {
                    var sc = new SpotColor(); sc.spot = spotObj; sc.tint = 100;
                    swR.fillColor = sc;
                } catch (e) { swR.fillColor = fillColor || makeCMYK(0, 0, 0, 50); }
            } else {
                swR.fillColor = fillColor || makeCMYK(0, 0, 0, 50);
            }
            swR.stroked = false; items.push(swR);
            var labelRectY = cardTopY - L.swatchH - 2;
            addCenteredT(label, cx, labelRectY, L.cardW, L.labelH, FS.cardLabel, makeCMYK(0, 0, 0, 85), bold);
        }

        // Main strip (bottom of z-stack)
        addR(x0, y0, totalW, L.stripH, bgColor(), null, 0, L.cornerR);

        // Logo — reads logoPath from settings (set via the Settings panel's Browse button).
        // placedItems.add() inserts at the BOTTOM of z-stack, so we bringToFront immediately
        // to place it above the strip. Cards and text are created after, ending up on top.
        var logoX = x0 + L.logoPad;
        var logoOk = false;
        try {
            if (settings.logoPath) {
                var lf = new File(settings.logoPath);
                if (lf.exists) {
                    var pl = doc.placedItems.add();
                    pl.file = lf;
                    try { pl.zOrder(ZOrderMethod.BRINGTOFRONT); } catch (e) { }
                    if (pl.width > L.logoMaxW) { var sc = L.logoMaxW / pl.width * 100; pl.resize(sc, sc); }
                    var plH = pl.height;
                    var plY = y0 - (L.stripH - plH) / 2;
                    pl.position = [logoX, plY];
                    items.push(pl);
                    logoOk = true;
                }
            }
        } catch (e) { }
        if (!logoOk) {
            var phW = 80, phH = 40;
            var phY = y0 - (L.stripH - phH) / 2;
            addR(logoX, phY, phW, phH, makeCMYK(0, 0, 0, 80), makeCMYK(0, 0, 0, 70), 0.5, 0);
            addT("LOGO", logoX + 20, phY - 14, 8, makeCMYK(0, 0, 0, 55));
        }

        // Divider after logo
        var cx = x0 + L.logoPad + logoAreaW;
        var divTopY = y0 - 8;
        var divBotY = y0 - L.stripH + 8;
        addL(cx, divTopY, cx, divBotY, divColor(), L.divW);
        cx += L.sectionGap;

        var blockH = FS.sectionLabel + L.sectionLabelGap + L.cardH;
        var blockTopPad = (L.stripH - blockH) / 2 - 4;
        var sectionLabelY = y0 - blockTopPad;
        var cardTopY = sectionLabelY - FS.sectionLabel - L.sectionLabelGap;

        // Process section
        if (hasProc) {
            addT("PROCESS", cx + L.pad, sectionLabelY, FS.sectionLabel, midGray());
            var cardStartX = cx + L.pad;
            for (var i = 0; i < cmykList.length; i++) {
                var d = cmykList[i];
                var ccx = cardStartX + i * (L.cardW + L.cardGap);
                addCard(ccx, cardTopY, d.label, makeCMYK(d.vals[0], d.vals[1], d.vals[2], d.vals[3]), null);
            }
            cx += procSectionW;
            if (nSpot > 0 || nTech > 0) {
                var divMid = cx + L.sectionGap / 2;
                addL(divMid, divTopY, divMid, divBotY, divColor(), L.divW);
                cx += L.sectionGap;
            }
        }

        // Spot section
        if (nSpot > 0) {
            addT("SPOT", cx + L.pad, sectionLabelY, FS.sectionLabel, midGray());
            var cardStartX = cx + L.pad;
            for (var i = 0; i < nSpot; i++) {
                var sp = sel.spots[i];
                var ccx = cardStartX + i * (L.cardW + L.cardGap);
                addCard(ccx, cardTopY, shortenName(sp.name), sp.color, sp.spot);
            }
            cx += spotSectionW;
            if (nTech > 0) {
                var divMid = cx + L.sectionGap / 2;
                addL(divMid, divTopY, divMid, divBotY, divColor(), L.divW);
                cx += L.sectionGap;
            }
        }

        // Technical section
        if (nTech > 0) {
            addT("TECH (NO PRINT)", cx + L.pad, sectionLabelY, FS.sectionLabel, midGray());
            var cardStartX = cx + L.pad;
            for (var i = 0; i < nTech; i++) {
                var tc = sel.technicals[i];
                var ccx = cardStartX + i * (L.cardW + L.cardGap);
                addCard(ccx, cardTopY, shortenName(tc.name), tc.color, tc.spot);
            }
            cx += techSectionW;
        }

        // Total inks
        var divMidInk = cx + L.sectionGap / 2;
        addL(divMidInk, divTopY, divMidInk, divBotY, divColor(), L.divW);
        var inkX = cx + L.sectionGap;
        addT("TOTAL INKS", inkX + 4, sectionLabelY, FS.inkLabel, midGray());
        var numStr = totalInks.toString();
        var cardCenterY = cardTopY - L.cardH / 2;
        var numRectY = cardCenterY + FS.inkNum * 0.45;
        addCenteredT(numStr, inkX, numRectY, L.inkCntW, FS.inkNum + 4, FS.inkNum, white(), bold);

        // Spot recommendation notice (above strip)
        if (sel.spotRecommendation) {
            var recText = "Spot Colors are Recommended by " + (settings.companyName || "us");
            var recY = y0 + 6 + 15;
            var recT = doc.textFrames.add();
            recT.contents = recText;
            recT.position = [x0, recY];
            recT.textRange.characterAttributes.size = 15;
            recT.textRange.characterAttributes.textFont = bold;
            recT.textRange.characterAttributes.fillColor = makeCMYK(0, 0, 0, 90);
            items.push(recT);
        }

        // Meta line (below strip)
        var metaY = y0 - L.stripH - L.metaGap;
        var now = new Date();
        var ds = "Date:  " + (now.getHours() < 10 ? "0" : "") + now.getHours() + ":" +
            (now.getMinutes() < 10 ? "0" : "") + now.getMinutes() + "  " +
            (now.getDate() < 10 ? "0" : "") + now.getDate() + "." +
            (now.getMonth() + 1 < 10 ? "0" : "") + (now.getMonth() + 1) + "." + now.getFullYear();
        addT(ds, x0, metaY, FS.meta, metaColor());
        var fn = doc.name || "Untitled";
        if (fn.length > DEFAULTS.maxFileNameLength) fn = fn.substring(0, DEFAULTS.maxFileNameLength - 3) + "...";
        addT("File:  " + fn, x0 + totalW * 0.28, metaY, FS.meta, metaColor());

        // Group all items
        if (items.length > 0) {
            doc.selection = null;
            for (var i = 0; i < items.length; i++) {
                try { items[i].selected = true; } catch (e) { }
            }
            try {
                app.executeMenuCommand("group");
                if (doc.selection.length > 0 && doc.selection[0].typename === "GroupItem") {
                    var grp = doc.selection[0];
                    grp.name = "InkLegend";
                    // Embed the logo so the file looks the same on other machines (no broken link).
                    // Done after grouping: embed() invalidates the PlacedItem reference.
                    for (var k = grp.placedItems.length - 1; k >= 0; k--) {
                        try { grp.placedItems[k].embed(); }
                        catch (e) { alert("Legend created, but the logo could not be embedded (still linked):\n" + e); }
                    }
                }
            } catch (e) { }
            doc.selection = null;
        }
    }

    // ---- MAIN ----
    function main() {
        if (app.documents.length === 0) { alert("Open a document first."); return; }

        var doc = app.activeDocument;

        // Remove existing legend
        for (var i = doc.groupItems.length - 1; i >= 0; i--) {
            try { if (doc.groupItems[i].name === "InkLegend") doc.groupItems[i].remove(); } catch (e) { }
        }

        var settings = loadSettings();

        var colors = collectColors(doc, settings);
        var sel = showDialog(colors, settings);
        if (!sel) return;

        saveSettings(sel.settings);
        createLegend(doc, sel, sel.settings);
    }

    main();
})();
