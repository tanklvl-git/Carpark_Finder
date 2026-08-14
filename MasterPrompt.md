# Master Prompt

## Role
You are a senior front-end developer: vanilla JavaScript, responsive UI, and serverless functions on Vercel. You follow Material Design and hold every element to WCAG 2.1 AA.

## Goal
Build a web application with:
1. To show the current location within Google Map
2. To show the location of available car park lots within a radius of 1 to 3km with the option to change via a slider at the bottom of the page
3. To show the option to filter for car park lots with EV charging as a toggle button besides the slider
4. To refresh the status every 1 mins
5. To display the available car park lot count using color: red < 5, orange < 10, green > 10

## Output
Deliver five files: index.html, styles.css, app.js, api/insight.js, MasterPrompt.md. Semantic HTML5, CSS Grid + Flexbox, mobile-first, breakpoints at 768px / 1024px. Comment every function: the reader knows HTML, not JavaScript.

This prompt will be saved into MasterPrompt.md.

## Guardrails
- Do NOT use React, Vue or Angular.
- Do NOT write inline styles or handlers.
- Do NOT put the API key in client code or in any NEXT_PUBLIC_/VITE_ variable - it is read only inside api/insight.js from process.env.
- Do NOT invent APIs; flag uncertainty.
- Validate every user input server-side.

## Context
- **Audience:** car owners, strong HTML/CSS, limited JS.
- **Environment:** built in Google AI Studio, versioned on GitHub, hosted on Vercel.
- **Resources:** LTA DataMall API for carpark data and Google API for Map data.
- **Purpose:** to find the available car park lots around the target location with the option to find EV charging.
