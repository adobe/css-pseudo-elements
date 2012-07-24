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
            pseudoElementSelectorRegex: /pseudo-element\(\s*(\d+)\s*,\s*[\"\']\s*(\w+)\s*[\"\']\)/i
        }
        
        
    scope.getPseudoElements = function(element, position){
        var pseudos

        if (!element || element.nodeType !== 1){
            throw new Error("Invalid parameter 'element'. Expected DOM Node type 1")
        }

        if (typeof position !== 'string' || _config.pseudoPositions.indexOf(position) < -1){
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
        
        ordinal = parseInt(ordinal, 10)
        
        // ordinals need to be positive numbers, larger than 0
        if ((isNaN(ordinal) || ordinal < 1)){
            return
        }         

        // check valid position
        if (_config.pseudoPositions.indexOf(position) < 0){
            return
        }
        
        this.ordinal = ordinal
        this.position = position
        this.style = style
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
                
    
    /*
        Create pseudo-elements out of potential CSS Rules.       
        
        Check that the host of the pseudo-element exists.
        Check that the's only one pseudo element in the selector.
        Create CSSPseudoElement objects and attach them to the host.
        
        @param {Array} cssRules List of potential selectors to create pseudo-elements
    */
    function createPseudoElements(cssRules){ 
        cssRules.forEach(function(rule){
            var host, 
                data,
                pseudoElement,
                parts = rule.selectorText.split("::")
            
            // TODO: (cofirm) ignore multiple pseudo elements per selector
            if (parts.length > 2 || parts[0].indexOf(":") > 0){
                return
            }
                                                       
            // find the alleged pseudo's host element 
            host = document.querySelector(parts[0])
                                    
            // no host, no fun! The host must be a valid node element
            if (!host || host.nodeType !== 1){ 
                return
            }                  
            
            /* 
                attempt to extract the pseudo ordinal and position
                data[1] = ordinal, should be positive integer
                data[2] = position, should be string 
            */
            
            data = parts[1].match(_config.pseudoElementSelectorRegex)
            if (!data || !data.length || data.length < 3){
                return
            }
            
            pseudoElement = new CSSPseudoElement(data[1], data[2], rule.style) 
            
            if (!pseudoElement){
                return
            }       
            
            // become parasitic. 
            // Attach pseudo elements objects to the host node
            host.pseudoElements = host.pseudoElements || [] 
            host.pseudoElements.push(pseudoElement) 
            
            console.log(host.pseudoElements) 
        })
    }
        
    function init(){ 
        var pseudoRules = [],
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
        pseudoRules = parser.cssRules.filter(function(rule){  
            return rule.selectorText.indexOf("::") > 0
        })
        
        if (pseudoRules.length){
            createPseudoElements(pseudoRules)     
        }                                 
        else{
            console.warn("No pseudo-element rules")
        }
    }                                                  
    
    scope.CSSPseudoElementsPolyfill = (function(){
        return {
            init: init
        }
    })()
    
    document.addEventListener("DOMContentLoaded", init)
    
}(window)