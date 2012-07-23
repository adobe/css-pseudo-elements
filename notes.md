# CSS Pseudo Elements

## ::pseudo-element

**::pseudo-element( ordinal, position )**

- ordinal: unsigned, positive, integer
- position: "before" | "after" | "letter" | "line"

Creates pseduo-elements only if 'content' or 'flow-from' are not both 'none'.
Selects pseudo-elements for CSS Cascade.

:pseudo-element( 1, "before" ) == ::before
:pseudo-element( 1, "after" ) == ::after
:pseudo-element( 1, "letter" ) == ::first-letter
:pseudo-element( 1, "line" ) == ::first-line

## ::nth-pseudo-element and ::nth-last-pseudo-element

**::nth-pseudo-element( index, position )**
**::nth-last-pseudo-element( index, position )**

- index: an+b | "odd" | "even"
- position: "before" | "after" | "letter" | "line" | **"column"**  

Only selects pseudo-elements. Does not alter their properties.
Can be used as second param of window.getComptedStyle(element, 'pseudo') if pseudo returns only one element.    

## CSSOM        

CSSPseudoElement {
    ordinal: {Integer},
    position: {String}
    style: {CSSStyleDeclaration}
}  

CSSPseudoElementList{
    length: {Integer},
    item: function({Integer}){},
    getByOrdinalAndPosition: function({Integer}, {String}){ } 
           -> CSSPseudoElement or NULL
}        

Window.getPseudoElements(DOMElement, position) -> CSSPseudoElementList



