# Jithendra Reddy Portfolio

This is a static personal portfolio site for Jithendra Reddy. Content is driven from `data/company.json`, and the frontend can also normalize a Streamlit-style `data.json` if you want to reuse portfolio data from another app.

## Main files

- `index.html` contains the page structure.
- `styles.css` contains the visual system and responsive layout.
- `app.js` loads the JSON data and powers interactions.
- `data/company.json` stores portfolio content, projects, experience, and contact details.
- `data/site-data.js` is the local `file://` fallback used when browsers block JSON `fetch()` during direct file preview.
- `thanks.html` is the post-submit confirmation page.

## Run locally

Because the site loads JSON with `fetch`, the best option is to open it through a local web server instead of double-clicking `index.html`.

Example with Python:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Update content

Edit `data/company.json` to update branding, hero copy, capabilities, projects, experience, skills, and contact details.

If you want to reuse the JSON from the Streamlit app, you can drop it in as `data.json` and the frontend will map that schema into the site automatically.

## Contact form

The contact form submits through FormSubmit to `jithendrareddypunuru@gmail.com` and redirects to `thanks.html` after a successful submission.
