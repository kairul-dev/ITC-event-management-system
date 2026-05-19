# ITC Secure Document Verification System Use Case Diagram

```mermaid
flowchart LR
    Admin["Admin"]
    HighCouncil["High Council"]
    ClubAdvisor["Club Advisor"]
    Student["Student"]
    Stripe["Stripe Payment Gateway"]

    subgraph System["ITC SECURE DOCUMENT VERIFICATION SYSTEM"]
        direction TB
        UC01(["Login and Registration"])
        UC02(["Manage Profile"])
        UC03(["Submit Event Paperwork"])
        UC04(["Review Event Paperwork"])
        UC05(["Approve or Reject Paperwork"])
        UC06(["Publish Event to Main Page"])
        UC07(["Display Published Events"])
        UC08(["Register for Event"])
        UC09(["Pay Event Fee by Card"])
        UC10(["View Card Payment Records"])
        UC11(["Generate Certificate"])
        UC12(["Approve Certificate"])
        UC13(["View Certificate"])
        UC14(["Generate Event Report"])
    end

    Admin --- UC01
    Admin --- UC02
    Admin --- UC03
    Admin --- UC06
    Admin --- UC10
    Admin --- UC11
    Admin --- UC14

    HighCouncil --- UC01
    HighCouncil --- UC02
    HighCouncil --- UC04
    HighCouncil --- UC05

    ClubAdvisor --- UC01
    ClubAdvisor --- UC02
    ClubAdvisor --- UC04
    ClubAdvisor --- UC05
    ClubAdvisor --- UC12

    Student --- UC01
    Student --- UC02
    Student --- UC07
    Student --- UC08
    Student --- UC09
    Student --- UC13

    UC09 --- Stripe
```

## Text Layout

```text
                         ITC SECURE DOCUMENT VERIFICATION SYSTEM
        -----------------------------------------------------------------------
       |                                                                       |
       |                         ( Login and Registration )                    |
       |                                                                       |
       |                         ( Manage Profile )                            |
       |                                                                       |
       |                         ( Submit Event Paperwork )                    |
       |                                                                       |
Admin  |                         ( Review Event Paperwork )          Club      |
High   |                         ( Approve or Reject Paperwork )      Advisor  |
Council|                                                                       |
Student|                         ( Publish Event to Main Page )                 |
       |                                                                       |
       |                         ( Display Published Events )                   |
       |                                                                       |
       |                         ( Register for Event )                         |
       |                                                                       |
       |                         ( Pay Event Fee by Card ) ---- Stripe          |
       |                                                                       |
       |                         ( View Card Payment Records )                  |
       |                                                                       |
       |                         ( Generate Certificate )                       |
       |                                                                       |
       |                         ( Approve Certificate )                        |
       |                                                                       |
       |                         ( View Certificate )                           |
       |                                                                       |
       |                         ( Generate Event Report )                      |
       |                                                                       |
        -----------------------------------------------------------------------
```

