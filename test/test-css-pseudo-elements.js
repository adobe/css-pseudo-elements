function createPseudoElements(cssString){
    var style = document.createElement('style')
        style.type = "text/experimental-css"
        style.id = "style"
        style.textContent = cssString
        
    var temp = document.createElement('div')
        temp.id = 'host'        
        
    document.querySelector('head').appendChild(style)    
    document.body.appendChild(temp)
} 

function removePseudoElements(){
    var elements = document.querySelectorAll("#style, #host")
    Array.prototype.forEach.call(elements, function(el){
        el.parentNode.removeChild(el)
    })
}                                                            

function setup(cssString) { return createPseudoElements.call(this, cssString) } 
function teardown() {return removePseudoElements.call(this) }

module("Parse CSS Pseudo-elements")  

test("Parser exists", function(){       
    ok(window.CSSParser, "The parser is available")
})   

test("Parse basic ::pseudo-element", function(){
    var parser = new CSSParser()
    parser.parse("body::pseudo-element(1, 'before'){ content: 'test'} ") 
                        
    equal(parser.cssRules.length, 1, "Parse one rule");
    equal(parser.cssRules[0].selectorText, "body::pseudo-element(1, 'before')", "Parse selector");
})

test("Parse ::pseudo-element cascade", function(){
    var parser = new CSSParser()
    parser.parse("body::pseudo-element(2, 'after'){ content: 'test'}; body::pseudo-element(2, 'after'){  color: red } ") 
    parser.cascade()
                        
    equal(parser.cssRules.length, 1, "Parse one rule");
    equal(parser.cssRules[0].style.color, "red" , "Parse two rules");
})

module("Create CSS Pseudo-elements")


test("Create 'before' pseudo elements", function(){
    setup('#host::pseudo-element(1, "before"){ content: "test"}') 

    CSSPseudoElementsPolyfill.init()

    var host = document.querySelector("#host")
    var pseudos = host.pseudoElements

    ok(pseudos, "Host element has pseudo-elements")    
    equal(pseudos.length, 1, "Host has one pseudo-element")
    equal(pseudos[0].position, "before", "Host has one 'before' pseudo-element")
    equal(pseudos[0].ordinal, 1, "Host has one pseudo-element with ordinal 1")

    teardown()
})

test("CSS Cascade of ::before with ::pseudo-element(1, 'before')", function(){
    setup('#host::before{content: "before"; color: red} \
           #host::pseudo-element(1, "before"){ content: "test"; color: green}') 

    CSSPseudoElementsPolyfill.init()

    var host = document.querySelector("#host")
    var pseudos = host.pseudoElements

    equal(pseudos.length, 1, "Host has one pseudo-element")
    equal(pseudos[0].style["content"], "test", "::pseudo-element overwrites ::before 'content'")
    equal(pseudos[0].style["color"], "green", "::pseudo-element overwrites ::before 'color'")

    teardown()
})

module("::nth-pseudo-element")

test("Get index by query formula", function(){
                                 
equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("2n").call(this, 0) , 0, "2n")
equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("2n").call(this, 1) , 2, "2n") 

equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("2n+1").call(this, 0) , 1, "2n+1")
equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("2n+1").call(this, 1) , 3, "2n+1")

equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("3n+5").call(this, 1) , 8, "3n+5")

equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("0n+0").call(this, 1) , 1, "0n+0") 
                                                                 
// riding over 2n and 2n+1
equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("even").call(this, 0) , 0, "even") 
equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("odd").call(this, 0) , 1, "odd") 

equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("even").call(this, 1) , 2, "even") 
equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("odd").call(this, 1) , 3, "odd") 

equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("1").call(this, 1) , 1)
equal(CSSPseudoElementsPolyfill.getIndexQueryFunction("3").call(this, 3) , 3)

})

module("Pseudo-elements CSS OM", {
    setup: function(){
        createPseudoElements('#host::pseudo-element(1, "before"){ content: "test"}')
        CSSPseudoElementsPolyfill.init() 
    },
       
    teardown: function(){
        removePseudoElements()
    }
}) 

test("CSSPseudoElementList", function(){
    var host = document.querySelector("#host")
    var pseudos = window.getPseudoElements(host, "before")

    ok(pseudos instanceof CSSPseudoElementList, "window.getPseudoElements() should return a CSSPseudoElementList")
    equal(pseudos.length, 1, "CSSPseudoElementList should have a single item")

    equal(typeof pseudos.item, 'function', "CSSPseudoElementList should have item() method")
    ok(pseudos.item(0) instanceof CSSPseudoElement, "CSSPseudoElementList.item(0) should be a CSSPseudoElement")
    
    equal(typeof pseudos.getByOrdinalAndPosition, 'function', "CSSPseudoElementList should have getByOrdinalAndPosition() method")
    ok(pseudos.getByOrdinalAndPosition(1, 'before') instanceof CSSPseudoElement, "CSSPseudoElementList.getByOrdinalAndPosition(0) should be a CSSPseudoElement")
})

test("window.getPseudoElements()", function(){
    equal(typeof window.getPseudoElements, "function", "window.getPseudoElements() should be a function")

    var host = document.querySelector("#host")
    var pseudos = window.getPseudoElements(host, "before") 
    
    ok(pseudos instanceof CSSPseudoElementList, "window.getPseudoElements() should return a CSSPseudoElementList")
})   