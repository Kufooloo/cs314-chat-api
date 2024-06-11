### CS314 Chat Api

This is the back end for the group chat app I wrote for CS314 intro to software engineering. 

## How to start

Copy the contents of the directory onto your machine.
Create a new file called .env in your directory. This file needs two things.

TOKEN_SECRET=EB4qAj0oixqv6MKHE2ER7dy7MCGWRITB  
DATABASE_NAME="Cs314TermProjectDatabase"  

The TOKEN_SECRET is used to authenticate and create JWT. This can be anything but it must match when comparing. 
DATABASE_NAME is the name of the database to be written to in mongodb. This can be anything, but CS314TermProjectDatabase is what we used. 
Defualt values have been provided above to match our database.

To install the dependancies first you need to init the directory, by running the command npm init. 
Next you need to install the dependancies. This can be done by running the command npm i inside the directories terminal. 

Finally to run the backend you use the command npm start. This will open the backend on the port 3000. 

## Testing. 

Testing was started through postman, however this was not completed. 

To view all the routes you can use the postman collection included in the repository. This contains all the routes implemented. 
