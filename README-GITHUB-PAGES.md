# Publish My Lil Nook on GitHub Pages (no Node.js or VS Code needed)

1. Create a new **public** GitHub repository, e.g. `my-lil-nook`.
2. Open the repository and choose **Add file → Upload files**.
3. Upload **everything inside this folder**, including the hidden `.github` folder. If GitHub's upload screen does not preserve the hidden folder, create the workflow file manually at `.github/workflows/deploy.yml` using the contents provided in this project.
4. Commit the files to the `main` branch.
5. Go to **Settings → Pages**.
6. Under **Build and deployment**, choose **GitHub Actions** as the source.
7. Open the **Actions** tab and wait for **Deploy My Lil Nook to GitHub Pages** to finish.
8. Your website will be available at:
   `https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY-NAME/`

The app stores your reading journal data in your browser's localStorage. Data is saved in the browser you use and is not automatically shared across devices or browsers.
