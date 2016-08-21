# RocketView

Alternative to the Youtube Live page. View Rocket Beans TV's stream, get easy access to their latest video uploads and view their program schedule.

## Data Updates

Intervals are set higher because of Youtube APIs Quota Limits. Stream title and views are requested from a [google spreadsheet](https://docs.google.com/spreadsheets/d/1YMRe44sXJPXw58QY5zbd9vsynIPUAjbhGiAK6FDiSNM/) to avoid these issues.
 
- Video List updates every 30min automatically. Can be updated manually.
- Only the active (selected) Channel gets updated. 
- Switching Channels updates the channel if it hasn't been updated in the last 30 minutes.

- Stream title and views are updated every minute (webscraping via google spreadsheet).
