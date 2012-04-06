/**
 * Author: Alex Nisnevich
 * Branched from CodeMirror's Scheme mode (by Koh Zi Han, based on implementation by Koh Zi Chun)
 */
CodeMirror.defineMode("dcpu16", function (config, mode) {
    var BUILTIN = "builtin", COMMENT = "comment", STRING = "string",
        ATOM = "atom", NUMBER = "number", BRACKET = "bracket", KEYWORD="keyword";
    var INDENT_WORD_SKIP = 2, KEYWORDS_SKIP = 1;
    
    function makeKeywords(str) {
        var obj = {}, words = str.split(" ");
        for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
        return obj;
    }

    var keywords = makeKeywords("SET ADD SUB MUL DIV MOD SHL SHR AND BOR XOR IFE IFN IFG IFB JSR");
    var registers = makeKeywords("A B C X Y Z I J POP PEEK PUSH SP PC O");
    
    /**
     * Checks if we're looking at a number. Also checks that it is not part of a longer identifier. 
     * Returns true/false accordingly.
     */
    function isNumber(ch, stream){ 
        if(/[0-9x]/.exec(ch) != null){ 
            stream.eatWhile(/[0-9x]/);
            if (stream.eol() || !(/[a-zA-Z\-\_\/]/.exec(stream.peek()))) return true;
            stream.backUp(stream.current().length - 1); // undo all the eating
        }
        return false;
    }

    return {
        startState: function () {
            return {
                indentStack: null,
                indentation: 0,
                mode: false,
                sExprComment: false
            };
        },

        token: function (stream, state) {
            if (state.indentStack == null && stream.sol()) {
                // update indentation, but only if indentStack is empty
                state.indentation = stream.indentation();
            }

            // skip spaces
            if (stream.eatSpace()) {
                return null;
            }
            var returnType = null;
            
            switch(state.mode){
                case "comment": // comment parsing mode
                    var next, maybeEnd = false;
                    while ((next = stream.next()) != null) {
                        if (next == "#" && maybeEnd) {
    
                            state.mode = false;
                            break;
                        }
                        maybeEnd = (next == "|");
                    }
                    returnType = COMMENT;
                    break;
                default: // default parsing mode
                    var ch = stream.next();
        
                    if (ch == ":") {
                        stream.skipTo(' ');
                        state.mode = "string";
                        returnType = STRING;
                    } else if (ch == ";") { // comment
                        stream.skipToEnd(); // rest of the line is a comment
                        returnType = COMMENT;
                    } else if (ch == "-"){
                        if (!isNaN(parseInt(stream.peek()))){
                            stream.eatWhile(/[\/0-9x]/);
                            returnType = NUMBER;
                        } else {                            
                            returnType = null;
                        }
                    } else if (isNumber(ch,stream)){
                        returnType = NUMBER;
                    } else if (ch == "(" || ch == "[") {
                        returnType = BRACKET;
                    } else if (ch == ")" || ch == "]") {
                        returnType = BRACKET;
                    } else {
                        stream.eatWhile(/[\w\$_\-]/);
        
                        if (keywords && keywords.propertyIsEnumerable(stream.current())) {
                            returnType = KEYWORD;
                        } else if (registers && registers.propertyIsEnumerable(stream.current())) {
                        		returnType = BUILTIN;
                        } else {
                        	returnType = null;
                        }
                    }
            }
            return (typeof state.sExprComment == "number") ? COMMENT : returnType;
        },

        indent: function (state, textAfter) {
            if (state.indentStack == null) return state.indentation;
            return state.indentStack.indent;
        }
    };
});

CodeMirror.defineMIME("text/x-dcpu16", "dcpu16");