# TODO
## Current Features
### Reviews & Listen Times
1. Include review score in forum posts if available.
2. Include average review score for series if available.
3. Include review score in end listen alert?
4. Calculate read time for forum and end posts?
5. List start and end time in forum posts?

## Future Features
### Account
1. Add hammer protection to prevent brutal force attacks.
   1. Store IPs and number of tries and last timestamp of attempt in the database or a file.
### Maintenance
1. Ability to update all posts with a set time delay to avoid rate limiting.
2. Add a list of all existing books in the DB to the interface.
   1. Load a book from the DB without having to scrape.
   2. Change values like start and end date or review score.
   3. The ability to save or delete the book in the DB.
   4. The ability to sort books to show in progress to easily finish them. 
## Fixes
1. Fix some books not having any book numbers.
   * Seems impossible for now. I have contacted Audible to have them include the number on the page, but I doubt it'll happen.
   * An alternative is to derive the numbers from listen-order which is possible with listen-dates.