import { ParseError } from 'angular2/src/compiler/parse_util';
import { HtmlElementAst, HtmlTextAst, HtmlCommentAst, htmlVisitAll } from 'angular2/src/compiler/html_ast';
import { isPresent, isBlank, StringWrapper } from 'angular2/src/facade/lang';
import { Message } from './message';
export const I18N_ATTR = "i18n";
export const I18N_ATTR_PREFIX = "i18n-";
var CUSTOM_PH_EXP = /\/\/[\s\S]*i18n[\s\S]*\([\s\S]*ph[\s\S]*=[\s\S]*"([\s\S]*?)"[\s\S]*\)/g;
/**
 * An i18n error.
 */
export class I18nError extends ParseError {
    constructor(span, msg) {
        super(span, msg);
    }
}
// Man, this is so ugly!
export function partition(nodes, errors) {
    let res = [];
    for (let i = 0; i < nodes.length; ++i) {
        let n = nodes[i];
        let temp = [];
        if (_isOpeningComment(n)) {
            let i18n = n.value.substring(5).trim();
            i++;
            while (!_isClosingComment(nodes[i])) {
                temp.push(nodes[i++]);
                if (i === nodes.length) {
                    errors.push(new I18nError(n.sourceSpan, "Missing closing 'i18n' comment."));
                    break;
                }
            }
            res.push(new Part(null, null, temp, i18n, true));
        }
        else if (n instanceof HtmlElementAst) {
            let i18n = _findI18nAttr(n);
            res.push(new Part(n, null, n.children, isPresent(i18n) ? i18n.value : null, isPresent(i18n)));
        }
        else if (n instanceof HtmlTextAst) {
            res.push(new Part(null, n, null, null, false));
        }
    }
    return res;
}
export class Part {
    constructor(rootElement, rootTextNode, children, i18n, hasI18n) {
        this.rootElement = rootElement;
        this.rootTextNode = rootTextNode;
        this.children = children;
        this.i18n = i18n;
        this.hasI18n = hasI18n;
    }
    get sourceSpan() {
        if (isPresent(this.rootElement))
            return this.rootElement.sourceSpan;
        else if (isPresent(this.rootTextNode))
            return this.rootTextNode.sourceSpan;
        else
            return this.children[0].sourceSpan;
    }
    createMessage(parser) {
        return new Message(stringifyNodes(this.children, parser), meaning(this.i18n), description(this.i18n));
    }
}
function _isOpeningComment(n) {
    return n instanceof HtmlCommentAst && isPresent(n.value) && n.value.startsWith("i18n:");
}
function _isClosingComment(n) {
    return n instanceof HtmlCommentAst && isPresent(n.value) && n.value == "/i18n";
}
function _findI18nAttr(p) {
    let i18n = p.attrs.filter(a => a.name == I18N_ATTR);
    return i18n.length == 0 ? null : i18n[0];
}
export function meaning(i18n) {
    if (isBlank(i18n) || i18n == "")
        return null;
    return i18n.split("|")[0];
}
export function description(i18n) {
    if (isBlank(i18n) || i18n == "")
        return null;
    let parts = i18n.split("|");
    return parts.length > 1 ? parts[1] : null;
}
export function messageFromAttribute(parser, p, attr) {
    let expectedName = attr.name.substring(5);
    let matching = p.attrs.filter(a => a.name == expectedName);
    if (matching.length > 0) {
        let value = removeInterpolation(matching[0].value, matching[0].sourceSpan, parser);
        return new Message(value, meaning(attr.value), description(attr.value));
    }
    else {
        throw new I18nError(p.sourceSpan, `Missing attribute '${expectedName}'.`);
    }
}
export function removeInterpolation(value, source, parser) {
    try {
        let parsed = parser.splitInterpolation(value, source.toString());
        let usedNames = new Map();
        if (isPresent(parsed)) {
            let res = "";
            for (let i = 0; i < parsed.strings.length; ++i) {
                res += parsed.strings[i];
                if (i != parsed.strings.length - 1) {
                    let customPhName = getPhNameFromBinding(parsed.expressions[i], i);
                    customPhName = dedupePhName(usedNames, customPhName);
                    res += `<ph name="${customPhName}"/>`;
                }
            }
            return res;
        }
        else {
            return value;
        }
    }
    catch (e) {
        return value;
    }
}
export function getPhNameFromBinding(input, index) {
    let customPhMatch = StringWrapper.split(input, CUSTOM_PH_EXP);
    return customPhMatch.length > 1 ? customPhMatch[1] : `${index}`;
}
export function dedupePhName(usedNames, name) {
    let duplicateNameCount = usedNames.get(name);
    if (isPresent(duplicateNameCount)) {
        usedNames.set(name, duplicateNameCount + 1);
        return `${name}_${duplicateNameCount}`;
    }
    else {
        usedNames.set(name, 1);
        return name;
    }
}
export function stringifyNodes(nodes, parser) {
    let visitor = new _StringifyVisitor(parser);
    return htmlVisitAll(visitor, nodes).join("");
}
class _StringifyVisitor {
    constructor(_parser) {
        this._parser = _parser;
        this._index = 0;
    }
    visitElement(ast, context) {
        let name = this._index++;
        let children = this._join(htmlVisitAll(this, ast.children), "");
        return `<ph name="e${name}">${children}</ph>`;
    }
    visitAttr(ast, context) { return null; }
    visitText(ast, context) {
        let index = this._index++;
        let noInterpolation = removeInterpolation(ast.value, ast.sourceSpan, this._parser);
        if (noInterpolation != ast.value) {
            return `<ph name="t${index}">${noInterpolation}</ph>`;
        }
        else {
            return ast.value;
        }
    }
    visitComment(ast, context) { return ""; }
    visitExpansion(ast, context) { return null; }
    visitExpansionCase(ast, context) { return null; }
    _join(strs, str) {
        return strs.filter(s => s.length > 0).join(str);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGlmZmluZ19wbHVnaW5fd3JhcHBlci1vdXRwdXRfcGF0aC1NZUNEZWdidC50bXAvYW5ndWxhcjIvc3JjL2kxOG4vc2hhcmVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUFPLEVBQWtCLFVBQVUsRUFBQyxNQUFNLGtDQUFrQztPQUNyRSxFQUdMLGNBQWMsRUFFZCxXQUFXLEVBQ1gsY0FBYyxFQUdkLFlBQVksRUFDYixNQUFNLGdDQUFnQztPQUNoQyxFQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFDLE1BQU0sMEJBQTBCO09BQ25FLEVBQUMsT0FBTyxFQUFDLE1BQU0sV0FBVztBQUdqQyxPQUFPLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQztBQUNoQyxPQUFPLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDO0FBQ3hDLElBQUksYUFBYSxHQUFHLHdFQUF3RSxDQUFDO0FBRTdGOztHQUVHO0FBQ0gsK0JBQStCLFVBQVU7SUFDdkMsWUFBWSxJQUFxQixFQUFFLEdBQVc7UUFBSSxNQUFNLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUFDLENBQUM7QUFDdkUsQ0FBQztBQUdELHdCQUF3QjtBQUN4QiwwQkFBMEIsS0FBZ0IsRUFBRSxNQUFvQjtJQUM5RCxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFFYixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakIsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2QsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLElBQUksSUFBSSxHQUFvQixDQUFFLENBQUMsS0FBSyxD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RUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkYsRUFBRSxDQUFDLENBQUMsZUFBZSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxjQUFjLEtBQUssS0FBSyxlQUFlLE9BQU8sQ0FBQztRQUN4RCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUNuQixDQUFDO0lBQ0gsQ0FBQztJQUVELFlBQVksQ0FBQyxHQUFtQixFQUFFLE9BQVksSUFBUyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUVuRSxjQUFjLENBQUMsR0FBcUIsRUFBRSxPQUFZLElBQVMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFekUsa0JBQWtCLENBQUMsR0FBeUIsRUFBRSxPQUFZLElBQVMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFekUsS0FBSyxDQUFDLElBQWMsRUFBRSxHQUFXO1FBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNsRCxDQUFDO0FBQ0gsQ0FBQztBQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtQYXJzZVNvdXJjZVNwYW4sIFBhcnNlRXJyb3J9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb21waWxlci9wYXJzZV91dGlsJztcbmltcG9ydCB7XG4gIEh0bWxBc3QsXG4gIEh0bWxBc3RWaXNpdG9yLFxuICBIdG1sRWxlbWVudEFzdCxcbiAgSHRtbEF0dHJBc3QsXG4gIEh0bWxUZXh0QXN0LFxuICBIdG1sQ29tbWVudEFzdCxcbiAgSHRtbEV4cGFuc2lvbkFzdCxcbiAgSHRtbEV4cGFuc2lvbkNhc2VBc3QsXG4gIGh0bWxWaXNpdEFsbFxufSBmcm9tICdhbmd1bGFyMi9zcmMvY29tcGlsZXIvaHRtbF9hc3QnO1xuaW1wb3J0IHtpc1ByZXNlbnQsIGlzQmxhbmssIFN0cmluZ1dyYXBwZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge01lc3NhZ2V9IGZyb20gJy4vbWVzc2FnZSc7XG5pbXBvcnQge1BhcnNlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvcmUvY2hhbmdlX2RldGVjdGlvbi9wYXJzZXIvcGFyc2VyJztcblxuZXhwb3J0IGNvbnN0IEkxOE5fQVRUUiA9IFwiaTE4blwiO1xuZXhwb3J0IGNvbnN0IEkxOE5fQVRUUl9QUkVGSVggPSBcImkxOG4tXCI7XG52YXIgQ1VTVE9NX1BIX0VYUCA9IC9cXC9cXC9bXFxzXFxTXSppMThuW1xcc1xcU10qXFwoW1xcc1xcU10qcGhbXFxzXFxTXSo9W1xcc1xcU10qXCIoW1xcc1xcU10qPylcIltcXHNcXFNdKlxcKS9nO1xuXG4vKipcbiAqIEFuIGkxOG4gZXJyb3IuXG4gKi9cbmV4cG9ydCBjbGFzcyBJMThuRXJyb3IgZXh0ZW5kcyBQYXJzZUVycm9yIHtcbiAgY29uc3RydWN0b3Ioc3BhbjogUGFyc2VTb3VyY2VTcGFuLCBtc2c6IHN0cmluZykgeyBzdXBlcihzcGFuLCBtc2cpOyB9XG59XG5cblxuLy8gTWFuLCB0aGlzIGlzIHNvIHVnbHkhXG5leHBvcnQgZnVuY3Rpb24gcGFydGl0aW9uKG5vZGVzOiBIdG1sQXN0W10sIGVycm9yczogUGFyc2VFcnJvcltdKTogUGFydFtdIHtcbiAgbGV0IHJlcyA9IFtdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyArK2kpIHtcbiAgICBsZXQgbiA9IG5vZGVzW2ldO1xuICAgIGxldCB0ZW1wID0gW107XG4gICAgaWYgKF9pc09wZW5pbmdDb21tZW50KG4pKSB7XG4gICAgICBsZXQgaTE4biA9ICg8SHRtbENvbW1lbnRBc3Q+bikudmFsdWUuc3Vic3RyaW5nKDUpLnRyaW0oKTtcbiAgICAgIGkrKztcbiAgICAgIHdoaWxlICghX2lzQ2xvc2luZ0NvbW1lbnQobm9kZXNbaV0pKSB7XG4gICAgICAgIHRlbXAucHVzaChub2Rlc1tpKytdKTtcbiAgICAgICAgaWYgKGkgPT09IG5vZGVzLmxlbmd0aCkge1xuICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBJMThuRXJyb3Iobi5zb3VyY2VTcGFuLCBcIk1pc3NpbmcgY2xvc2luZyAnaTE4bicgY29tbWVudC5cIikpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXMucHVzaChuZXcgUGFydChudWxsLCBudWxsLCB0ZW1wLCBpMThuLCB0cnVlKSk7XG5cbiAgICB9IGVsc2UgaWYgKG4gaW5zdGFuY2VvZiBIdG1sRWxlbWVudEFzdCkge1xuICAgICAgbGV0IGkxOG4gPSBfZmluZEkxOG5BdHRyKG4pO1xuICAgICAgcmVzLnB1c2gobmV3IFBhcnQobiwgbnVsbCwgbi5jaGlsZHJlbiwgaXNQcmVzZW50KGkxOG4pID8gaTE4bi52YWx1ZSA6IG51bGwsIGlzUHJlc2VudChpMThuKSkpO1xuICAgIH0gZWxzZSBpZiAobiBpbnN0YW5jZW9mIEh0bWxUZXh0QXN0KSB7XG4gICAgICByZXMucHVzaChuZXcgUGFydChudWxsLCBuLCBudWxsLCBudWxsLCBmYWxzZSkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJ0IHtcbiAgY29uc3RydWN0b3IocHVibGljIHJvb3RFbGVtZW50OiBIdG1sRWxlbWVudEFzdCwgcHVibGljIHJvb3RUZXh0Tm9kZTogSHRtbFRleHRBc3QsXG4gICAgICAgICAgICAgIHB1YmxpYyBjaGlsZHJlbjogSHRtbEFzdFtdLCBwdWJsaWMgaTE4bjogc3RyaW5nLCBwdWJsaWMgaGFzSTE4bjogYm9vbGVhbikge31cblxuICBnZXQgc291cmNlU3BhbigpOiBQYXJzZVNvdXJjZVNwYW4ge1xuICAgIGlmIChpc1ByZXNlbnQodGhpcy5yb290RWxlbWVudCkpXG4gICAgICByZXR1cm4gdGhpcy5yb290RWxlbWVudC5zb3VyY2VTcGFuO1xuICAgIGVsc2UgaWYgKGlzUHJlc2VudCh0aGlzLnJvb3RUZXh0Tm9kZSkpXG4gICAgICByZXR1cm4gdGhpcy5yb290VGV4dE5vZGUuc291cmNlU3BhbjtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gdGhpcy5jaGlsZHJlblswXS5zb3VyY2VTcGFuO1xuICB9XG5cbiAgY3JlYXRlTWVzc2FnZShwYXJzZXI6IFBhcnNlcik6IE1lc3NhZ2Uge1xuICAgIHJldHVybiBuZXcgTWVzc2FnZShzdHJpbmdpZnlOb2Rlcyh0aGlzLmNoaWxkcmVuLCBwYXJzZXIpLCBtZWFuaW5nKHRoaXMuaTE4biksXG4gICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uKHRoaXMuaTE4bikpO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9pc09wZW5pbmdDb21tZW50KG46IEh0bWxBc3QpOiBib29sZWFuIHtcbiAgcmV0dXJuIG4gaW5zdGFuY2VvZiBIdG1sQ29tbWVudEFzdCAmJiBpc1ByZXNlbnQobi52YWx1ZSkgJiYgbi52YWx1ZS5zdGFydHNXaXRoKFwiaTE4bjpcIik7XG59XG5cbmZ1bmN0aW9uIF9pc0Nsb3NpbmdDb21tZW50KG46IEh0bWxBc3QpOiBib29sZWFuIHtcbiAgcmV0dXJuIG4gaW5zdGFuY2VvZiBIdG1sQ29tbWVudEFzdCAmJiBpc1ByZXNlbnQobi52YWx1ZSkgJiYgbi52YWx1ZSA9PSBcIi9pMThuXCI7XG59XG5cbmZ1bmN0aW9uIF9maW5kSTE4bkF0dHIocDogSHRtbEVsZW1lbnRBc3QpOiBIdG1sQXR0ckFzdCB7XG4gIGxldCBpMThuID0gcC5hdHRycy5maWx0ZXIoYSA9PiBhLm5hbWUgPT0gSTE4Tl9BVFRSKTtcbiAgcmV0dXJuIGkxOG4ubGVuZ3RoID09IDAgPyBudWxsIDogaTE4blswXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1lYW5pbmcoaTE4bjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGlzQmxhbmsoaTE4bikgfHwgaTE4biA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIGkxOG4uc3BsaXQoXCJ8XCIpWzBdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpcHRpb24oaTE4bjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKGlzQmxhbmsoaTE4bikgfHwgaTE4biA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgbGV0IHBhcnRzID0gaTE4bi5zcGxpdChcInxcIik7XG4gIHJldHVybiBwYXJ0cy5sZW5ndGggPiAxID8gcGFydHNbMV0gOiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVzc2FnZUZyb21BdHRyaWJ1dGUocGFyc2VyOiBQYXJzZXIsIHA6IEh0bWxFbGVtZW50QXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHI6IEh0bWxBdHRyQXN0KTogTWVzc2FnZSB7XG4gIGxldCBleHBlY3RlZE5hbWUgPSBhdHRyLm5hbWUuc3Vic3RyaW5nKDUpO1xuICBsZXQgbWF0Y2hpbmcgPSBwLmF0dHJzLmZpbHRlcihhID0+IGEubmFtZSA9PSBleHBlY3RlZE5hbWUpO1xuXG4gIGlmIChtYXRjaGluZy5sZW5ndGggPiAwKSB7XG4gICAgbGV0IHZhbHVlID0gcmVtb3ZlSW50ZXJwb2xhdGlvbihtYXRjaGluZ1swXS52YWx1ZSwgbWF0Y2hpbmdbMF0uc291cmNlU3BhbiwgcGFyc2VyKTtcbiAgICByZXR1cm4gbmV3IE1lc3NhZ2UodmFsdWUsIG1lYW5pbmcoYXR0ci52YWx1ZSksIGRlc2NyaXB0aW9uKGF0dHIudmFsdWUpKTtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgSTE4bkVycm9yKHAuc291cmNlU3BhbiwgYE1pc3NpbmcgYXR0cmlidXRlICcke2V4cGVjdGVkTmFtZX0nLmApO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVJbnRlcnBvbGF0aW9uKHZhbHVlOiBzdHJpbmcsIHNvdXJjZTogUGFyc2VTb3VyY2VTcGFuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyOiBQYXJzZXIpOiBzdHJpbmcge1xuICB0cnkge1xuICAgIGxldCBwYXJzZWQgPSBwYXJzZXIuc3BsaXRJbnRlcnBvbGF0aW9uKHZhbHVlLCBzb3VyY2UudG9TdHJpbmcoKSk7XG4gICAgbGV0IHVzZWROYW1lcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gICAgaWYgKGlzUHJlc2VudChwYXJzZWQpKSB7XG4gICAgICBsZXQgcmVzID0gXCJcIjtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyc2VkLnN0cmluZ3MubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgcmVzICs9IHBhcnNlZC5zdHJpbmdzW2ldO1xuICAgICAgICBpZiAoaSAhPSBwYXJzZWQuc3RyaW5ncy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgbGV0IGN1c3RvbVBoTmFtZSA9IGdldFBoTmFtZUZyb21CaW5kaW5nKHBhcnNlZC5leHByZXNzaW9uc1tpXSwgaSk7XG4gICAgICAgICAgY3VzdG9tUGhOYW1lID0gZGVkdXBlUGhOYW1lKHVzZWROYW1lcywgY3VzdG9tUGhOYW1lKTtcbiAgICAgICAgICByZXMgKz0gYDxwaCBuYW1lPVwiJHtjdXN0b21QaE5hbWV9XCIvPmA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBoTmFtZUZyb21CaW5kaW5nKGlucHV0OiBzdHJpbmcsIGluZGV4OiBudW1iZXIpOiBzdHJpbmcge1xuICBsZXQgY3VzdG9tUGhNYXRjaCA9IFN0cmluZ1dyYXBwZXIuc3BsaXQoaW5wdXQsIENVU1RPTV9QSF9FWFApO1xuICByZXR1cm4gY3VzdG9tUGhNYXRjaC5sZW5ndGggPiAxID8gY3VzdG9tUGhNYXRjaFsxXSA6IGAke2luZGV4fWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWR1cGVQaE5hbWUodXNlZE5hbWVzOiBNYXA8c3RyaW5nLCBudW1iZXI+LCBuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgZHVwbGljYXRlTmFtZUNvdW50ID0gdXNlZE5hbWVzLmdldChuYW1lKTtcbiAgaWYgKGlzUHJlc2VudChkdXBsaWNhdGVOYW1lQ291bnQpKSB7XG4gICAgdXNlZE5hbWVzLnNldChuYW1lLCBkdXBsaWNhdGVOYW1lQ291bnQgKyAxKTtcbiAgICByZXR1cm4gYCR7bmFtZX1fJHtkdXBsaWNhdGVOYW1lQ291bnR9YDtcbiAgfSBlbHNlIHtcbiAgICB1c2VkTmFtZXMuc2V0KG5hbWUsIDEpO1xuICAgIHJldHVybiBuYW1lO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnlOb2Rlcyhub2RlczogSHRtbEFzdFtdLCBwYXJzZXI6IFBhcnNlcik6IHN0cmluZyB7XG4gIGxldCB2aXNpdG9yID0gbmV3IF9TdHJpbmdpZnlWaXNpdG9yKHBhcnNlcik7XG4gIHJldHVybiBodG1sVmlzaXRBbGwodmlzaXRvciwgbm9kZXMpLmpvaW4oXCJcIik7XG59XG5cbmNsYXNzIF9TdHJpbmdpZnlWaXNpdG9yIGltcGxlbWVudHMgSHRtbEFzdFZpc2l0b3Ige1xuICBwcml2YXRlIF9pbmRleDogbnVtYmVyID0gMDtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBfcGFyc2VyOiBQYXJzZXIpIHt9XG5cbiAgdmlzaXRFbGVtZW50KGFzdDogSHRtbEVsZW1lbnRBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgbGV0IG5hbWUgPSB0aGlzLl9pbmRleCsrO1xuICAgIGxldCBjaGlsZHJlbiA9IHRoaXMuX2pvaW4oaHRtbFZpc2l0QWxsKHRoaXMsIGFzdC5jaGlsZHJlbiksIFwiXCIpO1xuICAgIHJldHVybiBgPHBoIG5hbWU9XCJlJHtuYW1lfVwiPiR7Y2hpbGRyZW59PC9waD5gO1xuICB9XG5cbiAgdmlzaXRBdHRyKGFzdDogSHRtbEF0dHJBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7IHJldHVybiBudWxsOyB9XG5cbiAgdmlzaXRUZXh0KGFzdDogSHRtbFRleHRBc3QsIGNvbnRleHQ6IGFueSk6IGFueSB7XG4gICAgbGV0IGluZGV4ID0gdGhpcy5faW5kZXgrKztcbiAgICBsZXQgbm9JbnRlcnBvbGF0aW9uID0gcmVtb3ZlSW50ZXJwb2xhdGlvbihhc3QudmFsdWUsIGFzdC5zb3VyY2VTcGFuLCB0aGlzLl9wYXJzZXIpO1xuICAgIGlmIChub0ludGVycG9sYXRpb24gIT0gYXN0LnZhbHVlKSB7XG4gICAgICByZXR1cm4gYDxwaCBuYW1lPVwidCR7aW5kZXh9XCI+JHtub0ludGVycG9sYXRpb259PC9waD5gO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYXN0LnZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIHZpc2l0Q29tbWVudChhc3Q6IEh0bWxDb21tZW50QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkgeyByZXR1cm4gXCJcIjsgfVxuXG4gIHZpc2l0RXhwYW5zaW9uKGFzdDogSHRtbEV4cGFuc2lvbkFzdCwgY29udGV4dDogYW55KTogYW55IHsgcmV0dXJuIG51bGw7IH1cblxuICB2aXNpdEV4cGFuc2lvbkNhc2UoYXN0OiBIdG1sRXhwYW5zaW9uQ2FzZUFzdCwgY29udGV4dDogYW55KTogYW55IHsgcmV0dXJuIG51bGw7IH1cblxuICBwcml2YXRlIF9qb2luKHN0cnM6IHN0cmluZ1tdLCBzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHN0cnMuZmlsdGVyKHMgPT4gcy5sZW5ndGggPiAwKS5qb2luKHN0cik7XG4gIH1cbn1cbiJdfQ==