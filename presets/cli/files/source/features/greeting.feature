Feature: Greeting from the command line

  Scenario: Somebody runs hello with a name
    When they run "hello ada"
    Then it says "hello ada"

  Scenario: Somebody runs hello with nobody named
    When they run "hello"
    Then it says "hello world"
