name: Build Windows exe
on: workflow_dispatch

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Download source Bible database
        shell: bash
        run: curl -sL -o db/source-bible.db "https://raw.githubusercontent.com/scrollmapper/bible_databases/2024/bible-sqlite.db"
      - run: npm install
      - run: npm run build-db
      - run: npx electron-builder --win --publish=never
      - uses: actions/upload-artifact@v4
        with:
          name: scripture-presenter-installer
          path: release/*.exe
