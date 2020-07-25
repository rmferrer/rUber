# Quick Setup 

***Disclaimer:** This setup assumes some comfort with basic software development tools / services (git, heroku, twilio, ...) 
so don't expect it to be easly accessible if you have never used a them. It is not a straightforward / mindless / learningless setup. If you are new to these tools it's ok, just
expect to google much of what the steps ask you to do and learn something.*

This document guides you through the steps to quickly setup Uber over Whatsapp without needing to understand much of 
what's going on in the application code. It will set you up with a Heroku server where the Uber controlling code runs and a Twilio account for relaying
Whatsapp messages between your phone and that Heroku server. The setup uses the free tiers of these 3rd party services
so **it's all free.** 

### 0/3 Before you get started
- Setup a Heroku account if you don't have one [here](https://signup.heroku.com). 
- Download and setup the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli#download-and-install).
- Setup a Twilio account if you don't have one [here](https://www.twilio.com/try-twilio)
    - Take note of your `ACCOUNT SID` and `AUTH TOKEN` shown in the main [console](https://www.twilio.com/console)
    
### 1/3 Setup your own server

0. **The code**: clone [this](https://github.com/rmferrer/rUber) repository from Github. 

1. **The server running the code ^**: 
    
    Inside your [Heroku Dashboard](https://heroku.com):
    - Create a new Heroku app. Give it a unique name. This will give your app a 
    URL accessible to the whole internet of the form *https://<your-unique-app-name>.herokuapp.com*. 
    Remember this URL, you'll need it when setting up the messaging service.
    - In the app's **Resources Tab**: provision the "Heroku Redis" add-on (Free tier) to your Heroku app. You might need
    to give Heroku a credit card number for identity verification. Don't worry they won't charge you since you'll only
    use their free services.
    - In your app's **Settings Tab**: Click on the Config Vars to edit/add them. Leave the `REDIS_URL`
    var unchaged. Add two vars called `TWILIO_SID` and `TWILIO_TOKEN` and give them the values you got from the 
    [Twilio Console](https://www.twilio.com/console). Save these settings.
    - In your app's **Deploy Tab**: Click on the "Heroku Git" deployment method and go through the steps outlined there
    to deploy your app. The last command you should run in your command line should be `$ git push heroku master`. 
    Wait for the command returns and then visit in your broswer
    
        `https://<your-app-name>.herokuapp.com/ping`
   
         If all is working you'll get a "Pong! All is working!" back. If not, debugging time (or goodbye? ;( ))!

    **Congrats now you have an Uber controlling service running. You are most of the way there!** 
    This is a simple web service that receives commands 
    on `POST /sms` and based on your previous commands (think of it as the context of the text conversation) does 
    some action to control Uber and returns the results of that actions and/or some prompt for the next command. There is an implicit
    conversational protocol here but I'm too lazy to document it. Play around with yout chatbot or look at the code!
    
### 2/3 Setup up Whatsapp

1. Login to your Twilio account, go to the [Whatsapp Beta Service](https://www.twilio.com/console/sms/whatsapp/learn) 
(you can find this under Programmable SMS > Whatsapp > Sandbox), and activate a personal sandbox. It will ask you to send 
a specific message like "join something" to a number (this will be your Uber via Whatsapp number so save it). Once you do this and get a reply you'll have a private whatsapp channel through 
which you'll chat with your server.
2. Go to your Twilio Whatsapp sandbox [settings](https://www.twilio.com/console/sms/whatsapp/sandbox)
In the sandbox configuration look for a field called "When a message comes in" and enter the following URL

    `https://<your-app-name>.herokuapp.com/sms`
    
    and leave it as an HTTP POST. Save settings.
    
3. Now send "radio-check" to your Uber-via-Whatsapp number. If you get a "Radio check" back you are now communicating with your Heroku server via Whatsapp, well done. If not, happy debugging!

### 3/3 Set up your Uber session in your server. Tbe last and hackiest step yet...

It used to be that you would save your uber credentials (email, passwd) on your Heroku 
app's config vars and the server would know to log you in on first use (it would even ask
for your TOTP if you had one) and keep cookies around. However, Uber has recently and 
rightfully implemented captcha on login so this automated login does not work anymore. For 
this reason you need to manually log into uber, get your cookies and insert them in your 
apps Redis db.

1. Using a desktop browser log into your Uber account at https://m.uber.com
    - 



Misc:
pool only 1 passendger
see heroku logs
price might not be what app quoted if pricing changing fast. refresh stale prices for no surprises
