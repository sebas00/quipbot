# quipbot
Quipbot with integration to Salesforce

This Quipbot opens a websocket to quip, and can retrieve and update Salesforce data.


##Usage

###query:
\#sobject limit fields

examples:
\#case 10
*gets 10 cases*

\#contact 50 id,firstname,lastname
*gets 50 contacts with id, firstname and lastname*

###update:
\#upload sobject

examples
\#upload case
updates all retrieved cases
if you want to update records always load the id as first field!

##Steps to setup:

Create a new quip org, the trial is free!

When you're logged in, go to this link: <a href="https://quip.com/api/personal-token" target="new">Personal API Token</a>
Copy the API Token, then click below on the deploy button:


[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Pick a name for your app, and be sure to use the same url in the WHERE environment variable.

Just put xxx in the SFDC_ environment variables for now.

Go to your (dev or demo environment) Salesforce, create a new connected app.

For the callback url use: https://yourquipbot.herokuapp.com/oauth2/callback

Copy / past the consumer keys into the setting of the heroku app.

Restart the dyno.





Result!
