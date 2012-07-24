/*!
Copyright (C) 2012 Adobe Systems, Incorporated. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

!function(scope){          
       
    scope = scope || window 
    
    if (!scope.CSSParser){
        throw new Error("Missing CSS Parser")
    }
    
    var _config = {
            styleType: "text/experimental-css",
            pseudoPositions: "before after letter line".split(" "),
            pseudoElementSelectorRegex: /((?:nth-(?:last-)?)?pseudo-element)\(\s*([\d\w\+\-]+)\s*,\s*[\"\']\s*(\w+)\s*[\"\']\)/i
        }
        
        
    scope.getPseudoElements = function(element, position){
        var pseudos

        if (!element || element.nodeType !== 1){
            throw new Error("Invalid parameter 'element'. Expected DOM Node type 1")
        }

        if (typeof position !== 'string' || _config.pseudoPositions.indexOf(position) < 0){
            throw new TypeError("Invalid parameter 'position'. Expected one of " + _config.pseudoPositions)
        }

        if (!element || !element.pseudoElements){
            pseudos = []
        }
        else{
            pseudos = element.pseudoElements.filter(function(pseudo){
                return pseudo.position === position
            })
        }   
        return new CSSPseudoElementList(pseudos)
    } 
    
    /*
        Create a CSSPseudoElement object.
        
        @param {Integer} ordinal The oridinal of the pseudo-element shoud be a positive integer
        @param {String} postition The position of the pseudo-element should be one of: "before","after","letter" or "line"
        @param {Object} style The CSS style properties of the pseudo-element
    */    
    function CSSPseudoElement(ordinal, position, style){
        
        // pseudos need to have either content of flow-from
        // TODO: support flow-from
        if (!style['content'] || style['content'] === "none"){
            return     
        }     
        
        // create the mock pseudo-element as a real element
        var mock = document.createElement("span")
        mock.setAttribute("data-pseudo-element","")
        
        if (style['content']){
            mock.textContent = style['content']
        }
        
        if (style['-webkit-flow-from']){
            mock.style = '-webkit-flow-from: ' + style['-webkit-flow-from']
        }
         
        this.ordinal = ordinal
        this.position = position
        this.style = style 
        this.src = mock
        
        this.addEventListener = function(event, handler){
            document.addEventListener.call(mock, eventName, handler)
        } 
        
        this.removeEventListener = function(event, handler){
            document.removeEventListener.call(mock, eventName, handler)
        }
    }   

    function CSSPseudoElementList(pseudos){ 
        pseudos = pseudos || []

        return{
            length: pseudos.length,
            
            item: function(index){
                return pseudos[index] || null
            },     
            
            getByOrdinalAndPosition: function(ordinal, position){
                var match = pseudos.filter(function(pseudo){
                    return pseudo.ordinal === ordinal && pseudo.position === position
                }) 

                return match.length ? match.pop() : null
            }
        }
    } 
    
    function CSSPseudoElementRule(cssRule){  
        
        var data, 
            ordinal,
            parts = cssRule.selectorText.split("::")
        
        // TODO: (cofirm) ignore multiple pseudo elements per selector
        if (parts.length > 2 || parts[0].indexOf(":") > 0){
            throw new Error("Invalid pseudo-element selector " + cssRule.selectorText)
        }  

        /* 
            Attempt to extract the pseudo ordinal and position
            data[1] = pseudo-element selector, should be one of:
                pseudo-element
                nth-pseudo-element
                nth-last-pseudo-element                              
                
            data[2] = ordinal, should be positive integer
            
            data[3] = position, should be one of:
                before
                after
                letter
                line
        */
        data = parts[1].match(_config.pseudoElementSelectorRegex)
        if (!data || !data.length || data.length < 4){
            throw new Error("Invalid pseudo-element selector " + cssRule.selectorText)
        }                                                        

        // the selector for the host element
        cssRule.hostSelectorText = parts[0]
        
        // the selector for the pseudo-element
        cssRule.pseudoSelectorText = parts[1]  
        
        cssRule.pseudoSelectorType = data[1]    
                                                    
        if (_config.pseudoPositions.indexOf(data[3]) < 0){
            throw new Error("Invalid pseudo-element position: " + data[3] + ". Expected one of: " + _config.pseudoPositions.join(", ") )            
        }     

        cssRule.position = data[3]    
        
        // TODO: make me cleaner!
        switch( data[1] ){        
            
            // pseudo-elements have ordinal (integer) and position
            case "pseudo-element":     
                ordinal = parseInt(data[2], 10)
            
                // ordinals need to be ONLY positive numbers, larger than 0
                if (/\D/.test(data[2]) || isNaN(ordinal) || ordinal < 1){
                    throw new Error("Invalid pseudo-element ordinal: " + data[2] + ". Expected positive integer")            
                }
            
                cssRule.ordinal = parseInt(data[2], 10)
            break
                                        
            // nth-pseudo-elements have an index (an+b)|odd|even and position
            case "nth-pseudo-element":
            case "nth-last-pseudo-element": 
            
                cssRule.index = data[2]
                
                if ( /^\d+$/.test(data[2]) ){
                    
                    cssRule.queryFn = function(ordinal){
                        return function(index){
                            return index === ordinal
                        }
                    }(parseInt(data[2], 10))
                }
                else if(/\d+?n?(\+\d+)?/.test(data[2])){
                    cssRule.queryFn = getQueryFunction(data[2]) 
                } 
                else {
                    if (data[2] === "odd"){    
                        cssRule.queryFn =  getQueryFunction("2n+1") 
                    }
                    else if(data[2] === "even"){  
                        cssRule.queryFn =  getQueryFunction("2n")
                    }
                    else{
                        throw new Error("Invalid pseudo-element index: " + data[2] + ". Expected one of: an+b, odd, even")            
                    }
                }    
                
            break
        }
        
        return cssRule
    }
                                      
    /*
        Returns a query function from the formula provided.
        
        @param {String} formula The formula to convert to a function.
                                Formula must follow an+b form
        @see: http://www.w3.org/TR/css3-selectors/#nth-child-pseudo 
        @return {Function}
    */
    function getQueryFunction(formula){
        var temp,
            pattern = /(\d+)?(n)(?:([\+-])(\d+))?/,
            parts = formula.match(pattern),
            multiplier = parseInt(parts[1], 10) || 1,
            operation = parts[3] || "+",
            modifier = parseInt(parts[4], 10) || 0 

        // TODO: test the hell out this!            
        return function(index){
           temp = multiplier * index
           return (operation === "-")? temp - modifier : temp + modifier
        }    
    }
    
    /*
        Create pseudo-elements out of potential CSS Rules.       
        
        Check that the host of the pseudo-element exists.
        Check that the's only one pseudo element in the selector.
        Create CSSPseudoElement objects and attach them to the host.
        
        @param {Array} cssRules List of potential selectors to create pseudo-elements
    */
    function createPseudoElements(cssRules){ 
        cssRules.forEach(function(rule){                  
            
            var pseudoElement = new CSSPseudoElement(rule.ordinal, rule.position, rule.style),
                host = document.querySelector(rule.hostSelectorText)
                
            console.log(pseudoElement, host)

            // quick check for valid pseudo-element
            if (pseudoElement.position){           
                attachPseudoElement(host, pseudoElement)
            }
        })
    }
    
    /*
        Attach the pseudo-element to its host element based on the 'position'
        property
        
        @param {DOMElement} host The DOM Element that hosts the pseudo-element
        @param {CSSPseudoElement} pseudoElement The pseudo-element
    */
    function attachPseudoElement(host, pseudoElement){ 
        
        // become parasitic. 
        // Attach pseudo elements objects to the host node
        host.pseudoElements = host.pseudoElements || [] 
        host.pseudoElements.push(pseudoElement)  
        
        switch(pseudoElement.position){
            case "before":
                if (host.firstChild){
                    host.insertBefore(pseudoElement.src, host.firstChild)
                }                                                       
                else{
                    host.appendChild(pseudoElement.src)
                }                    
            break
            
            case "after":                              
                host.appendChild(pseudoElement.src)
            break
        }
    }
    
    /*
        Filter rules and return likely ::pseudo-element rules
        
        @param {Array} rules Array of CSSRule instances
        @return {Array} filtered array
        
    */
    function getPseudoElementRules(rules){
        rules = (rules.length) ? rules : []
        
        return rules.filter(function(rule){  
            return rule.selectorText.indexOf("::") > 0
        })
    }  
    
    
    function init(){ 
        var cssRules = [],
            pseudoRules = [],
            parser = new CSSParser(),
            styles = document.querySelectorAll('style[type="'+ _config.styleType +'"]')

        if (!styles || !styles.length){ 
            console.warn("No stylesheets found. Expected at least one stylesheet with type = "+ _config.styleType)
            return
        }       
        
        Array.prototype.forEach.call(styles, function(stylesheet){
            parser.parse(stylesheet.textContent)
        })   
        
        // cascade CSS rules where required
        parser.cascade()
            
        // quick filter of rules with pseudo element selectors in them
        cssRules = getPseudoElementRules(parser.cssRules)
        
        if (!cssRules.length){
            console.warn("No pseudo-element rules")
            return
        }            
        
        cssRules.forEach(function(rule){    
            try{
                pseudoRules.push(new CSSPseudoElementRule(rule))
            }
            catch(e){}
        })
        
        console.log(pseudoRules) 
        
        var goodRules = pseudoRules.filter(function(rule){
            return rule.pseudoSelectorType == "pseudo-element"
        })
                            
        createPseudoElements(goodRules)     
    }                                                  
    
    scope.CSSPseudoElementsPolyfill = (function(){
        return {
            init: init
        }
    })()
    
    document.addEventListener("DOMContentLoaded", init)
    
}(window)