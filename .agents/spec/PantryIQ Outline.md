# Possible app names

1. SousChef AI
2. WasteNot \- Harry's second favorite, emphasis on charitable mission
3. PantryIQ \- This one is Harry's favorite 🙂
4. Yes, Chef\!

# Harry's Vision

SaaS (Software as a Service) application that aims to solve the problem of restaurant food waste by more accurately predicting current/upcoming market needs on a per-restaurant-location basis. This helps the restaurant reduce spoilage and save money. This helps the environment and our communities, less food rotting away in landfills; what a waste.

# Company's Charitable Mission

Help coordinate the transfer of food that would otherwise be wasted to be given to local homeless individuals.

# Harry's expectations

1. Bootstrap the company on our own dime as long as possible. VC money is preferably avoidable at all costs.
2. I don't expect to be financially compensated from this business until any one of us is compensated. I'd prefer instead to take an equity share of the business in exchange for my time being the primary product architect/builder.

   1. Upon delivery of version 1 of the application, if the business chooses to go to market with it, I would then receive our agreed upon equity share.
      1. If you choose not to use my code, my code is still my own and I will receive no compensation for it.
   2. I personally believe equal third partners 33% is fair here.
   3. Since I will be giving a disproportionate amount of my time up front compared to the other partners in order to build the product, I would expect that any monetary fees to get the business up and running would be covered by Ben and JK.
      1. LLC, EIN creation/renewal fees
      2. Web hosting fees
      3. My hope is that the business would be self-sustaining from day one of collecting revenue, and we have priced our product appropriately such that we are not taking a loss on each customer's AI usage. From then on, my hope is that we'd each only have to further invest our time, not our personal money, into the business.
   4. I think the title of CTO, Chief Technology Officer is appropriate in how I would view my role. If there is an executive decision to be made about the technology usage of our company, I reserve the right to make that decision. **My role would be to**

      1. Answer/define 'how' we build our app(s)
      2. Be responsible for the uptime and quality of our application(s)
      3. Be responsible for fixing defects
      4. Hiring more developers or technical staff if/when needed
      5. Setting up company emails, websites, domain configuration, etc.

   5. I may cast a vote or speak my opinion on the following, but ultimately I would consider the following to be the **responsibility of my partners** (or to the employees/contractors they delegate to):
      1. Customer outreach / success / support
      2. Customer account management
      3. Sales
      4. Legal
      5. Executive decisions about the product: 'What' to build, whereas my role is answering 'how' we build it. Answering 'what' to build is best answered by those who are most intimately familiar with the workflow in question, and with the regular users' feedback.

# Feature list

### Version 1; MVP (Minimum Viable Product)

1. Import transaction data (initially) from
   1. Square
   2. Cisco
2. Based on transaction history, an AI predicts market trends based on prompts from the user. I.e.

   1. “Which days do I regularly overstaff?”
   2. “What shifts could I safely run lean?”
   3. “What days _feel slow_ but actually aren’t?”
   4. “How did weather affect staffing needs last year?”
   5. “What holidays surprise us every year?”

   6. “What ingredients do I consistently over-buy?”
   7. “If I reduce beef orders by 8%, what usually sells out instead?”
   8. “What items spoil the most, and on which days?”
   9. “What should I buy _less_ of next month without hurting sales?”
   10. “If prices rise 10% on chicken, what menu items are most exposed?”
   11. “Which menu items are loved but barely ordered?”
   12. “What dishes cause kitchen bottlenecks?”
   13. “What items sell great but destroy margins?”
   14. “What should I feature more often?”
   15. “If I cut one menu item, which one hurts the least?”

   16. “Which days will we likely have surplus food?”
   17. “How much food could we donate _without risk_?”
   18. “Which items are the best candidates for donation?”
   19. “Can we predict donation pickup days?”
   20. “What impact did donating have on waste last month?”

3. Because the AI model is the driving force in answering the user's questions (and determining _if it can_ answer the user's question), we just have to make sure we provide/import enough of the correct types of information, such that we can accurately answer useful questions.

### Version 2 wish list

This list is dependent on user feedback. If user feedback screams at us to go in another direction, we reserve the right to pivot away from this list.

1. Add support for additional Point of Sale providers:
   1. Oracle Micros?
   2. Ziosk?
2. Add support for interacting with MCP servers of vendors, to allow the AI to place orders automatically on the user's behalf.
3. Integration with [tokei.app](https://tokei.app) for kitchen timers and representing their menu as recipes in a database that correlates with transaction data as well.
4. [Dinetap](https://docs.google.com/document/d/1H1BqfpKhDkNlTQroJ4WHL9BL6-r0x8HKnR9le8lvdHU/edit?usp=sharing) front-of-house management features?

#

# Architecture

1. Nextjs server-rendered marketing page that is favorable for SEO
   1. Hosted on Fly.io
2. Vite-react or nextjs Client-rendered web-application to access the chatbot
   1. Page for importing data or connecting to POS transaction data providers
   2. Chatbot UI similar to chatgpt for interacting with the chatbot, and you can go back to previous conversations if needed.
   3. Support for logging in/out, resetting password, etc. of course.
3. Python MCP server  
   **Where:** **Fly.io**  
   **What:** `FastAPI` \+ `uvicorn`

- Long-lived processes (Lambda is bad here)
- Cheap at low traffic
- Easy private networking
- Scales later without rewrites  
  **Form factor:** single small VM, always on  
   **Cost:** very low, predictable

4. Node JS Server-side API to process requests from clients, access database securely.
   1. Fastify \+ typescript
   2. [Fly.io](http://Fly.io) (same org that hosts the Python MCP)
5. Database: Postgres
   1. Hosted on [fly.io](http://fly.io), allows for _intranet_ communication with MCP server.

**TL;DR**  
Fly.io  
│  
├─ Next.js (SSR \- marketing pages)  
├─ Next.js or react \+ vite (web app CSR)  
├─ Node API (Fastify)  
├─ Python MCP (FastAPI)  
└─ Managed Postgres

#

# Pricing

Pricing model options (dollar amounts and numbers are examples, actual math will be required before going to market to determine costs of average expected usage for each user per month)

1. 7 day free trial, then either
2. Approach \#1, Simple, straight forward

   1. $20 / restaurant location / month
   2. $10 / food truck / month
   3. Subscription tiers based on features included (after v2 is launched)

3. Approach \#2, complicated but protects us from overage fees better

   1. $20 / month for X amount of AI credits \+ overage fees
      1. up to 3 locations/trucks and logins
   2. $100 / month for 10X amount of AI credits \+ overage fees
      1. up to 10 locations/trucks and logins
   3. $500 / month for unlimited of AI credits, unlimited locations and logins

   4. Pass on our overage fees to customer
   5. Credits can be applied appropriately for more or less expensive AI models. Let the user select which Model to interact with

# Communication

1. Discord for company related chats, video calling, screen sharing, and file sharing.
2. Trello for project management and organization

# Book club

1. [The Lean startup](https://open.spotify.com/show/59DhVpmJnxaFU5AT8CskSx?si=119c3ac4a0ec4fbb)
2. Start small stay small
