---
title: "AI fatigue and production deployment"
---



Using AI is fun and games.
But it fatigues you real good and real fast.
Here's the simplest thing Vibe codings gives you an illusion of being fast and not requiring much human input.
But when something doesn't go the way you thought it to be It spikes your cortisol, annoys you and what not.
You must also aware of when to stop vibe coding becuase sometimes it mess up so simple things and won't get it right even after few prompts ends up wasting quite a lot of time which would be a few minutes if done manually.
Also when your doing manual QA and finding edge cases and bugs that same triggers happen.

For that's because in my 9 years of engineering experience I stayed far away from product management and I used to hand of proper QA testing to QAs and product and QA would discover and find the bugs, edge cases and all the things.

Now due to AI roles have shifted completely I'm doing the exact same things I used to avoid. it's like I am learning a totally different new skill. I used to think product managment people as a waste of resources and time but now I empathize with how they put up with the engineers.

Does it means AI is only good as an engineer like I used to be?
That's a massive big no. Because AI still miss a lot of edge cases 
For example in this blog's development I had to go through soo many hoops
For example layouts:
    Other than opus pretty much every AI models loves to mess up layouts of the pages they hate consistent width containers
    For example content of every pages was set up incorrectly even the parts of the header, body, and footer.
    I had to prompt it mutliple times to get the correct layout.
    But after wasting a few minutes I did it manually.
For example CI/CD:
    Ai had written different tags for different environments and I had to manually change them and make sure they are correct. Which require the human input and it's kind of double work like write the code/article first and then go check the latest version of the app and then increment it like so many steps which had to be all manually. which increase friction.

    So I put the staging and prod both in the same branch and added path based filters if I added a newsletter file then send the newsletter If add a new content in prod dir it deploys to prod. Also there are manual ci commands which I can trigger manually via my CLI.

    Again this is not a standard practive for deployments of stage and prod
    But I had to go to this route simply for reducing frcition I'm an indie dev and have been jugling around so many projects and remembering/documenting so many projects tax your brain power soo much.


End notes
Practice patiece and peace that's the most important skill in VIBE coding things will never not go the way you want it to be.
Product management and QA is second most important skill because since you're coding less/near to zero you need a way to verify the worlk your AI does.
Coding pratice and architecture is also very important but it's something that requires experience the more the better. The only good way I know to improve is leetcode tbh. yeah leet code may've rendered useless in this vibe coding error but I find it to be the most important skill not because it helps crack interview but it force you think think either by remembering pattern to solve problems and also allow you to understand there are more than one way to solve stuff. Other than interviews it also helps you understand the problem and think of different approaches.
