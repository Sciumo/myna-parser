"use strict";

function RuleTestInputs(myna) 
{
    let m = myna;
    let ag = m.grammars.arithmetic;
    let jg = m.grammars.json;
    let cg = m.grammars.csv;
    let mdg = m.grammars.markdown;
    let tg = m.grammars.template;
    let lg = m.grammars.lucene;

    let records = [
            'Stock Name,Country of Listing,Ticker,Margin Rate,Go Short?,Limited Risk Premium',
            '"Bankrate, Inc.",USA,RATE.O,25%,No,0.30%',
            '2 Ergo Group Plc,UK,RGO.L,25%,Yes,1.00%'
            ];
    let file = records.join("\n");        

    return [
        // Myna primitive tests 
        [m.letterLower, ['a', 'm', 'z'], ['A', '?', '0', ' ']],
        [m.letterUpper, ['A', 'M', 'Z'], ['a', '?', '0', ' ']],
        [m.letter, ['b', 'B'], ['?', '9', ' ', 'aa']],
        [m.digit, ['0', '5', '9'], ['a', 'Z', '?', ' ']],
        [m.digitNonZero, ['1', '5', '9'], ['0', 'a', 'Z', '?', ' ']],
        [m.digits, [], ['1a']],
        [m.digits, ['0', '123', '1000000', '01'], ['12.34', '1a', 'x0']],
        [m.integer, ['0', '123', '1000000'], ['01', '12.34', '1a', 'x0']],
        [m.hexDigit, ['0', '8', 'a', 'f', 'c', 'A', 'F', 'C'], ['X', '?', '', '34']],
        [m.binaryDigit, ['0', '1'], ['?', '5', '', '00']],
        [m.octalDigit, ['0', '7', '1'], ['X', '?', '', '34', '8', 'a', '00']],
        [m.alphaNumeric, ['A', 'm', '0', '4'], ['?', '/t', 'ab00', '   ']],
        [m.underscore, ['_'], ['__', '', 'a', '9']],
        [m.identifierFirst, ['A', 'm', '_'], ['0', '4', '?', ' ', '', '/t', 'ab00', '   ']],
        [m.identifierNext, ['A', 'm', '_', '0', '4'], ['?', ' ', '', '/t', 'ab00', '   ']],
        [m.identifier, ['_', 'abc', '_ab01', 'A1', '_b_c_0_'], ['', '0abc', 'ab_ cd', ' ', '\t']],
        [m.hyphen, ['-'], ['?', '', '']],
        [m.crlf, ['\r\n'], ['\r', '\n', '', ' \r\n', '\\r\\n', '\rn']],
        [m.newLine, ['\r\n', '\n'], ['\n\r', '\r', ' \r\n']],
        [m.space, [' '], ['', '\t', '  ']],
        [m.tab, ['\t'], ['', '\n', '\r', '\rn', ' \t ']],
        [m.ws, ['', '\t','\r','\n', ' ', '  ', ' \t\r\n \t\r\n'], ['a', ' a ']],
        [m.truePredicate, [""], ["a"]],
        [m.falsePredicate, [], ["", "a"]],
        [m.end, [""], ["a", " a", "a "]],
        [m.all, ["", "ab", "bacasdasd"], []],
        [m.advance, ["a", "Z", "9", "."], ["", " a"]],

        // Myna operator tests
        [m.text("ab"), ["ab"], ["a", "abc", ""]],
        [m.text("a"), ["a"], ["ab", "abc", ""]],
        [m.char("a").oneOrMore, ["a","aaa"], ["", "aaab", "bba"]],
        [m.seq(m.notEnd, m.all), ["a", " ", "jhasd kajshd"], [""]],
        [m.char("ab").zeroOrMore, ["", "a", "aabbaa"], ["c", "abc"]],
        [m.text("ab"), ["ab"], ["abc", ""]],
        [m.not("ab"), [""], ["ab", "aab", "bc"]],
        [m.seq(m.not("ab"), "bc"), ["bc"], ["", "aab", "ab"]],
        [m.seq(m.not("ab"), m.all), ["ba", "aab", ""], ["ab"]],
        [m.zeroOrMore("a"), ["", "a","aa", "aaa"], ["b", "aab"]],
        [m.oneOrMore("a"), ["a","aa", "aaa"], ["", "b", "aab"]],
        [m.zeroOrMore("ab"), ["","ab","ababab"], ["aab", "b"]],
        [m.quantified("ab", 1, 2), ["ab", "abab"], ["", "ababab"]],
        [m.repeat("a", 3), ["aaa"], ["aa", "aaaa", ""]],
        [m.opt("ab"), ["", "ab"], ["abc"]],
        [m.seq(m.opt("a"), "b"), ["b", "ab"], ["a", "bb", "aab", "abb"]],
        [m.at("ab"), [], ["ab"]],
        [m.unless(m.advance, "a"), ["b", "c"], ["", "a"]],
        [m.seq("a", "b"), ["ab"], ["abb", "", "aab", "ba"]],
        [m.choice("a", "b"), ["a", "b"], ["ab", "", "c", "ba"]],
        [m.seq(m.oneOrMore("a"), m.oneOrMore("b")), ["aab", "ab", "abb", "aaabb"], ["", "aa", "ba", "bb"]],
        [m.notChar("a"), ["b","c"], ["a", ""]],
        [m.seq(m.repeatWhileNot("a", "b"), "b"), ["aaab", "b"], ["abb", "bb"]],
        [m.seq(m.repeatOneOrMoreWhileNot("a", "b"), "b"), ["aaab", "ab"], ["b", "abb", "bb"]],
        [m.repeatUntilPast("a", "b"), ["aaab", "b"], ["abb", "bb"]],
        [m.repeatOneOrMoreUntilPast("a", "b"), ["aaab", "ab"], ["b", "abb", "bb"]],
        [m.seq(m.advanceWhileNot("z"), "z"), ["aaaaz", "z", "abcz"], ["za", "abc", ""]],
        [m.advanceOneOrMoreWhileNot("z"), ["a"], ["", "az"]],
        [m.advanceOneOrMoreUntilPast("z"), ["az", "aaaz"], ["", "a", "z"]],
        [m.err("testing error"), [], ["", "a", "abc"]],
        [m.log("testing log"), [""], ["a", "abc"]],
        [m.assert("a"), ["a"], ["b"]],
        [m.seq(m.assert(m.not("b")), "a"), ["a"], ["b"]],
        [m.seq("a", m.assert(m.end)), ["a"], ["", "ab", "b"]],
        [m.seq("a", m.not("b")), ["a"], ["ab", "b", ""]],
        [m.seq(m.seq("a", m.not("b"), m.opt("c"))), ["a", "ac"], ["ab", "b", "ac "]],
        [m.seq("a", m.not("b"), m.choice("b", "c")), ["ac"], ["ab", "a", ""]],
        [m.keyword("abc"), ["abc"], ["ab", "abcd", "ABC", "abc "]],
        [m.parenthesized("a"), ["(a)"], ["()", "a", "", "(a", "a)", "()a", "a()"]],
        [m.parenthesized(m.opt("a")), ["(a)", "()"], ["a", "", "(a", "a)", "()a", "a()"]],
        [m.guardedSeq("(", "a", ")"), ["(a)"], ["()", "a", "", "(a", "a)", "()a", "a()"]],
        [m.braced("a"), ["{a}"], ["{}", "a", "", "{a", "a}", "{}a", "a{}"]],
        [m.bracketed("a"), ["[a]"], ["[]", "a", "", "[a", "a]", "[]a", "a[]"]],
        [m.doubleQuoted("a"), ['"a"'], ['""', "a", "", '"a', 'a"', '""a', 'a""']],
        [m.singleQuoted("a"), ["'a'"], ["''", "a", "", "'a", "a'", "''a", "a''"]],
        [m.tagged("a"), ["<a>"], ["<>", "<", "", "<a", "a>", "<>a", "a<>"]],
        [m.delimited("a", ","), ["", "a", "a,a", "a,a,a"], ["a,", "a,a,", "a, ,", "aa", "aa,aa"]],
        [m.choice("a", "b").oneOrMore, ["a","aaa", "b", "abab"], ["", "c", "aaabc", "bbac"]],
        [m.char("a").oneOrMore, ["a","aaa"], ["", "aaab", "bba"]],
        [m.char("ab").zeroOrMore.unless("aba"), ["aa", "ab"], ["aba", "abc", "abab"]],
        [m.char("a").then("b"), ["ab"], ["a", "ba", "b"]],
        [m.char("a").thenAt(m.end), ["a"], ["ab", "ba", "b"]],
        [m.char("a").thenAt("b").then("b"), ["ab"], ["a", "ba", "b"]],
        [m.char("ab").zeroOrMore.thenNot("c").then("d"), ["abd"], ["a", "abc", "ba", "b"]], 
        [m.char("a").or("b").zeroOrMore, ["a", "b", "aba", ""], ["c"]],
        [m.char("a").until("b").then("b"), ["b", "aaab"], ["ba"]],
        [m.char("a").untilPast("b").then("c"), ["bc", "aaabc"], ["bac"]],
        [m.char("a").repeat(3), ["aaa"], ["aa", "aaaa"]],            
        [m.char("a").quantified(2,3), ["aa", "aaa"], ["a", "aaaa"]],            
        [m.char("a").delimited("b"), ["a", "aba", "ababa"], ["aaba","abaa","bab","b"]],            
        
        // CSV grammar 
        [cg.textdata, ['a', '?', ' ', ';', '\t', '9', '.'], [',', '\n', '\r', '"']],
        [cg.quoted, ['"abc"', '""', '"\n\r,"', '" "" "'], ['abc', "'abc'"]],
        [cg.field, ['Stock Name', '"Bankrate, Inc."', '0.30%', '', '"a""b"', 'a"b,c"d', '', 'Aa', 'a a', '.', ' 3.4 ', " 'abc'def "], ['"', 'abc,', ',', ',abc', 'ab,cd']],
        [cg.record, records, []],
        [cg.file, [file], []],
    
        // Json grammar tests 
        [jg.bool, ["true", "false"], ["TRUE", "0", "fal"]],
        [jg.null, ["null"], ["", "NULL", "nul"]],
        [jg.number,  [ '0', '100', '123.456', '0.34e-42', '-43', '+43', '43', "+100", "-0"], ["abc", "1+2", "e+2", "01", "-"]],
        [jg.string, ['""', '"a"', '"\t"', '"\\t"','"\\""', '"\\\\"',  '\"AB cd\"'], ['"', '"ab', 'abc', 'ab"', '"ab""', '"\\"'  ]],
        [jg.array, ['[]', '[ 1 ]','[1,2, 3]', '[true,"4.3", 1.23e4]', '[\n  12, 13, 14, "15", 1.6, {}\n  ]', '[[],[], []]'], ['[', ']', '[1],2', '3,4','','[1,2,]']],
        [jg.object, [
            '{}', 
            '{  \t\n }', 
            '{"a":1}', 
            '{"a":1,"b":2}', 
            '{ "" : 42}', 
            '{"":""}',
            '{"a":{}}', 
            '{"b":[1,2, 3,"",4.5]}',
            '{"}":"{"}', 
            '{"c":3.14}', 
            '{"d": "hello world" }', 
            '{"a":{"nested " : [1, 2, 3.14]}}',
            '{"a":1, "BCD": 3.14, "":"", "d":{}}',
            '{"BCD": 3.14, "":"", "d":{}}',
            '{"BCD": 3.14 }',
            '{"BCD": 3.14, "":""}',
            '{"BCD": 3.14,"":""}',
            '{"":"", "BCD": 3.14}',
            '{"a":1, "BCD": 3.14, "":"", "d":{"nested " : [1, 2, 3.14]}}'
            ],
            ['', '{}{', '}', '{{}}', '{\'a\':12}', '{"a:32}', '{"a":1,}']],

        [jg.object, [`{
    "field1":42, 
    "x" : "blabla",
    "field2": [
        12, 13, 14, "15", 1.6, {}
    ],
    "field 3" : { "a":1, "b":2 },
    "" : ""
}`],[]],

        // Arithmetic grammar tests
        [ag.number,     ['0', '100', '421', '123.456', '0.0123e-456'], ["", "abc", "1+2", "e+2", "01", "-"]],
        [ag.parenExpr,  ['(1)', '(1+2)', '((1))', '((1)+(2))'], ['', '?', ' ']],
        [ag.leafExpr,   ['123', '0', '(2+3)'], ['', '?', ' ', 'x(1,2)', 'sqrt(-9.9)', 'x0']],
        [ag.prefixExpr, ['+34', '-999', '+(-(4))'], ['', '?', ' ', '-x']],
        [ag.mulExpr,    ['* 42', '* -3'], ['', '?', ' ', '+ 12']],
        [ag.divExpr,    ['/\t12', '/ -3'], ['', '?', ' ']],
        [ag.product,    ['1', '1*2', '1 * 2 * 3', '42 * (9 + 3)'], ['42 * 9 + 3', '', '?', ' ']],
        [ag.addExpr,    ['+333'], ['- 43', '', '?', ' ']],
        [ag.subExpr,    ['- 43'], ['+333','', '?', ' ']],
        [ag.sum,        ['1', '1+2', '1 + 2 + 3', '42 * 9 + 3'], ['', '?', ' ']],
        [ag.expr,       ['(1+(2.3 * 42) / (19))'], ['', '?', ' ']],
        
        // Markdown grammar tests
        [mdg.ws,        [' ', '  ', '\t\t'], ['\n', ' a']],
        [mdg.plainText, [' ', 't', '1123', '$', 'abc def', 'abc1def'], ['\n', '#', '_', 'ab_cd', '']],
        [mdg.escaped,   ['\\[', '\\]', '\\@', '\\#', '\\`', `\\(`, '\\)', '\\\\'], ['[', ']', '*', '`', '\\', '']],
        [mdg.linkText,  ['[abc]', '[abc\\]def]', '[]'], ['[abc', 'abc]', '[abc]def', '[abc\\]', '']],
        [mdg.linkUrl,   ['(abc)', '(abc\\)def)', '()'], ['(abc', 'abc)', '(abc)def', '(abc\\)', '']],
        [mdg.image,     ['![text](url)', '![alternate text](http://www.some-url.com/file.svg)'], ['[text](url)', '[text(url)', 'text(url)', '']],
        [mdg.link,      ['[text](url)', '[link me](http://some-url.com)', '[![text](image-url)](hyperlink)'], ['[text](url', '[text(url)', 'text(url)', '[this is to be\nhyperlinked](http://some-url.com)', '']],
        [mdg.inline,    ['123', 'ab', '*abc*',  ' ', '\\*', '*', 'ab ab', '*some ~~thing~~*'], ['123\n', 'test *test*', '']],
        [mdg.restOfLine,['\n', '123\n', 'ab *cd* \n', 'abc'], ['\n\n']],
        [mdg.bold,      ['**bold**',  '**123**', '__bold__', '__123__', '** bold **', '__ bold __', '** _ bold _ **', '** a * bc * d **', '__ `bold code` __', '**\\***'], ['* italic *', '_ italic _', '** bold \\**']],
        [mdg.italic,    ['* italic *', '_ italic _', '_ ~~italicstrike~~ _', '_\\*_', '*\\_*', '_ ** test ** _', '_*test*_', '*some ~~thing~~*'], ['** bold **', '__ italic __']],
        [mdg.strike,    ['~~ strike ~~', '~~strike~~'], ['* italic *', '_ italic _']],
        [mdg.heading,   ['# heading\n', '## heading 2\n', '### heading 3 with newline\n', '#### *heading4 italicized*\n'], [' # nope\n', '_#nope_\n']],
        [mdg.codeBlock, ['```\ntest\ntest\n```', '```test```'], ['``\ntest\ntest\n``', '']],
        [mdg.mention,   ['@abc', '@123-456', '@test/reference-something/123'], ['@qw er', 'asd@asd']],
        [mdg.code,      ['`code`', '`*codebold*`'], ['*`boldcode`*']],
        [mdg.quote,     ['>\n', '> simple\n', '> line 1\n> line *2*\n', '> no newline'], [' > not valid\n']], 
        [mdg.list,      ['* test\n* test\n', '- test\n  - nested\n    - nested again\n', '- item1\n* item2\n', '1. item\n2.item\n  34. item\n'], [' - test\n']],
        [mdg.simpleLine,['abc','abc\n','a *b*\n', '\n'], ['']], // '', ' ', '\t', '\n', '  \t\n', '- abc\n'
        [mdg.paragraph, ['abc', 'abc\n', 'abc\nabc', 'abc\nabc\n', 'line 1\nline 2\n', 'some *thing* is happening'], ['', '- test\n']],
        [mdg.document,  ['simple', 'with\nnew\nlines', '# Heading\n\nand some text.', 'stuff\n> and a\n> quote\n\n- and a list\n## And another heading', '# heading\n## and another', '', '\n\n'], []],

        // Mustache template grammar tests
        [tg.key, ['abc', ' ', '', '123', '$', '{{', '#'], ['}}', '{{}}']],
        [tg.escapedVar, ['{{abc}}'], ['{{#abc}}', '{{/abc}}', '{{^abc}}', '']],
        [tg.unescapedVar, ['{{&abc}}', '{{{abc}}}'], ['{{#abc}}', '{{/abc}}', '{{^abc}}', '{{abc}}', '']],
        [tg.startSection, ['{{#abc}}'], ['{{abc}}', '{{/abc}}', '{{^abc}}', '']],
        [tg.startInvertedSection, ['{{^abc}}'], ['{{abc}}', '{{/abc}}', '{{#abc}}', '']],
        [tg.endSection, ['{{/abc}}'], ['{{abc}}', '{{abc}}', '{{^abc}}', '']],
        [tg.partial, ['{{>abc}}', '{{> abc.html}}'], ['{{abc}}', '{{abc}}', '{{^abc}}', '']],
        [tg.comment, ['{{! abc def 123\nsome stuff}}', '{{!}}'], ['{{abc}}', '{{abc}}', '{{^abc}}', '']],
        [tg.section, ['{{#abc}}{{/abc}}', '{{#section}}stuff{{/section}}', '{{#section}}{{#nested}}more stuff{{/nested}}some {{/section}}', '{{#A}} {{!this is a comment}} {{/A}}'], ['{{abc}}', '{{abc}}{{/abc}}', '{{^abc}}{{/abc}}', '']],
        [tg.invertedSection, ['{{^abc}}{{/abc}}', '{{^nsection}}stuff{{/nsection}}', '{{^nsection}}{{#nested}}more stuff{{/nested}}some {{/nsection}}'], ['{{abc}}', '{{abc}}{{/abc}}', '{{abc}}{{/abc}}', '']],
        [tg.plainText, ['abc', '{}', '}}', '{', 'abc \n{}  \t }}}'], ['{{', 'abc {{', '']],
        [tg.document, ['', 'abc', '{{abc}}', 'ab\ncd', 'something{{#section}}{{var}}{{/section}}{{anothervar}}something else\nparagraph\n{{#section 2}}yes another\n one{}{{/section 2}}'], []],

        // Lucene query grammar
        // Tests taken from https://github.com/thoward/lucene-query-parser.js/blob/master/spec/lucene-query-parser.spec.js
        // http://lucene.apache.org/core/4_0_0/queryparser/org/apache/lucene/queryparser/classic/package-summary.html
        [lg.operator, ['AND', 'OR', 'NOT'], ['ANDA', 'ORR', 'NO', 'TO']],
        [lg.singleTerm, ['fizz'], ['fizz buzz', '{fizz TO buzz}']],
        [lg.phrase, ['"fizz"', '"fizz buzz"'], ['"fizz buzz', 'fizz "buzz']],
        [lg.field, ['abc:', 'a+b:'], ['a b:', 'ab :']],
        [lg.term, ['ab:cd', 'a.b:"bcd"'], ['ab : cd']],
        [lg.range, ['{fizz TO buzz}', '[fizz TO buzz]'], ['{fizz buzz}', '{fizz TO buzz]', '[fizz TO buzz}', 'fizz TO buzz']],
        [lg.term, ['+fizz', '+"fizz buzz"', '-fizz', '-"fizz buzz"', '+fizz~', 'fizz~', 'fizz~3', 'fizz~3.2', '+fizz^4', 'fizz^3.2', 'fizz^3~2', 'fizz~2^3'], 
            ['+fizz buzz', '+"fizz buzz', 'fizz~~', 'fizz^3.2^4']],        
        [lg.term, ['te?t', 'test*', 'te*t', 'roam~', 'roam~2', 'prox^3', 'prox^1.2'], []],
        [lg.query, ['x AND y', 'x OR y', 'x NOT y', 'x && y', 'x || y', 'x ! y'], []],
        [lg.term, ['1972-05-20T17:33:18.772Z+6MONTHS+3DAYS/DAY', 'createdate:[1995-12-31T23:59:59.999Z TO 2007-03-06T00:00:00Z]', 'pubdate:[NOW-1YEAR/DAY TO NOW/DAY+1DAY]', 
            '1972-05-20T17:33:18.772Z', 'createdate:[1976-03-06T23:59:59.999Z TO 1976-03-06T23:59:59.999Z+1YEAR]', 'createdate:[1976-03-06T23:59:59.999Z/YEAR TO 1976-03-06T23:59:59.999Z]'], []],
        [lg.query, ['title:"The Right Way" AND text:go', 'title:"Do it right" AND right', 'title:Doing it wrong', 
            '\\(1\\+1\\)\\:2', '"(1+1):2"',  'timestamp:[* TO NOW]', 'createdate:[1976-03-06T23:59:59.999Z TO *]',
             'field:[* TO 100]', 'field:[100 TO *]', 'field:[* TO *]', 
            'start_date:[* TO NOW]', '_val_:myfield', '_val_:"recip(rord(myfield),1,2,3)"', '+popularity:[10 TO  *] +section:0'], 
            []],
        [lg.query, [
            '{!}solr rocks', '{!func}popularity', '{!q.op=AND df=title}solr rocks', "{!type=dismax qf='myfield yourfield'}solr rocks", '{!type=dismax qf="myfield yourfield"}solr rocks', 
            '{!dismax qf=myfield}solr rocks', '{!type=dismax qf=myfield}solr rocks', "{!type=dismax qf=myfield v='solr rocks'}", '{!type=dismax qf=myfield v=$qq}&qq=solr rocks',
            '{!lucene q.op=AND df=text}myfield:foo +bar -baz', ],
            ['{}solr rocks', '{!solr rocks', '!{}solr rocks']],
        [lg.query, ['(jakarta OR apache) AND website', '"jakarta apache" -"Apache Lucene"', 'NOT "jakarta apache"', '"jakarta apache" NOT "Apache Lucene"', '+jakarta lucene',
            '"jakarta apache" AND "Apache Lucene"', '"jakarta apache" OR jakarta', '"jakarta apache" jakarta', '"jakarta apache"^4 "Apache Lucene"', 'jakarta^4 apache',
            'jakarta apache', 'title:{Aida TO Carmen}', 'mod_date:[20020101 TO 20030101]', '"jakarta apache"~10', 'roam~0.8', 'roam~', 'title:"Do it right" AND right',
            'title:"The Right Way" AND text:go', 'foo:{bar TO baz}', 'foo:[bar TO baz]', 'fizz AND (buzz OR baz)', 'fizz (buzz baz)', 'fizz || buzz', 'fizz && buzz',
            'fizz NOT buzz', 'fizz OR buzz', 'fizz AND buzz', 'fizz ! buzz', 'fizz buzz', 'foo:+"fizz buzz"', 'foo:-"fizz buzz"', 'foo:+bar', 'foo:-bar', 'foo:"fizz buzz"',
            'sub.foo:bar', 'foo:2015-01-01', 'foo:bar', '+"fizz buzz"', '-"fizz buzz"', 'published_at:>now+5d', 'created_at:>now-5d', ' Test:Foo', ' \r\n'], []]
    ];
}


// Export the function for use use with Node.js
if (typeof module === "object" && module.exports) 
    module.exports = RuleTestInputs;