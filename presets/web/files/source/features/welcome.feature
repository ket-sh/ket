Feature: Welcoming whoever arrives

  Scenario: A visitor opens the home page
    Given a visitor opens the home page
    Then the page welcomes them to "__PROJECT_NAME__"
    And the page is operable by anyone
