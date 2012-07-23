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

function setup(cssString){
    var style = document.createElement('style')
        style.type = "text/experimental-css"
        style.id = "style"
        style.textContent = cssString
        
    var temp = document.createElement('div')
        temp.id = 'host'        
        
        
    document.querySelector('head').appendChild(style)    
    document.body.appendChild(temp)
}   

function teardown(){
    var elements = document.querySelectorAll("#style, #host")
    Array.prototype.forEach.call(elements, function(el){
        el.parentNode.removeChild(el)
    })
}

test("Create 'before' pseudo elements", function(){
    setup('#host::pseudo-element(1, "before"){ content: "test"}') 

    CSSPseudoElementsPolyfill.init()

    var host = document.querySelector("#host")
    var pseudos = host.pseudoElements
    //window.getPseudoElements(host, "before")

    ok(pseudos, "Host element has pseudo-elements")    
    equal(pseudos.length, 1, "Host has one pseudo-element")
    equal(pseudos[0].position, "before", "Host has one 'before' pseudo-element")
    equal(pseudos[0].ordinal, 1, "Host has one pseudo-element with ordinal 1")

    // teardown()
})

module("CSS Pseudo-elements OM")