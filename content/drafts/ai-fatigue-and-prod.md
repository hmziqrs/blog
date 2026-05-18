---
title: "AI fatigue and production deployment"
---



Using AI is fun and games.
But it fatigues you real good and real fast.
Here's the simplest thing Vibe codings gives you an illusion of being fast and not requiring much human input.
But when something doesn't go the way you thought it to be It spikes your cortisol, annoys you and what not.
Also when your doing manual QA and finding edge cases and bugs that same triggers happen.

For that's because in my 9 years of engineering experience I stayed far away from product management and I used to hand of proper QA testing to QAs and product and QA would discover and find the bugs, edge cases and all the things.

Now due to AI roles have shifted completely I'm doing the exact same things I used to avoid. it's like I am learning a totally different new skill. I used to think product managment people as a waste of resources and time but now I empathize with how they put up with the engineers.

Does it means AI is only good as an engineer like I used to be?
That's a massive big no. Because AI still miss a lot of edge cases 
For example in this blog's development I had to go through soo many hoops
For example CI/CD:
    Ai had written different tags for different environments and I had to manually change them and make sure they are correct. Which require the human input and it's kind of double work like write the code/article first and then go check the latest version of the app and then increment it like so many steps which had to be all manually. which increase friction.
    So I put the staging and prod both in the same branch and added path based filters if I added a newsletter file then send the newsletter If add a new content in prod dir it deploys to prod. Also there are manual ci commands which I can trigger manually via my CLI.


