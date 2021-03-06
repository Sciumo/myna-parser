// Myna Parsing Library
// Copyright (c) 2016 Christopher Diggins
// Usage permitted under terms of MIT License
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
// A parsing combinator library for JavaScript/TypeScript based on the PEG formalism.
// For more information see http://www.github.com/cdiggins/myna-parser
// NOTE: we are explicitly bypassing using the TypeScript "export" keyword for 
// the Myna module otherwise the module won't be usable from browsers without 
// using an additional moduler loader library. Instead we have manual  
// export code at the bottom of the file. 
var Myna;
(function (Myna) {
    //====================================================================================
    // Internal variables used by the Myna library
    // A lookup table of all grammars registered with the Myna module 
    Myna.grammars = {};
    // A lookup table of all named rules registered with the Myna module
    Myna.allRules = {};
    // A lookup table of parsing functions for each registered grammar  
    Myna.parsers = {};
    //===========================================================================
    // class ParseState
    // This stores the state of the parser and is passed to the parse and match functions.
    var ParseState = (function () {
        function ParseState(input, index, nodes) {
            this.input = input;
            this.index = index;
            this.nodes = nodes;
            this.index = index;
        }
        Object.defineProperty(ParseState.prototype, "code", {
            // Returns the code of the current token
            get: function () {
                return this.input.charCodeAt(this.index);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ParseState.prototype, "inRange", {
            // Returns true if the index is within the input range. 
            get: function () {
                return this.index < this.input.length;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ParseState.prototype, "location", {
            // Returns a string representation of the location. 
            get: function () {
                return this.index.toString();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ParseState.prototype, "debugContext", {
            // Returns a string that helps debugging to figure out exactly where we are in the input string 
            get: function () {
                var contextWidth = 5;
                var start = this.index - contextWidth - 1;
                if (start < 0)
                    start = 0;
                var prefix = (this.index > 0) ? this.input.slice(start, this.index) : "";
                var end = this.index + contextWidth;
                if (end >= this.input.length)
                    end = this.input.length - 1;
                var postfix = this.input.slice(this.index + 1, end);
                return prefix + ">>>" + this.input[this.index] + "<<<" + postfix;
            },
            enumerable: true,
            configurable: true
        });
        return ParseState;
    }());
    Myna.ParseState = ParseState;
    //===========================================================================
    // class ParseError
    // Represents a parse error, and contains the parse state at the time of the error  
    var ParseError = (function (_super) {
        __extends(ParseError, _super);
        function ParseError(parser, message) {
            _super.call(this, message);
            this.parser = parser;
            this.message = message;
        }
        return ParseError;
    }(Error));
    Myna.ParseError = ParseError;
    // Represents a node in the generated parse tree. These nodes are returned by the Rule.parse function. If a Rule 
    // has the "_createAstNode" field set to true (because you created the rule using the ".ast" property), then the 
    // generated node will also be added to the constructed parse tree.   
    var AstNode = (function () {
        // Constructs a new node associated with the given rule.  
        function AstNode(rule, input, start, end) {
            if (start === void 0) { start = 0; }
            if (end === void 0) { end = -1; }
            this.rule = rule;
            this.input = input;
            this.start = start;
            this.end = end;
            // The list of child nodes in the parse tree. 
            // This is not allocated unless used, to minimize memory consumption 
            this.children = null;
        }
        Object.defineProperty(AstNode.prototype, "name", {
            // Returns the name of the rule associated with this node
            get: function () { return this.rule != null ? this.rule.name : "unnamed"; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "fullName", {
            // Returns the name of the rule, preceded by the grammar name, associated with this node
            get: function () { return this.rule != null ? this.rule.fullName : "unnamed"; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "allText", {
            // Returns the parsed text associated with this node's start and end locations  
            get: function () { return this.input.slice(this.start, this.end); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "isLeaf", {
            // Returns true if this node has no children
            get: function () { return this.children == null || this.children.length == 0; },
            enumerable: true,
            configurable: true
        });
        // Returns the first child with the given name, or null if no named child is found. 
        AstNode.prototype.child = function (name) {
            if (this.children)
                for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                    var c = _a[_i];
                    if (c.name == name)
                        return c;
                }
            return null;
        };
        Object.defineProperty(AstNode.prototype, "_firstChildStart", {
            // The position of the first child, or the end position for the entire node if no children 
            get: function () {
                return this.isLeaf ? this.end : this.children[0].start;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "_lastChildEnd", {
            // The end position of the last child, or the end position for the entire node if no children 
            get: function () {
                return this.isLeaf ? this.end : this.children[0].end;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "beforeChildrenText", {
            // Returns the text before the children, or if no children returns the entire text. 
            get: function () {
                return this.input.slice(this.start, this._firstChildStart);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "afterChildrenText", {
            // Returns the text after the children, or if no children returns the empty string.
            get: function () {
                return this.input.slice(this._lastChildEnd, this.end);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(AstNode.prototype, "allChildrenText", {
            // Returns the text from the beginning of the first child to the end of the last child.
            get: function () {
                return this.input.slice(this._firstChildStart, this._lastChildEnd);
            },
            enumerable: true,
            configurable: true
        });
        // Returns the AST as a string for debug and test purposes
        AstNode.prototype.toString = function () {
            var contents = this.isLeaf
                ? this.allText
                : this.children.map(function (c) { return c.toString(); }).join(" ");
            return "(" + this.rule.name + ': ' + contents + ")";
        };
        return AstNode;
    }());
    Myna.AstNode = AstNode;
    //===============================================================
    // class Rule
    // A Rule is both a rule in the PEG grammar and a parser. The parse function takes  
    // a particular parse location (in either a string, or array of tokens) and will return 
    // the location of the end of the parse if successful or null if not successful.  
    var Rule = (function () {
        // Constructor
        // Note: child-rules are exposed as a public field
        function Rule(rules) {
            this.rules = rules;
            // Identifies individual rule
            this.name = "";
            // Identifies the grammar that this rule belongs to 
            this.grammarName = "";
            // Identifies types of rules. Rules can have "types" that are different than the class name
            this.type = "";
            // Used to provide access to the name of the class 
            this.className = "Rule";
            // Indicates whether generated nodes should be added to the abstract syntax tree
            this._createAstNode = false;
            // A parser function, computed in a rule's constructor. If successful returns either the original or a new 
            // ParseState object. If it fails it returns null.
            this.parser = null;
            // A lexer function, computed in a rule's constructor. The lexer may update the ParseState if successful.
            // If it fails it is required that the lexer restore the ParseState index to the previous state. 
            // Lexers should only update the index. 
            this.lexer = null;
        }
        // Sets the name of the rule, and the grammar 
        // Warning: this modifies the rule, use "copy" first if you don't want to update the rule.
        Rule.prototype.setName = function (grammarName, ruleName) {
            this.grammarName = grammarName;
            this.name = ruleName;
            return this;
        };
        Object.defineProperty(Rule.prototype, "definition", {
            // Returns a default definition of the rule
            get: function () {
                return this.className + "(" + this.rules.map(function (r) { return r.toString(); }).join(", ") + ")";
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "fullName", {
            // Returns the name of the rule preceded by the grammar name and a "."
            get: function () {
                return this.grammarName + "." + this.name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "nameOrDefinition", {
            // Returns either the name of the rule, or it's definition
            get: function () {
                return this.name
                    ? this.fullName
                    : this.definition;
            },
            enumerable: true,
            configurable: true
        });
        // Returns a string representation of the rule 
        Rule.prototype.toString = function () {
            return this.nameOrDefinition;
        };
        Object.defineProperty(Rule.prototype, "firstChild", {
            // Returns the first child rule
            get: function () {
                return this.rules[0];
            },
            enumerable: true,
            configurable: true
        });
        // Sets the "type" associated with the rule. 
        // This is useful for tracking how a rule was created. 
        Rule.prototype.setType = function (type) {
            this.type = type;
            return this;
        };
        // Returns a copy of this rule with default values for all fields.  
        // Note: Every new rule class must override cloneImplemenation
        Rule.prototype.cloneImplementation = function () {
            throw new Error("Missing override for cloneImplementation");
        };
        Object.defineProperty(Rule.prototype, "copy", {
            // Returns a copy of this rule with all fields copied.  
            get: function () {
                var r = this.cloneImplementation();
                if (typeof (r) !== typeof (this))
                    throw new Error("Error in implementation of cloneImplementation: not returning object of correct type");
                r.name = this.name;
                r.grammarName = this.grammarName;
                r._createAstNode = this._createAstNode;
                return r;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "ast", {
            // Returns a copy of the rule that will create a node in the parse tree.
            // This property is the only way to create rules that generate nodes in a parse tree. 
            // TODO: this might be better in a Rule class? 
            get: function () {
                var r = this.copy;
                r._createAstNode = true;
                var parser = r.parser;
                r.parser = function (p) {
                    var originalIndex = p.index;
                    var originalNodes = p.nodes;
                    p.nodes = [];
                    if (!parser(p)) {
                        p.nodes = originalNodes;
                        p.index = originalIndex;
                        return false;
                    }
                    var node = new AstNode(r, p.input, originalIndex, p.index);
                    node.children = p.nodes;
                    p.nodes = originalNodes;
                    p.nodes.push(node);
                    return true;
                };
                return r;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "hasAstChildRule", {
            // Returns true if any of the child rules are "ast rules" meaning they create nodes in the parse tree.
            get: function () {
                return this.rules.filter(function (r) { return r.createsAstNode; }).length > 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "createsAstNode", {
            // Returns true if this rule when parsed successfully will create a node in the parse tree. 
            // Some rules will override this function. 
            get: function () {
                return this._createAstNode;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "nonAdvancing", {
            // Returns true if this rule doesn't advance the input
            get: function () {
                return false;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "astRuleDefn", {
            // Returns a string that describes the AST nodes created by this rule.
            // Will throw an exception if this is not a valid AST rule (this.isAstRule != true)
            get: function () {
                var rules = this.rules.filter(function (r) { return r.createsAstNode; });
                if (!rules.length)
                    return this.name;
                if (rules.length == 1) {
                    var result = rules[0].astRuleNameOrDefn;
                    if (this instanceof Quantified)
                        result += "[" + this.min + "," + this.max + "]";
                    return result;
                }
                if (this instanceof Sequence)
                    return "seq(" + rules.map(function (r) { return r.astRuleNameOrDefn; }).join(",") + ")";
                if (this instanceof Choice)
                    return "choice(" + rules.map(function (r) { return r.astRuleNameOrDefn; }).join(",") + ")";
                throw new Error("Internal error: not a valid AST rule");
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "astRuleNameOrDefn", {
            // Returns a string that is either the name of the AST parse node, or a definition 
            // (schema) describing the makeup of the rules. 
            get: function () {
                if (this._createAstNode)
                    return this.name;
                return this.astRuleDefn;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "opt", {
            //======================================================
            // Extensions to support method/property chaining. 
            // This is also known as a fluent API syntax
            get: function () { return opt(this); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "zeroOrMore", {
            get: function () { return zeroOrMore(this); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "oneOrMore", {
            get: function () { return oneOrMore(this); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "at", {
            get: function () { return at(this); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "not", {
            get: function () { return not(this); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "advance", {
            get: function () { return this.then(Myna.advance); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "ws", {
            get: function () { return this.then(Myna.ws); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "all", {
            get: function () { return this.then(Myna.all); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "end", {
            get: function () { return this.then(Myna.end); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Rule.prototype, "assert", {
            get: function () { return assert(this); },
            enumerable: true,
            configurable: true
        });
        Rule.prototype.then = function (r) { return seq(this, r); };
        Rule.prototype.thenAt = function (r) { return this.then(at(r)); };
        Rule.prototype.thenNot = function (r) { return this.then(not(r)); };
        Rule.prototype.or = function (r) { return choice(this, r); };
        Rule.prototype.until = function (r) { return repeatWhileNot(this, r); };
        Rule.prototype.untilPast = function (r) { return repeatUntilPast(this, r); };
        Rule.prototype.repeat = function (count) { return repeat(this, count); };
        Rule.prototype.quantified = function (min, max) { return quantified(this, min, max); };
        Rule.prototype.delimited = function (delimiter) { return delimited(this, delimiter); };
        Rule.prototype.unless = function (r) { return unless(this, r); };
        return Rule;
    }());
    Myna.Rule = Rule;
    //===============================================================
    // Rule derived classes 
    // These are the core Rule classes of Myna. Normally you would not use theses directly but use the factory methods
    // If you fork this code, think twice before adding new classes here. Maybe you can implement your new Rule
    // in terms of functions or other low-level rules. Then you can be happy knowing that the same code is being 
    // re-used and tested all the time.  
    // Matches a series of rules in order. Succeeds only if all sub-rules succeed. 
    var Sequence = (function (_super) {
        __extends(Sequence, _super);
        function Sequence(rules) {
            _super.call(this, rules);
            this.type = "seq";
            this.className = "Sequence";
            var length = rules.length;
            var parsers = this.rules.map(function (r) { return r.parser; });
            this.parser = function (p) {
                var originalCount = p.nodes.length;
                var originalIndex = p.index;
                for (var i = 0, len = length; i < len; ++i) {
                    if (!parsers[i](p)) {
                        // Any created nodes need to be popped off the list 
                        if (p.nodes.length !== originalCount)
                            p.nodes.splice(-1, p.nodes.length - originalCount);
                        // Assure that the parser is restored to its original position 
                        p.index = originalIndex;
                        return false;
                    }
                }
                return true;
            };
            var lexers = this.rules.map(function (r) { return r.lexer; });
            this.lexer = function (p) {
                var original = p.index;
                for (var i = 0, len = length; i < len; ++i) {
                    if (!lexers[i](p)) {
                        p.index = original;
                        return false;
                    }
                }
                return true;
            };
            // When none of the child rules create a node, we can use the lexer to parse
            if (!this.createsAstNode)
                this.parser = this.lexer;
        }
        Object.defineProperty(Sequence.prototype, "definition", {
            get: function () {
                var result = this.rules.map(function (r) { return r.toString(); }).join(" ");
                if (this.rules.length > 1)
                    result = "(" + result + ")";
                return result;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sequence.prototype, "nonAdvancing", {
            get: function () {
                return this.rules.every(function (r) { return r.nonAdvancing; });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Sequence.prototype, "createsAstNode", {
            get: function () {
                return this._createAstNode || this.hasAstChildRule;
            },
            enumerable: true,
            configurable: true
        });
        Sequence.prototype.cloneImplementation = function () { return new Sequence(this.rules); };
        return Sequence;
    }(Rule));
    Myna.Sequence = Sequence;
    // Tries to match each rule in order until one succeeds. Succeeds if any of the sub-rules succeed. 
    var Choice = (function (_super) {
        __extends(Choice, _super);
        function Choice(rules) {
            _super.call(this, rules);
            this.type = "choice";
            this.className = "Choice";
            var length = rules.length;
            var parsers = this.rules.map(function (r) { return r.parser; });
            this.parser = function (p) {
                for (var i = 0, len = length; i < len; ++i)
                    if (parsers[i](p))
                        return true;
                return false;
            };
            var lexers = this.rules.map(function (r) { return r.lexer; });
            this.lexer = function (p) {
                for (var i = 0, len = length; i < len; ++i)
                    if (lexers[i](p))
                        return true;
                return false;
            };
            // When none of the child rules create a node, we can use the lexer to parse
            if (!this.createsAstNode)
                this.parser = this.lexer;
        }
        Object.defineProperty(Choice.prototype, "definition", {
            get: function () {
                var result = this.rules.map(function (r) { return r.toString(); }).join(" / ");
                if (this.rules.length > 1)
                    result = "(" + result + ")";
                return result;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Choice.prototype, "nonAdvancing", {
            get: function () {
                return this.rules.every(function (r) { return r.nonAdvancing; });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Choice.prototype, "createsAstNode", {
            get: function () {
                return this._createAstNode || this.hasAstChildRule;
            },
            enumerable: true,
            configurable: true
        });
        Choice.prototype.cloneImplementation = function () { return new Choice(this.rules); };
        return Choice;
    }(Rule));
    Myna.Choice = Choice;
    // A generalization of several rules such as zeroOrMore (0+), oneOrMore (1+), opt(0 or 1),
    // When matching with an unbounded upper limit set the maxium to  -1   
    var Quantified = (function (_super) {
        __extends(Quantified, _super);
        function Quantified(rule, min, max) {
            var _this = this;
            if (min === void 0) { min = 0; }
            if (max === void 0) { max = Infinity; }
            _super.call(this, [rule]);
            this.min = min;
            this.max = max;
            this.type = "quantified";
            this.className = "Quantified";
            var pChild = this.firstChild.parser;
            this.parser = function (p) {
                var originalCount = p.nodes.length;
                var originalIndex = p.index;
                for (var i = 0; i < max; ++i) {
                    var index = p.index;
                    // If parsing the rule fails, we return the last result, or failed 
                    // if the minimum number of matches is not met. 
                    if (!pChild(p)) {
                        if (i >= min)
                            return true;
                        // Any created nodes need to be popped off the list 
                        if (p.nodes.length !== originalCount)
                            p.nodes.splice(-1, p.nodes.length - originalCount);
                        // Assure that the parser is restored to its original position 
                        p.index = originalIndex;
                        return false;
                    }
                    // Check for progress, to assure we aren't hitting an infinite loop  
                    // Without this it is possible to accidentally put a zeroOrMore with a predicate.
                    // For example: myna.truePredicate.zeroOrMore would loop forever 
                    debugAssert(max !== Infinity || p.index !== index, _this);
                }
                return true;
            };
            var lChild = this.firstChild.lexer;
            this.lexer = function (p) {
                var original = p.index;
                for (var i = 0; i < max; ++i) {
                    var index = p.index;
                    if (!lChild(p)) {
                        if (i >= min)
                            return true;
                        p.index = original;
                        return false;
                    }
                }
                return true;
            };
            // When none of the child rules create a node, we can use the lexer to parse
            if (!this.createsAstNode)
                this.parser = this.lexer;
        }
        Object.defineProperty(Quantified.prototype, "definition", {
            // Used for creating a human readable definition of the grammar.
            get: function () {
                if (this.min == 0 && this.max == 1)
                    return this.firstChild.toString() + "?";
                if (this.min == 0 && this.max == Infinity)
                    return this.firstChild.toString() + "*";
                if (this.min == 1 && this.max == Infinity)
                    return this.firstChild.toString() + "+";
                return this.firstChild.toString() + "{" + this.min + "," + this.max + "}";
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Quantified.prototype, "createsAstNode", {
            get: function () {
                return this._createAstNode || this.hasAstChildRule;
            },
            enumerable: true,
            configurable: true
        });
        Quantified.prototype.cloneImplementation = function () { return new Quantified(this.firstChild, this.min, this.max); };
        return Quantified;
    }(Rule));
    Myna.Quantified = Quantified;
    // Advances the parser by one token unless at the end
    var Advance = (function (_super) {
        __extends(Advance, _super);
        function Advance() {
            _super.call(this, []);
            this.type = "advance";
            this.className = "Advance";
            this.lexer = function (p) {
                return p.inRange ? ++p.index >= 0 : false;
            };
            this.parser = this.lexer;
        }
        Object.defineProperty(Advance.prototype, "definition", {
            get: function () { return "<advance>"; },
            enumerable: true,
            configurable: true
        });
        Advance.prototype.cloneImplementation = function () { return new Advance(); };
        return Advance;
    }(Rule));
    Myna.Advance = Advance;
    // Advances the parser by one token if the predicate is true.
    var AdvanceIf = (function (_super) {
        __extends(AdvanceIf, _super);
        function AdvanceIf(condition) {
            _super.call(this, [condition]);
            this.type = "advanceIf";
            this.className = "AdvanceIf";
            var lexCondition = condition.lexer;
            this.lexer = function (p) {
                return p.inRange && lexCondition(p) ? ++p.index >= 0 : false;
            };
            this.parser = this.lexer;
        }
        Object.defineProperty(AdvanceIf.prototype, "definition", {
            get: function () { return "advanceif(" + this.firstChild.toString() + ")"; },
            enumerable: true,
            configurable: true
        });
        AdvanceIf.prototype.cloneImplementation = function () { return new AdvanceIf(this.firstChild); };
        return AdvanceIf;
    }(Rule));
    Myna.AdvanceIf = AdvanceIf;
    // Used to match a string in the input string, advances the token. 
    var Text = (function (_super) {
        __extends(Text, _super);
        function Text(text) {
            _super.call(this, []);
            this.text = text;
            this.type = "text";
            this.className = "Text";
            var length = text.length;
            var vals = [];
            for (var i = 0; i < length; ++i)
                vals.push(text.charCodeAt(i));
            this.lexer = function (p) {
                if (!p.inRange)
                    return false;
                if (p.code !== vals[0])
                    return false;
                var index = p.index++;
                for (var i = 1; i < length; ++i, ++p.index) {
                    if (!p.inRange || p.code !== vals[i]) {
                        p.index = index;
                        return false;
                    }
                }
                return true;
            };
            this.parser = this.lexer;
        }
        Object.defineProperty(Text.prototype, "definition", {
            get: function () { return '"' + escapeChars(this.text) + '"'; },
            enumerable: true,
            configurable: true
        });
        Text.prototype.cloneImplementation = function () { return new Text(this.text); };
        return Text;
    }(Rule));
    Myna.Text = Text;
    // Creates a rule that is defined from a function that generates the rule. 
    // This allows two rules to have a cyclic relation. 
    var Delay = (function (_super) {
        __extends(Delay, _super);
        function Delay(fn) {
            _super.call(this, []);
            this.fn = fn;
            this.type = "delay";
            this.className = "Delay";
            var tmpParser = null;
            this.parser = function (p) { return (tmpParser ? tmpParser : tmpParser = fn().parser)(p); };
            var tmpLexer = null;
            this.lexer = function (p) { return (tmpLexer ? tmpLexer : tmpLexer = fn().lexer)(p); };
        }
        Delay.prototype.cloneImplementation = function () { return new Delay(this.fn); };
        Object.defineProperty(Delay.prototype, "definition", {
            get: function () { return "<delay>"; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Delay.prototype, "createsAstNode", {
            // It is assumed that a delay function creates an AST node,
            get: function () {
                return true;
            },
            enumerable: true,
            configurable: true
        });
        return Delay;
    }(Rule));
    Myna.Delay = Delay;
    //====================================================================================================================
    // Predicates don't advance the input 
    // Used to identify rules that do not advance the input
    var NonAdvancingRule = (function (_super) {
        __extends(NonAdvancingRule, _super);
        function NonAdvancingRule(rules) {
            _super.call(this, rules);
            this.type = "charSet";
        }
        Object.defineProperty(NonAdvancingRule.prototype, "nonAdvancing", {
            get: function () {
                return true;
            },
            enumerable: true,
            configurable: true
        });
        return NonAdvancingRule;
    }(Rule));
    Myna.NonAdvancingRule = NonAdvancingRule;
    // Returns true if the current token is in the token set. 
    var CharSet = (function (_super) {
        __extends(CharSet, _super);
        function CharSet(chars) {
            _super.call(this, []);
            this.chars = chars;
            this.type = "charSet";
            this.className = "CharSet";
            var vals = [];
            var length = chars.length;
            for (var i = 0; i < length; ++i)
                vals[i] = chars.charCodeAt(i);
            this.lexer = function (p) {
                return p.inRange && vals.indexOf(p.code) >= 0;
            };
            this.parser = this.lexer;
        }
        Object.defineProperty(CharSet.prototype, "definition", {
            get: function () { return "[" + escapeChars(this.chars) + "]"; },
            enumerable: true,
            configurable: true
        });
        ;
        CharSet.prototype.cloneImplementation = function () { return new CharSet(this.chars); };
        return CharSet;
    }(NonAdvancingRule));
    Myna.CharSet = CharSet;
    // Returns true if the current token is within a range of characters, otherwise returns false
    var CharRange = (function (_super) {
        __extends(CharRange, _super);
        function CharRange(min, max) {
            _super.call(this, []);
            this.min = min;
            this.max = max;
            this.type = "charRange";
            this.className = "CharRange";
            var minCode = min.charCodeAt(0);
            var maxCode = max.charCodeAt(0);
            this.lexer = function (p) {
                var code = p.code;
                return code >= minCode && code <= maxCode;
            };
            this.parser = this.lexer;
        }
        Object.defineProperty(CharRange.prototype, "definition", {
            get: function () { return "[" + this.min + ".." + this.max + "]"; },
            enumerable: true,
            configurable: true
        });
        ;
        CharRange.prototype.cloneImplementation = function () { return new CharRange(this.min, this.max); };
        return CharRange;
    }(NonAdvancingRule));
    Myna.CharRange = CharRange;
    // Returns true only if the child rule fails to match.
    var Not = (function (_super) {
        __extends(Not, _super);
        function Not(rule) {
            _super.call(this, [rule]);
            this.type = "not";
            this.className = "Not";
            var childLexer = rule.lexer;
            this.lexer = function (p) {
                if (!p.inRange)
                    return true;
                var index = p.index;
                if (!childLexer(p))
                    return true;
                p.index = index;
                return false;
            };
            this.parser = this.lexer;
        }
        Not.prototype.cloneImplementation = function () { return new Not(this.firstChild); };
        Object.defineProperty(Not.prototype, "definition", {
            get: function () { return "!" + this.firstChild.toString(); },
            enumerable: true,
            configurable: true
        });
        return Not;
    }(NonAdvancingRule));
    Myna.Not = Not;
    // Returns true only if the child rule matches, but does not advance the parser
    var At = (function (_super) {
        __extends(At, _super);
        function At(rule) {
            _super.call(this, [rule]);
            this.type = "at";
            this.className = "At";
            var childLexer = rule.lexer;
            this.lexer = function (p) {
                var index = p.index;
                if (!childLexer(p))
                    return false;
                p.index = index;
                return true;
            };
            this.parser = this.lexer;
        }
        At.prototype.cloneImplementation = function () { return new At(this.firstChild); };
        Object.defineProperty(At.prototype, "definition", {
            get: function () { return "&" + this.firstChild.toString(); },
            enumerable: true,
            configurable: true
        });
        return At;
    }(NonAdvancingRule));
    Myna.At = At;
    // Uses a function to return true or not based on the behavior of the predicate rule
    var Predicate = (function (_super) {
        __extends(Predicate, _super);
        function Predicate(fn) {
            _super.call(this, []);
            this.fn = fn;
            this.type = "predicate";
            this.className = "Predicate";
            this.lexer = fn;
            this.parser = this.lexer;
        }
        Predicate.prototype.cloneImplementation = function () { return new Predicate(this.fn); };
        Object.defineProperty(Predicate.prototype, "definition", {
            get: function () { return "<predicate>"; },
            enumerable: true,
            configurable: true
        });
        return Predicate;
    }(NonAdvancingRule));
    Myna.Predicate = Predicate;
    //===============================================================
    // Rule creation function
    // Create a rule that matches the text 
    function text(text) { return new Text(text); }
    Myna.text = text;
    // Creates a rule that matches a series of rules in order, and succeeds if they all do
    function seq() {
        var rules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            rules[_i - 0] = arguments[_i];
        }
        var rs = rules.map(RuleTypeToRule);
        /*
        if (rs.length == 0)
            return truePredicate;
        if (rs.length == 1)
            return rs[0];
        if (rs.length == 2 && rs[0].nonAdvancing && rs[1] instanceof Advance)
            return new AdvanceIf(rs[0]);
            */
        return new Sequence(rs);
    }
    Myna.seq = seq;
    // Creates a rule that tries to match each rule in order, and succeeds if at least one does 
    function choice() {
        var rules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            rules[_i - 0] = arguments[_i];
        }
        var rs = rules.map(RuleTypeToRule);
        /*
        if (rs.length == 0)
            return falsePredicate;
        if (rs.length == 1)
            return rs[0];
            */
        return new Choice(rs);
    }
    Myna.choice = choice;
    // Enables Rules to be defined in terms of variables that are defined later on.
    // This enables recursive rule definitions.  
    function delay(fxn) { return new Delay(fxn); }
    Myna.delay = delay;
    // Parses successfully if the given rule does not match the input at the current location  
    function not(rule) { return new Not(RuleTypeToRule(rule)); }
    Myna.not = not;
    ;
    // Returns true if the rule successfully matches, but does not advance the parser index. 
    function at(rule) { return new At(RuleTypeToRule(rule)); }
    Myna.at = at;
    ;
    // Attempts to apply a rule between min and max number of times inclusive. If the maximum is set to Infinity, 
    // it will attempt to match as many times as it can, but throw an exception if the parser does not advance 
    function quantified(rule, min, max) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = Infinity; }
        return new Quantified(RuleTypeToRule(rule), min, max);
    }
    Myna.quantified = quantified;
    // Attempts to apply the rule 0 or more times. Will always succeed unless the parser does not 
    // advance, in which case an exception is thrown.    
    function zeroOrMore(rule) { return quantified(rule).setType("zeroOrMore"); }
    Myna.zeroOrMore = zeroOrMore;
    ;
    // Attempts to apply the rule 1 or more times. Will throw an exception if the parser does not advance.  
    function oneOrMore(rule) { return quantified(rule, 1).setType("oneOrMore"); }
    Myna.oneOrMore = oneOrMore;
    // Attempts to match a rule 0 or 1 times. Always succeeds.   
    function opt(rule) { return quantified(rule, 0, 1).setType("optional"); }
    Myna.opt = opt;
    // Attempts to apply a rule a precise number of times
    function repeat(rule, count) { return quantified(rule, count, count).setType("repeat"); }
    Myna.repeat = repeat;
    // Returns true if one of the characters are present. Does not advances the parser position.
    function atChar(chars) { return new CharSet(chars); }
    Myna.atChar = atChar;
    // Returns true if none of the characters are present. Does not advances the parser position.
    function notAtChar(chars) { return atChar(chars).not; }
    Myna.notAtChar = notAtChar;
    // Advances parser if one of the characters are present.
    function char(chars) { return atChar(chars).advance; }
    Myna.char = char;
    // Advances parser if none of the characters are present.
    function notChar(chars) { return notAtChar(chars).advance; }
    Myna.notChar = notChar;
    // Advances if one of the characters are present, or returns false
    function atRange(min, max) { return new CharRange(min, max); }
    Myna.atRange = atRange;
    // Advances if one of the characters are present, or returns false
    function range(min, max) { return atRange(min, max).advance; }
    Myna.range = range;
    // Returns true if on of the characters are not in the range, but does not advance the parser position
    function notRange(min, max) { return range(min, max).not; }
    Myna.notRange = notRange;
    // Repeats a rule zero or more times, with a delimiter between each one. 
    function delimited(rule, delimiter) { return opt(seq(rule, seq(delimiter, rule).zeroOrMore)).setType("delimitedList"); }
    Myna.delimited = delimited;
    // Executes the rule, if the condition is not true
    function unless(rule, condition) { return seq(not(condition), rule).setType("unless"); }
    Myna.unless = unless;
    // Repeats the rule while the condition is not true
    function repeatWhileNot(body, condition) { return unless(body, condition).zeroOrMore.setType("repeatWhileNot"); }
    Myna.repeatWhileNot = repeatWhileNot;
    // Repeats the rule while the condition is not true, but must execute at least once 
    function repeatOneOrMoreWhileNot(body, condition) { return not(condition).then(body).then(repeatWhileNot(body, condition)).setType("repeatOneOrMoreWhileNot"); }
    Myna.repeatOneOrMoreWhileNot = repeatOneOrMoreWhileNot;
    // Repeats the rule until just after the condition is true once 
    function repeatUntilPast(body, condition) { return repeatWhileNot(body, condition).then(condition).setType("repeatUntilPast"); }
    Myna.repeatUntilPast = repeatUntilPast;
    // Repeats the rule until just after the condition is true once but must execute at least once 
    function repeatOneOrMoreUntilPast(body, condition) { return not(condition).then(body).then(repeatUntilPast(body, condition)).setType("repeatOneOrMoreUntilPast"); }
    Myna.repeatOneOrMoreUntilPast = repeatOneOrMoreUntilPast;
    // Advances the parse state while the rule is not true. 
    function advanceWhileNot(rule) { return repeatWhileNot(Myna.advance, rule).setType("advanceWhileNot"); }
    Myna.advanceWhileNot = advanceWhileNot;
    // Advances the parse state while the rule is not true but must execute ast least once 
    function advanceOneOrMoreWhileNot(rule) { return repeatOneOrMoreWhileNot(Myna.advance, rule).setType("advanceOneOrMoreWhileNot"); }
    Myna.advanceOneOrMoreWhileNot = advanceOneOrMoreWhileNot;
    // Advance the parser until just after the rule is executed 
    function advanceUntilPast(rule) { return repeatUntilPast(Myna.advance, rule).setType("advanceUntilPast"); }
    Myna.advanceUntilPast = advanceUntilPast;
    // Advance the parser until just after the rule is executed, but must execute at least once  
    function advanceOneOrMoreUntilPast(rule) { return repeatOneOrMoreUntilPast(Myna.advance, rule).setType("advanceOneOrMoreUntilPast"); }
    Myna.advanceOneOrMoreUntilPast = advanceOneOrMoreUntilPast;
    // Advances the parser unless the rule is true. 
    function advanceUnless(rule) { return Myna.advance.unless(rule).setType("advanceUnless"); }
    Myna.advanceUnless = advanceUnless;
    // Parses successfully if  the predictate passes
    function predicate(fn) { return new Predicate(fn); }
    Myna.predicate = predicate;
    // Executes an action when arrived at and continues 
    function action(fn) { return predicate(function (p) { fn(p); return true; }).setType("action"); }
    Myna.action = action;
    // Logs a message as an action 
    function log(msg) {
        if (msg === void 0) { msg = ""; }
        return action(function (p) { console.log(msg); }).setType("log");
    }
    Myna.log = log;
    // Throw a ParseError if reached 
    function err(message) { return action(function (p) { throw new ParseError(p, message); }).setType("err"); }
    Myna.err = err;
    // Asserts that the rule is executed 
    // This has to be embedded in a function because the rule might be in a circular definition.  
    function assert(rule) {
        return choice(rule, action(function (p) {
            throw new ParseError(p, "assertion failed, expected: " + RuleTypeToRule(rule));
        }));
    }
    Myna.assert = assert;
    // If first part of a guarded sequence passes then each subsequent rule must pass as well 
    // otherwise an exception occurs. This helps create parsers that fail fast, and thus provide
    // better feedback for badly formed input.      
    function guardedSeq(condition) {
        var rules = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            rules[_i - 1] = arguments[_i];
        }
        return seq(condition, seq.apply(void 0, rules.map(function (r) { return assert(r); }))).setType("guardedSeq");
    }
    Myna.guardedSeq = guardedSeq;
    // Parses the given rule surrounded by double quotes 
    function doubleQuoted(rule) { return seq("\"", rule, assert("\"")).setType("doubleQuoted"); }
    Myna.doubleQuoted = doubleQuoted;
    // Parses a double quoted string, taking into account special escape rules
    function doubleQuotedString(escape) { return doubleQuoted(choice(escape, notChar('"').zeroOrMore)).setType("doubleQuotedString"); }
    Myna.doubleQuotedString = doubleQuotedString;
    // Parses the given rule surrounded by single quotes 
    function singleQuoted(rule) { return seq("'", rule, assert("'")).setType("singleQuoted"); }
    Myna.singleQuoted = singleQuoted;
    // Parses a singe quoted string, taking into account special escape rules
    function singleQuotedString(escape) { return singleQuoted(choice(escape, notChar("'").zeroOrMore)).setType("singleQuotedString"); }
    Myna.singleQuotedString = singleQuotedString;
    // Parses the given rule surrounded by parentheses, and consumes whitespace  
    function parenthesized(rule) { return seq("(", Myna.ws, rule, Myna.ws, ")").setType("parenthesized"); }
    Myna.parenthesized = parenthesized;
    // Parses the given rule surrounded by curly braces, and consumes whitespace 
    function braced(rule) { return seq("{", Myna.ws, rule, Myna.ws, "}").setType("braced"); }
    Myna.braced = braced;
    // Parses the given rule surrounded by square brackets, and consumes whitespace 
    function bracketed(rule) { return seq("[", Myna.ws, rule, Myna.ws, "]").setType("bracketed"); }
    Myna.bracketed = bracketed;
    // Parses the given rule surrounded by angle brackets, and consumes whitespace 
    function tagged(rule) { return seq("<", Myna.ws, rule, Myna.ws, ">").setType("tagged"); }
    Myna.tagged = tagged;
    // A complete identifier, with no other letters or numbers
    function keyword(text) { return seq(text, not(Myna.identifierNext)).setType("keyword"); }
    Myna.keyword = keyword;
    // Chooses one of a a list of identifiers
    function keywords() {
        var words = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            words[_i - 0] = arguments[_i];
        }
        return choice.apply(void 0, words.map(keyword));
    }
    Myna.keywords = keywords;
    //===============================================================    
    // Core grammar rules 
    Myna.truePredicate = new Predicate(function (p) { return true; });
    Myna.falsePredicate = new Predicate(function (p) { return false; });
    Myna.end = new Predicate(function (p) { return !p.inRange; });
    Myna.notEnd = new Predicate(function (p) { return p.inRange; });
    Myna.advance = new Advance();
    Myna.all = Myna.advance.zeroOrMore;
    Myna.atLetterLower = atRange('a', 'z');
    Myna.atLetterUpper = atRange('A', 'Z');
    Myna.atLetter = choice(Myna.atLetterLower, Myna.atLetterUpper);
    Myna.atDigit = atRange('0', '9');
    Myna.atDigitNonZero = atRange('1', '9');
    Myna.atHexDigit = choice(Myna.atDigit, atRange('a', 'f'), atRange('A', 'F'));
    Myna.atBinaryDigit = atChar('01');
    Myna.atOctalDigit = atRange('0', '7');
    Myna.atAlphaNumeric = choice(Myna.atLetter, Myna.atDigit);
    Myna.atUnderscore = atChar("_");
    Myna.atSpace = atChar(" ");
    Myna.atTab = atChar("\t");
    Myna.atWs = atChar(" \t\r\n\u00A0\uFEFF");
    Myna.letterLower = Myna.atLetterLower.advance;
    Myna.letterUpper = Myna.atLetterUpper.advance;
    Myna.letter = Myna.atLetter.advance;
    Myna.letters = Myna.letter.oneOrMore;
    Myna.digit = Myna.atDigit.advance;
    Myna.digitNonZero = Myna.atDigitNonZero.advance;
    Myna.digits = Myna.digit.oneOrMore;
    Myna.integer = char('0').or(Myna.digits);
    Myna.hexDigit = Myna.atHexDigit.advance;
    Myna.binaryDigit = Myna.atBinaryDigit.advance;
    Myna.octalDigit = Myna.atOctalDigit.advance;
    Myna.alphaNumeric = Myna.atAlphaNumeric.advance;
    Myna.underscore = Myna.atUnderscore.advance;
    Myna.identifierFirst = choice(Myna.atLetter, Myna.atUnderscore).advance;
    Myna.identifierNext = choice(Myna.atAlphaNumeric, Myna.atUnderscore).advance;
    Myna.identifier = seq(Myna.identifierFirst, Myna.identifierNext.zeroOrMore);
    Myna.hyphen = text("-");
    Myna.crlf = text("\r\n");
    Myna.newLine = choice(Myna.crlf, "\n");
    Myna.space = text(" ");
    Myna.tab = text("\t");
    // JSON definition of white-space 
    Myna.ws = Myna.atWs.advance.zeroOrMore;
    //===============================================================
    // Parsing function 
    // Returns an array of nodes created by parsing the given rule repeatedly until 
    // it fails or the end of the input is arrived. One Astnode is created for each time 
    // the token is parsed successfully, whether or not it explicitly has the "_createAstNode" 
    // flag set explicitly. 
    function tokenize(r, s) {
        var result = this.parse(r.ast.zeroOrMore, s);
        return result ? result.children : [];
    }
    Myna.tokenize = tokenize;
    // Returns the root node of the abstract syntax tree created 
    // by parsing the rule. 
    function parse(r, s) {
        var p = new ParseState(s, 0, []);
        if (!r.ast.parser(p))
            return null;
        return p && p.nodes ? p.nodes[0] : null;
    }
    Myna.parse = parse;
    //===============================================================
    // Grammar functions 
    // The following are helper functions for grammar objects. A grammar is a loosely defined concept.
    // It is any JavaScript object where one or more member fields are instances of the Rule class.    
    // Returns all rules that belong to a specific grammar and that create AST nodes. 
    function grammarAstRules(grammarName) {
        return grammarRules(grammarName).filter(function (r) { return r._createAstNode; });
    }
    Myna.grammarAstRules = grammarAstRules;
    // Returns all rules that belong to a specific grammar
    function grammarRules(grammarName) {
        return allGrammarRules().filter(function (r) { return r.grammarName == grammarName; });
    }
    Myna.grammarRules = grammarRules;
    // Returns all rules as an array sorted by name.
    function allGrammarRules() {
        return Object.keys(Myna.allRules).sort().map(function (k) { return Myna.allRules[k]; });
    }
    Myna.allGrammarRules = allGrammarRules;
    // Returns an array of names of the grammars
    function grammarNames() {
        return Object.keys(Myna.grammars).sort();
    }
    Myna.grammarNames = grammarNames;
    // Creates a string representation of a grammar 
    function grammarToString(grammarName) {
        return grammarRules(grammarName).map(function (r) { return r.fullName + " <- " + r.definition; }).join('\n');
    }
    Myna.grammarToString = grammarToString;
    // Creates a string representation of the AST schema generated by parsing the grammar 
    function astSchemaToString(grammarName) {
        return grammarAstRules(grammarName).map(function (r) { return r.name + " <- " + r.astRuleDefn; }).join('\n');
    }
    Myna.astSchemaToString = astSchemaToString;
    // Initializes and register a grammar object and all of the rules. 
    // Sets names for all of the rules from the name of the field it is associated with combined with the 
    // name of the grammar. Each rule is stored in Myna.rules and each grammar is stored in Myna.grammars. 
    function registerGrammar(grammarName, grammar, defaultRule) {
        for (var k in grammar) {
            if (grammar[k] instanceof Rule) {
                var rule = grammar[k];
                rule.setName(grammarName, k);
                Myna.allRules[rule.fullName] = rule;
            }
        }
        Myna.grammars[grammarName] = grammar;
        if (defaultRule) {
            Myna.parsers[grammarName] = function (text) { return parse(defaultRule, text); };
        }
        return grammar;
    }
    Myna.registerGrammar = registerGrammar;
    //===========================================================================
    // Utility functions
    // Replaces characters with the JSON escaped version
    function escapeChars(text) {
        var r = JSON.stringify(text);
        return r.slice(1, r.length - 1);
    }
    Myna.escapeChars = escapeChars;
    // Given a RuleType returns an instance of a Rule.
    function RuleTypeToRule(rule) {
        if (rule instanceof Rule)
            return rule;
        if (typeof (rule) === "string")
            return text(rule);
        if (typeof (rule) === "boolean")
            return rule ? Myna.truePredicate : Myna.falsePredicate;
        throw new Error("Invalid rule type: " + rule);
    }
    Myna.RuleTypeToRule = RuleTypeToRule;
    // These should be commented out in the filnal version 
    function debugAssert(condition, rule) {
        if (!condition)
            throw new Error("Error occured while parsing rule: " + rule.fullName);
    }
    Myna.debugAssert = debugAssert;
    //===========================================================================
    // Initialization
    // The entire module is a grammar because it is an object that exposes rules as properties
    registerGrammar("core", Myna, null);
})(Myna || (Myna = {}));
if (typeof module === "object" && module.exports)
    module.exports = Myna;
//# sourceMappingURL=myna.js.map