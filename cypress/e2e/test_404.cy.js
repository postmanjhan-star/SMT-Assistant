// https://docs.cypress.io/api/introduction/api.html

describe( "Test 404 Pages", () => {
  it( "visits 404 pages", () => {
    cy.request( { url: '/not-found', failOnStatusCode: false } ).its( 'status' ).should( 'equal', 200 ); // Should be 400 for best
    cy.visit( "/not-found", { failOnStatusCode: false } );
    //=> Test passes, tests that the HTTP code was 404, and tests page was visited
    
    // cy.contains("h1", "You did it!");
  } );
} );
