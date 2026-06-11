TRADING CONTROL CENTER - GITHUB + NETLIFY FIXED STRUCTURE

This ZIP is intentionally FLAT at the project root.
Your GitHub repository should look like this:

index.html
netlify.toml
package.json
netlify/
  functions/
    trading-consultant.js

NETLIFY SETTINGS
1. Connect this GitHub repo to Netlify.
2. Build command: npm run build   (or leave blank; both are fine)
3. Publish directory: .
4. Functions directory: netlify/functions
5. Environment variable: OPENAI_API_KEY = your OpenAI API key
6. Redeploy.

WHAT WENT WRONG BEFORE
If Netlify shows Page not found at the root URL, it usually means index.html was not in the publish directory.
If the deploy log says 0 functions uploaded, Netlify did not find netlify/functions/trading-consultant.js from the configured base directory.

TESTS
- Visit your site root URL. The Trading Control Center should load.
- Open the AI Consultant tab.
- Send a basic message.
- If it says Missing OPENAI_API_KEY, the function deployed correctly but your env var is missing/wrong.
- If it says 404 on /.netlify/functions/trading-consultant, the function directory/base directory is wrong.
