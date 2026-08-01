Feature: Greeting whoever arrives

  Scenario: A visitor opens the home page
    Given a visitor opens the home page
    Then the page greets the world
    And the page is operable by anyone
