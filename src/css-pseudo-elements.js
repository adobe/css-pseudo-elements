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
	
	var _parser = new CSSParser(),												   
	    _config = {
			styleType: "text/experimental-css",
			pseudoPositions: "before after letter line".split(" "),
			pseudoElementSelectorRegex: /((?:nth-(?:last-)?)?pseudo-element)\s*\(\s*([\d\w\+\-]+)\s*,\s*[\"\']\s*(\w+)\s*[\"\']\)/i,
			pseudoElementSelectorRegexSimple: /^(before|after)$/ 
		}
		
		
	scope.getPseudoElements = function(element, position){
	    var pseudos 
	    
		if (!element || element.nodeType !== 1){
			throw new Error("Invalid parameter 'element'. Expected DOM Node type 1")
		}

		if (typeof position !== 'string' || _config.pseudoPositions.indexOf(position) < 0){
			throw new TypeError("Invalid parameter 'position'. Expected one of " + _config.pseudoPositions)
		}    
		
		if (!element.pseudoElements){
		    pseudos = []
		}                  
		
        pseudos = element.pseudoElements.filter(function(pseudo){
             return pseudo.position === position
         })                                  
         
		return new CSSPseudoElementList(pseudos)
	} 
	
	/*
		Create a CSSPseudoElement object.
		
		@param {Integer} ordinal The oridinal of the pseudo-element shoud be a positive integer
		@param {String} postition The position of the pseudo-element should be one of: "before","after","letter" or "line"
		@param {Object} style The CSS style properties of the pseudo-element
	*/	  
	function CSSPseudoElement(ordinal, position, style){
		var cssText = []     
				
        // pseudos need to have either content of flow-from		
        if (!style['content'] && !style['-webkit-flow-from']){
            return
        }
		
		// create the mock pseudo-element as a real element
		var mock = document.createElement("span")
		mock.setAttribute("data-pseudo-element","")
		mock.setAttribute("data-ordinal", ordinal)
		mock.setAttribute("data-position", position)
		                    
		if (style['content']){                 
			mock.textContent = style['content']
		}  
		
		for (var key in style){
			cssText.push(key + ":" + style[key])
		}			  
		
		mock.setAttribute("style", cssText.join(";") )
		 
		this.ordinal = ordinal
		this.position = position 
		
		this.src = mock
		
        return this
	}
	
	function CSSPseudoElementList(pseudos){
	    var self = this 
	    
	    pseudos.forEach(function(pseudo, index){  
	        self[index] = pseudos[index]        
	    })
	    
	    this.length = pseudos.length      
	} 
	
    CSSPseudoElementList.prototype.item = function(index){
        return this[index] || null
    }                             
    
    CSSPseudoElementList.prototype.getByOrdinalAndPosition = function(ordinal, position){
        var match = Array.prototype.filter.call(this, function(pseudo){
            return pseudo.ordinal === ordinal && pseudo.position === position
        }) 
    
        return match.length ? match.pop() : null
    }    
	
	function CSSPseudoElementRule(cssRule){
	             
	    /*
	        Generate uniform selector text for pseudo-elements
	        Necessary when doing CSS cascade and comparison
	    */
	    function getSelectorText(host, pseudo, ordinal, position){
	        return  [host, "::", pseudo , "(", ordinal, ', \"', position , '\"' , ")"].join('') 
	    }
	    
		var data, 
			ordinal,
			position,
			hostSelectorText,
			pseudoSelectorType,
			parts = cssRule.selectorText.split("::")
		
		// ignore multiple pseudo elements per selector
		if (parts.length < 2 || parts.length > 2 || parts[0].indexOf(":") > 0){
			throw new Error("Invalid pseudo-element selector " + cssRule.selectorText)
		}
		
		hostSelectorText = parts[0]

		/* See if the selector is simple ::before or ::after
		   data[1] = position, should be one of:
				before
				after
		*/		  
		data = parts[1].match(_config.pseudoElementSelectorRegexSimple)
					   
		// simple ::before or ::after match. convert it to ::pseudo-element
		if (data && data[1]){
		    
			// make a CSSRule out of the real pseudo-element css declaration
			var newRule = _parser.parseCSSDeclaration(cssRule.cssText) 
			if (!newRule){
			    return
			}         
			
			newRule.ordinal = 1
			newRule.position = data[1]
			newRule.pseudoSelectorType = "pseudo-element"
            newRule.hostSelectorText = hostSelectorText 
			
			// rewrite the selector text
			newRule.selectorText = getSelectorText(newRule.hostSelectorText, newRule.pseudoSelectorType, newRule.ordinal, newRule.position)
			
			return newRule
		}
		else{
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
		} 
		 
		pseudoSelectorType = data[1] 
		ordinal = data[2] 
		position = data[3]
		
		// the selector for the host element
		cssRule.hostSelectorText = hostSelectorText
		cssRule.pseudoSelectorType = pseudoSelectorType
		cssRule.position = position 
													
		if (_config.pseudoPositions.indexOf(position) < 0){
			throw new Error("Invalid pseudo-element position: " + position + ". Expected one of: " + _config.pseudoPositions.join(", ") )			
		}	  
		
		// TODO: make me cleaner!
		switch(pseudoSelectorType){		  
			
			// pseudo-elements have ordinal (integer) and position
			case "pseudo-element": 
			
			    var ordinalAsNumber = parseInt(ordinal, 10)
			
				// ordinals need to be ONLY positive numbers, larger than 0
				if (/\D/.test(ordinal) || isNaN(ordinalAsNumber) || ordinalAsNumber < 1){
					throw new Error("Invalid pseudo-element ordinal: " + ordinal + ". Expected positive integer")			 
				}
			
				cssRule.ordinal = ordinalAsNumber
				cssRule.selectorText = getSelectorText(cssRule.hostSelectorText, cssRule.pseudoSelectorType, cssRule.ordinal, cssRule.position)
				
			break
										
			// nth-pseudo-elements have an index (an+b)|odd|even and position
			case "nth-pseudo-element":
			case "nth-last-pseudo-element": 
			
				cssRule.index = data[2] 
				cssRule.queryFn = getIndexQueryFunction(data[2])           
				
			break
		}
		
		return cssRule
	}
	
	function getIndexQueryFunction(query){
	    
	    var queryFn = function(){}
	    
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

    		   if (operation == "-"){
    		       return temp - modifier
    		   }
    		   else{
    		       return temp + modifier
    		   }
    		}	 
    	} 
    	
	    if (/^\d+$/.test(query) ){
			
			queryFn = function(ordinal){
				return function(index){
					if (index == ordinal){    
					    return index
					} 
				}
			}(parseInt(query, 10)) 
			
		}
		else if(/\d+?n?(\+\d+)?/.test(query)){  
			queryFn = getQueryFunction(query) 
		} 
		else {
			if (query === "odd"){	   
				queryFn = getQueryFunction("2n+1")
			}
			else if(query === "even"){             
				queryFn = getQueryFunction("2n") 
			}
			else{
				throw new Error("Invalid pseudo-element index: " + query + ". Expected one of: an+b, odd, even")			  
			}
		}
		
		return queryFn
	}
									  
	/*
		Create pseudo-elements out of potential CSS Rules.		 
		
		Check that the host of the pseudo-element exists.
		Check that the's only one pseudo element in the selector.
		Create CSSPseudoElement objects and attach them to the host.
		
		@param {Array} cssRules List of potential selectors to create pseudo-elements
	*/
	function createPseudoElements(cssRules){ 
	    var groups, host, position
	        
	    // group rules by hostSelectorText
	    // TODO: remvoe this step and merge with nth-pseudo grouping
	    groups = groupByHostSelector(cssRules)
	    
	    for (host in groups){              
	        for (position in groups[host]){

	            // create and attach pseudo-elements
	            groups[host][position].forEach(createPseudoElement)
	        }
	    }
	}
	
	function createPseudoElement(rule){
	     var pseudoElement = new CSSPseudoElement(rule.ordinal, rule.position, rule.style),
				host = document.querySelector(rule.hostSelectorText)

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
	    Group an array of CSSPseudoElementRule items into separate arrays by their hostSelectorText and position
	    Sort rules by ordinal
	    
	    @param {Array} cssRules Array of CSSPseudoElementRule items
	    @return {Object} key/value store
	        @key = {String} hostSelectorText
	        @value = {Array} array of CSSPseudoElementRule 
	*/
	function groupByHostSelector(cssRules){
	    var groups = {}, host, position
	    
	    cssRules.forEach(function(rule){		
		    
		    if (!groups[rule.hostSelectorText]){
		        groups[rule.hostSelectorText] = {
		            before: [],
		            after: []
		        }
            }    
		    
            groups[rule.hostSelectorText][rule.position].push(rule)
        })
        
        for (host in groups){              
	        for (position in groups[host]){
	            /* 
	                Sort the CSSRules ascending by their 'ordinal' property
	                This helps maintain correct rendering order from the host boundaries 
	                when appending / prepending based on 'position' property

	                    before -> preprend: [3,2,1]BOX
	                    after -> append: BOX[1,2,3]
                */
	            groups[host][position].sort(function(a, b){
                    return a.ordinal - b.ordinal
                })
	        }
	    } 
	    
	    return groups
	}
	
	/*
		Filter rules and return likely ::pseudo-element rules
		
		@param {Array} rules Array of CSSRule instances
		@return {Array} filtered array
		
	*/
	function collectPseudoElementRules(rules){
		rules = (rules.length) ? rules : []
		
		return rules.filter(function(rule, index){
			return rule.selectorText.indexOf("::") > 0
		})
	}
	    
	/*
	    Return an array of real CSSRules with ::before and ::after.
	    These are plucked from the document stylesheets, copied, and delete so they don't apply anymore.
	    
	    @return {Array}
	*/
	function collectRealPseudoElementRules(){
        var realRules = []
        
		Array.prototype.forEach.call(document.styleSheets, function(sheet){      
		    var ruleIndexToDelete = []
		    
		    Array.prototype.forEach.call(sheet.cssRules, function(rule, index){
    		    if (rule.selectorText.indexOf("::") > 0){   
    		        
    		        var x = _parser.doExtend({}, rule)
    		        // make a copy of the rule
                    realRules.push(rule)
                    
                    // prepare to delete the original rule so it won't apply anymore
                    ruleIndexToDelete.push(index)
    		    }
    		})             

    		// reversing array in order to delete from the end
    		ruleIndexToDelete.reverse().forEach(function(ruleIndex){
                sheet.removeRule(ruleIndex)
    		})
		})        
		
		return realRules   
	}
	
	/*

	*/
	function processNthPseudoElementRules(pseudoRules, nthRules){
		
		// TODO: make grouping a single operation,
		// group rules by hostSelectorText
	    var groups = groupByHostSelector(pseudoRules)
	    
	    nthRules.forEach(function(nthRule){    
	        
            if (groups[nthRule.hostSelectorText]){
                
                // get all potential pseudo-element rules that might be matched by this nth-pseudo-rule
                var potentialRules = groups[nthRule.hostSelectorText][nthRule.position]
                
                var matchedRules = matchNthPseudoElementRule(potentialRules, nthRule)

                matchedRules.forEach(function(rule){
                    // augment matching rule with CSS properties from the nth-pseuod rule
                    rule.style = _parser.doExtend({}, rule.style, nthRule.style)
                })        

                // CSS Cascade will apply later on
                pseudoRules = pseudoRules.concat(matchedRules)  
            }
	    })   

		return pseudoRules
	}
	    
	/*       
	    Find ::pseudo-element rules that match the given ::nth-pseudo or ::nth-last-pseudo rule
	    The nth-pseudo can match:
	        a specific index (not ordinal)
	        odd indexes
	        even index, or 
	        indexes which satisfy an 'an+b' formula
	        
	    @note CSS indexes start from 1. JavaScript indexes start from 0.
	    
	    @param {Array} pseudoRules Array of CSSPseudoElementRule instances
	    @param {CSSPseudoElementRule} nthRule The rule to match against.
	    
	    @return {Array} array of matching rules 
	*/
	function matchNthPseudoElementRule(pseudoRules, nthRule){
        var matchedRules = []
        
        pseudoRules.forEach(function(rule, index){ 
            
            var match,             
                // expecting 1-indexed array in CSS an+b formula
                pos = nthRule.queryFn(index + 1),
                maxIndex = pseudoRules.length - 1
            
            // JS arrays are 0-indexed
            pos = pos - 1
            
            switch (nthRule.pseudoSelectorType){
                case "nth-pseudo-element":   
                    match = pseudoRules[pos] 
                break
                
                case "nth-last-pseudo-element": 
                    // matching from the end
                    match = pseudoRules[maxIndex - pos] 
                break
            }            
            
            if (match){                                    
                matchedRules.push(match)
            }        
        })
        
        return matchedRules
	}
	
	function init(){ 
		var cssRules = [], 
			pseudoRules = [],
			goodRules = [],
			nthRule = [],
			experimentalStyleSheets = document.querySelectorAll('style[type="'+ _config.styleType +'"]')

		if (!experimentalStyleSheets || !experimentalStyleSheets.length){ 
			console.warn("No stylesheets found. Expected at least one stylesheet with type = "+ _config.styleType)
			return
		}		
	   
	    // collect rules from experimental stylesheets
		Array.prototype.forEach.call(experimentalStyleSheets, function(sheet){
			_parser.parse(sheet.textContent)
		})	 
		
        // cascade CSS rules where required
        _parser.cascade()

        // get real ::before and ::after pseudo-element rules
        cssRules = cssRules.concat(collectRealPseudoElementRules())  
        
		// quick filter of rules with pseudo element selectors in them
		cssRules = cssRules.concat(collectPseudoElementRules(_parser.cssRules))
												
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
		
		goodRules = pseudoRules.filter(function(rule){
			return rule.pseudoSelectorType === "pseudo-element"
		})        
		
		// cascade real and prototype pseudo-element rules
        goodRules = _parser.cascade(goodRules)
		 
		nthRules = pseudoRules.filter(function(rule){
		    return /nth-(?:last-)?pseudo-element/i.test(rule.pseudoSelectorType)
		})
		
        goodRules = processNthPseudoElementRules(goodRules, nthRules)
		
		// cascade prototype pseudo-element rules generated by nth-pseudo matching
        goodRules = _parser.cascade(goodRules) 
        
		createPseudoElements(goodRules)
	}
	
	scope.CSSPseudoElementList = CSSPseudoElementList
	scope.CSSPseudoElement = CSSPseudoElement
	
	scope.CSSPseudoElementsPolyfill = (function(){
		return {
			init: init,
			getIndexQueryFunction: getIndexQueryFunction
		}
	})()
	
	document.addEventListener("DOMContentLoaded", init)
	
}(window)